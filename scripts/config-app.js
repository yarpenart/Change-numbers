import {
  MODULE_ID,
  createRule,
  itemKey,
  normalizeRules,
  parseAllowedFaces,
  validateRule
} from "./rules.js";
import { dictionary, translate } from "./i18n.js";

const { ApplicationV2, DialogV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ChangeNumbersConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  #listenersAbort = null;

  static DEFAULT_OPTIONS = {
    id: "yarpen-change-numbers-config",
    classes: ["yarpen-change-numbers", "standard-form"],
    position: {
      width: 980,
      height: 780
    },
    tag: "form",
    window: {
      icon: "fa-solid fa-dice-d20",
      title: "YarpenArt: Change Numbers",
      resizable: true
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/config.hbs`
    }
  };

  constructor(options = {}) {
    super(options);
    this.rules = normalizeRules(game.settings.get(MODULE_ID, "rules"));
    if (!this.rules.length) this.rules.push(createRule({ name: "d20", global: false }));
    this.currentId = this.rules[0]?.id ?? null;
    this.assignmentTab = "actors";
    this.invalidRuleIds = new Set();
  }

  get currentRule() {
    return this.rules.find((rule) => rule.id === this.currentId) ?? null;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const current = this.currentRule;
    const validation = current ? validateRule(current) : null;
    const allowed = validation?.allowed?.values ?? [];
    const actorChoices = current ? buildActorChoices(current.actorIds) : [];
    const itemChoices = current ? buildItemChoices(current.itemKeys) : [];

    context.text = dictionary();
    context.rules = this.rules.map((rule, index) => ({
      ...rule,
      invalid: this.invalidRuleIds.has(rule.id),
      cssClass: [
        rule.id === this.currentId ? "active" : "",
        this.invalidRuleIds.has(rule.id) ? "invalid" : "",
        rule.enabled ? "" : "disabled"
      ].filter(Boolean).join(" "),
      assignment: assignmentSummary(rule),
      die: `d${rule.faces}`,
      isFirst: index === 0,
      isLast: index === this.rules.length - 1
    }));
    context.current = current ? {
      ...current,
      nameInvalid: validation?.errors.includes("empty-name"),
      dieInvalid: validation?.errors.includes("invalid-faces"),
      rangeInvalid: validation?.allowed?.valid === false,
      replacementInvalid: validation?.replacements?.valid === false,
      allowedCountText: translate("allowedCount", { allowed: allowed.length, faces: current.faces }),
      allFaces: allowed.length === Number(current.faces),
      previewFaces: allowed.length <= 60 ? allowed : allowed.slice(0, 50),
      previewTruncated: allowed.length > 60,
      rangeErrorText: translate("rangeError", { faces: current.faces }),
      replacementErrorText: translate("replacementError", { faces: current.faces }),
      replacements: current.replacements ?? [],
      actors: actorChoices,
      items: itemChoices,
      actorCount: current.actorIds.length,
      itemCount: current.itemKeys.length,
      hasActors: actorChoices.length > 0,
      hasItems: itemChoices.length > 0,
      actorsTab: this.assignmentTab === "actors",
      itemsTab: this.assignmentTab === "items"
    } : null;
    context.hasRules = Boolean(current);
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#listenersAbort?.abort();
    this.#listenersAbort = new AbortController();
    const listenerOptions = { signal: this.#listenersAbort.signal };
    this.element.addEventListener("click", (event) => this.#onClick(event), listenerOptions);
    this.element.addEventListener("input", (event) => this.#onInput(event), listenerOptions);
    this.element.addEventListener("change", () => this.#syncEditor(), listenerOptions);
  }

  async #onClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button || !this.element.contains(button)) return;
    event.preventDefault();
    const action = button.dataset.action;

    if (action !== "select-rule") this.#syncEditor();

    switch (action) {
      case "select-rule":
        this.#syncEditor();
        this.currentId = button.dataset.ruleId;
        return this.render({ force: true });
      case "add-rule": {
        const rule = createRule({ name: `d20 ${this.rules.length + 1}`, global: false });
        this.rules.push(rule);
        this.currentId = rule.id;
        return this.render({ force: true });
      }
      case "duplicate-rule": {
        if (!this.currentRule) return;
        const copy = createRule({
          ...foundry.utils.deepClone(this.currentRule),
          id: undefined,
          name: `${this.currentRule.name} (${translate("duplicate")})`
        });
        const index = this.rules.findIndex((rule) => rule.id === this.currentId);
        this.rules.splice(index + 1, 0, copy);
        this.currentId = copy.id;
        return this.render({ force: true });
      }
      case "delete-rule":
        return this.#deleteCurrentRule();
      case "move-up":
        return this.#moveCurrent(-1);
      case "move-down":
        return this.#moveCurrent(1);
      case "add-replacement":
        this.currentRule?.replacements.push({ from: "", to: "" });
        return this.render({ force: true });
      case "remove-replacement": {
        const index = Number(button.dataset.index);
        this.currentRule?.replacements.splice(index, 1);
        return this.render({ force: true });
      }
      case "toggle-actor":
        toggleValue(this.currentRule?.actorIds, button.dataset.key);
        return this.render({ force: true });
      case "toggle-item":
        toggleValue(this.currentRule?.itemKeys, button.dataset.key);
        return this.render({ force: true });
      case "actors-tab":
        this.assignmentTab = "actors";
        return this.render({ force: true });
      case "items-tab":
        this.assignmentTab = "items";
        return this.render({ force: true });
      case "save":
        return this.#save();
      default:
        return undefined;
    }
  }

  #onInput(event) {
    if (event.target.matches("[data-filter]")) {
      this.#filterTargets(event.target.dataset.filter, event.target.value);
      return;
    }
    this.#syncEditor();
    if (event.target.matches('[name="allowed"], [name="faces"]')) this.#updatePreview();
  }

  #syncEditor() {
    const rule = this.currentRule;
    if (!rule || !this.element) return;
    const get = (selector) => this.element.querySelector(selector);
    const name = get('[name="rule-name"]');
    const faces = get('[name="faces"]');
    const allowed = get('[name="allowed"]');
    const enabled = get('[name="rule-enabled"]');
    const global = get('[name="global"]');

    if (name) rule.name = name.value;
    if (faces) rule.faces = Number(faces.value);
    if (allowed) rule.allowed = allowed.value;
    if (enabled) rule.enabled = enabled.checked;
    if (global) rule.global = global.checked;
    rule.replacements = [...this.element.querySelectorAll("[data-replacement-row]")].map((row) => ({
      from: row.querySelector('[name="replacement-from"]')?.value ?? "",
      to: row.querySelector('[name="replacement-to"]')?.value ?? ""
    }));
  }

  #filterTargets(type, rawQuery) {
    const query = normalizeSearch(rawQuery);
    const list = this.element.querySelector(`[data-target-list="${type}"]`);
    if (!list) return;
    let visible = 0;
    for (const row of list.querySelectorAll("[data-search]")) {
      const matches = !query || row.dataset.search.includes(query);
      row.hidden = !matches;
      if (matches) visible += 1;
    }
    const empty = list.querySelector("[data-empty]");
    if (empty) empty.hidden = visible !== 0;
  }

  #updatePreview() {
    const rule = this.currentRule;
    const preview = this.element.querySelector("[data-preview]");
    if (!rule || !preview) return;
    const parsed = parseAllowedFaces(rule.allowed, rule.faces);
    preview.classList.toggle("invalid", !parsed.valid);
    const shown = parsed.values.length <= 60 ? parsed.values : parsed.values.slice(0, 50);
    preview.innerHTML = shown.map((face) => `<span>${face}</span>`).join("")
      + (parsed.values.length > 60 ? "<span>…</span>" : "");
  }

  async #deleteCurrentRule() {
    const rule = this.currentRule;
    if (!rule) return;
    const confirmed = await DialogV2.confirm({
      window: { title: translate("deleteConfirmTitle") },
      content: `<p>${foundry.utils.escapeHTML(translate("deleteConfirm", { name: rule.name }))}</p>`,
      yes: { label: translate("yes"), icon: "fa-solid fa-trash" },
      no: { label: translate("no") }
    });
    if (!confirmed) return;
    const index = this.rules.findIndex((candidate) => candidate.id === rule.id);
    this.rules.splice(index, 1);
    this.currentId = this.rules[index]?.id ?? this.rules[index - 1]?.id ?? null;
    return this.render({ force: true });
  }

  #moveCurrent(direction) {
    const index = this.rules.findIndex((rule) => rule.id === this.currentId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= this.rules.length) return;
    [this.rules[index], this.rules[target]] = [this.rules[target], this.rules[index]];
    return this.render({ force: true });
  }

  async #save() {
    this.#syncEditor();
    const results = this.rules.map((rule) => ({ id: rule.id, validation: validateRule(rule) }));
    this.invalidRuleIds = new Set(results.filter((entry) => !entry.validation.valid).map((entry) => entry.id));
    if (this.invalidRuleIds.size) {
      this.currentId = results.find((entry) => !entry.validation.valid)?.id ?? this.currentId;
      ui.notifications.error(translate("invalid"));
      return this.render({ force: true });
    }

    this.rules = normalizeRules(this.rules);
    await game.settings.set(MODULE_ID, "rules", this.rules);
    this.invalidRuleIds.clear();
    ui.notifications.info(translate("saved"));
    return this.render({ force: true });
  }
}

function buildActorSources() {
  const sources = [];
  const seen = new Set();
  for (const token of canvas?.scene?.tokens ?? []) {
    const actor = token.actor;
    if (!actor || seen.has(actor.id)) continue;
    seen.add(actor.id);
    sources.push({ actor, source: "token" });
  }
  for (const actor of game.actors?.contents ?? []) {
    if (seen.has(actor.id)) continue;
    seen.add(actor.id);
    sources.push({ actor, source: "actor" });
  }
  return sources;
}

function buildActorChoices(selectedIds) {
  const selected = new Set(selectedIds);
  return buildActorSources().map(({ actor, source }) => ({
    key: actor.id,
    name: actor.name,
    img: actor.img || CONST.DEFAULT_TOKEN,
    sourceLabel: translate(source),
    selected: selected.has(actor.id),
    cssClass: selected.has(actor.id) ? "selected" : "",
    search: normalizeSearch(actor.name)
  })).sort(selectedNameSort);
}

function buildItemChoices(selectedKeys) {
  const selected = new Set(selectedKeys);
  const choices = [];
  for (const { actor } of buildActorSources()) {
    for (const item of actor.items ?? []) {
      const key = itemKey(actor.id, item.id);
      choices.push({
        key,
        name: item.name,
        owner: actor.name,
        img: item.img || CONST.DEFAULT_TOKEN,
        sourceLabel: translate("item"),
        selected: selected.has(key),
        cssClass: selected.has(key) ? "selected" : "",
        search: normalizeSearch(`${item.name} ${actor.name}`)
      });
    }
  }
  return choices.sort(selectedNameSort);
}

function selectedNameSort(a, b) {
  if (a.selected !== b.selected) return a.selected ? -1 : 1;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function assignmentSummary(rule) {
  const parts = [];
  if (rule.global) parts.push(translate("scopeGlobal"));
  if (rule.actorIds.length) parts.push(`${translate("scopeActor")}: ${rule.actorIds.length}`);
  if (rule.itemKeys.length) parts.push(`${translate("scopeItem")}: ${rule.itemKeys.length}`);
  return parts.join(" • ") || translate("noTarget");
}

function toggleValue(array, value) {
  if (!array || !value) return;
  const index = array.indexOf(value);
  if (index === -1) array.push(value);
  else array.splice(index, 1);
}

function normalizeSearch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}
