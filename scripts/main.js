import { ChangeNumbersConfig } from "./config-app.js";
import { dictionary, translate } from "./i18n.js";
import {
  MODULE_ID,
  normalizeRules,
  parseAllowedFaces,
  selectRule,
  validateRule
} from "./rules.js";

let originalDieRoll = null;

Hooks.once("init", () => {
  registerSettings();
  installDieResultPatch();
  registerPublicApi();
});

Hooks.on("dnd5e.postRollConfiguration", (rolls, config) => {
  const context = contextFromSubject(config?.subject);
  for (const roll of rolls ?? []) attachContext(roll, context);
});

Hooks.on("renderChatMessage", (message, html) => {
  renderChangedResults(message, html);
});

Hooks.once("ready", () => {
  if (game.system.id !== "dnd5e" && game.user.isGM) ui.notifications.warn(translate("incompatibleSystem"));
});

function registerSettings() {
  game.settings.register(MODULE_ID, "enabled", {
    name: "YCN.Settings.Enabled.Name",
    hint: "YCN.Settings.Enabled.Hint",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "interfaceLanguage", {
    name: "YCN.Settings.Language.Name",
    hint: "YCN.Settings.Language.Hint",
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    choices: {
      en: "English",
      pl: "Polski"
    },
    default: "en",
    requiresReload: true
  });

  game.settings.register(MODULE_ID, "showOriginal", {
    name: "YCN.Settings.ShowOriginal.Name",
    hint: "YCN.Settings.ShowOriginal.Hint",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "rules", {
    scope: "world",
    config: false,
    restricted: true,
    type: Object,
    default: []
  });

  game.settings.registerMenu(MODULE_ID, "ruleManager", {
    name: "YCN.Settings.Menu.Name",
    label: "YCN.Settings.Menu.Label",
    hint: "YCN.Settings.Menu.Hint",
    icon: "fa-solid fa-dice-d20",
    type: ChangeNumbersConfig,
    restricted: true
  });
}

function registerPublicApi() {
  const module = game.modules.get(MODULE_ID);
  if (!module) return;
  module.api = {
    openConfig: () => new ChangeNumbersConfig().render({ force: true }),
    parseAllowedFaces,
    selectRule
  };
}

/**
 * Transform each individual face before Foundry applies keep/drop, advantage,
 * reroll, explode, counting, or dnd5e critical/fumble logic.
 */
function installDieResultPatch() {
  const Die = foundry.dice.terms.Die;
  if (Die.prototype.roll?.[MODULE_ID]) return;
  originalDieRoll = Die.prototype.roll;

  const wrappedRoll = async function wrappedChangeNumbersRoll(options = {}) {
    const result = await originalDieRoll.call(this, options);
    try {
      applyRuleToResult(this, result, options);
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to transform a die result`, error);
    }
    return result;
  };
  Object.defineProperty(wrappedRoll, MODULE_ID, { value: true });
  Die.prototype.roll = wrappedRoll;
}

function applyRuleToResult(die, result, options) {
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (!result || !Number.isInteger(Number(result.result))) return;
  const faces = Number(die.faces);
  if (!Number.isInteger(faces)) return;

  const root = die._root;
  const context = getRollContext(root);
  const rules = normalizeRules(game.settings.get(MODULE_ID, "rules"));
  const selected = selectRule(rules, faces, context);
  if (!selected) return;

  const validation = validateRule(selected.rule);
  if (!validation.valid) return;
  const original = Number(result.result);
  let ranged = original;

  if (!validation.allowed.values.includes(ranged)) {
    if (options.maximize) ranged = validation.allowed.values.at(-1);
    else if (options.minimize) ranged = validation.allowed.values[0];
    else ranged = rollAllowedFace(die, validation.allowed.values);
  }

  const final = validation.replacements.map.get(ranged) ?? ranged;
  result.result = final;

  if ((original !== ranged) || (ranged !== final)) {
    const change = {
      original,
      ranged,
      final,
      faces,
      ruleId: selected.rule.id,
      ruleName: selected.rule.name,
      scope: selected.scope
    };
    result.changeNumbers = change;
    const metadata = ensureMetadata(root, context);
    metadata.changes.push(change);
  }
}

function rollAllowedFace(die, allowed) {
  const allowedSet = new Set(allowed);
  for (let attempt = 0; attempt < 10000; attempt += 1) {
    const candidate = Number(die.randomFace());
    if (allowedSet.has(candidate)) return candidate;
  }
  return allowed[0];
}

function attachContext(roll, context) {
  if (!roll?.options) return;
  const metadata = roll.options[MODULE_ID] ?? {};
  metadata.context = context;
  metadata.changes ??= [];
  roll.options[MODULE_ID] = metadata;
}

function ensureMetadata(root, context) {
  if (!root?.options) return { context, changes: [] };
  const metadata = root.options[MODULE_ID] ?? {};
  metadata.context ??= context;
  metadata.changes ??= [];
  root.options[MODULE_ID] = metadata;
  return metadata;
}

function getRollContext(root) {
  const stored = root?.options?.[MODULE_ID]?.context;
  if (stored?.actorId || stored?.itemId) return stored;

  const controlled = globalThis.canvas?.tokens?.controlled?.[0]?.actor;
  const actor = controlled ?? game.user.character ?? null;
  return { actorId: actor?.id ?? "", itemId: "" };
}

function contextFromSubject(subject) {
  if (!subject) return { actorId: "", itemId: "" };

  const item = subject.documentName === "Item"
    ? subject
    : subject.item
      ?? (subject.parent?.documentName === "Item" ? subject.parent : null)
      ?? (subject.activity?.item ?? null);
  const actor = subject.documentName === "Actor"
    ? subject
    : subject.actor
      ?? item?.actor
      ?? (subject.parent?.documentName === "Actor" ? subject.parent : null);

  return {
    actorId: actor?.id ?? "",
    itemId: item?.id ?? ""
  };
}

function renderChangedResults(message, html) {
  if (!game.settings.get(MODULE_ID, "showOriginal")) return;
  if (!message.isContentVisible) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector(".ycn-chat-changes")) return;

  const changes = message.rolls?.flatMap((roll) => roll.options?.[MODULE_ID]?.changes ?? []) ?? [];
  if (!changes.length) return;

  const block = document.createElement("div");
  block.className = "ycn-chat-changes";
  const heading = document.createElement("strong");
  heading.textContent = dictionary().originalChanged;
  block.append(heading);

  for (const change of changes) {
    const line = document.createElement("span");
    line.className = "ycn-chat-change";
    line.textContent = `${change.ruleName}: d${change.faces} ${change.original} → ${change.final}`;
    block.append(line);
  }

  const target = root.querySelector(".dice-roll:last-of-type") ?? root.querySelector(".message-content");
  target?.append(block);
}
