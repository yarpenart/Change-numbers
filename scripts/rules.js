export const MODULE_ID = "yarpen-change-numbers";

export const DEFAULT_DIE_FACES = 20;
export const MIN_DIE_FACES = 2;
export const MAX_DIE_FACES = 1000;

/** Create a stable, serializable rule object. */
export function createRule(overrides = {}) {
  const faces = clampInteger(overrides.faces, MIN_DIE_FACES, MAX_DIE_FACES, DEFAULT_DIE_FACES);
  return {
    id: String(overrides.id || randomId()),
    name: String(overrides.name || `d${faces}`),
    enabled: overrides.enabled !== false,
    faces,
    allowed: String(overrides.allowed || `1-${faces}`),
    replacements: normalizeReplacementRows(overrides.replacements),
    global: overrides.global === true,
    actorIds: uniqueStrings(overrides.actorIds),
    itemKeys: uniqueStrings(overrides.itemKeys)
  };
}

/** Convert stored world data into rules safe to use in the UI and roller. */
export function normalizeRules(value) {
  if (!Array.isArray(value)) return [];
  return value.map((rule) => createRule(rule));
}

/**
 * Parse inclusive face ranges such as: "1-19", "2-20", or "1-9, 11-20".
 */
export function parseAllowedFaces(spec, faces) {
  const maximum = Number(faces);
  const normalized = String(spec ?? "")
    .trim()
    .replace(/[–—]/g, "-");

  if (!Number.isInteger(maximum) || maximum < MIN_DIE_FACES || maximum > MAX_DIE_FACES) {
    return { valid: false, values: [], errors: ["invalid-faces"] };
  }

  if (!normalized) {
    return { valid: false, values: [], errors: ["empty-range"] };
  }

  const values = new Set();
  const errors = [];
  const tokens = normalized.split(/\s*[,;]\s*/).filter(Boolean);

  for (const token of tokens) {
    const match = token.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!match) {
      errors.push(`invalid-token:${token}`);
      continue;
    }

    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start < 1 || end < 1 || start > maximum || end > maximum || start > end) {
      errors.push(`out-of-range:${token}`);
      continue;
    }
    for (let face = start; face <= end; face += 1) values.add(face);
  }

  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length && !errors.length) errors.push("empty-range");
  return { valid: errors.length === 0 && sorted.length > 0, values: sorted, errors };
}

/** Validate and compile replacement rows into a Map. */
export function compileReplacements(rows, faces) {
  const map = new Map();
  const errors = [];
  const maximum = Number(faces);

  for (const [index, row] of normalizeReplacementRows(rows).entries()) {
    if ((row.from === "") && (row.to === "")) continue;
    const from = Number(row.from);
    const to = Number(row.to);
    if (!Number.isInteger(from) || !Number.isInteger(to)
      || from < 1 || to < 1 || from > maximum || to > maximum) {
      errors.push(`invalid-replacement:${index}`);
      continue;
    }
    if (map.has(from)) {
      errors.push(`duplicate-replacement:${from}`);
      continue;
    }
    map.set(from, to);
  }

  return { valid: errors.length === 0, map, errors };
}

/** Validate a complete rule. */
export function validateRule(rule) {
  const errors = [];
  const rawFaces = Number(rule?.faces);
  if (!String(rule?.name ?? "").trim()) errors.push("empty-name");
  if (!Number.isInteger(rawFaces)
    || rawFaces < MIN_DIE_FACES
    || rawFaces > MAX_DIE_FACES) errors.push("invalid-faces");

  const allowed = parseAllowedFaces(rule?.allowed, rawFaces);
  const replacements = compileReplacements(rule?.replacements, rawFaces);
  errors.push(...allowed.errors, ...replacements.errors);
  const normalized = createRule(rule);
  return { valid: errors.length === 0, errors, allowed, replacements, rule: normalized };
}

/**
 * Select the effective rule for one die.
 * Item assignments outrank actor assignments, which outrank global assignments.
 * Within the same level, the first rule in the settings list wins.
 */
export function selectRule(rules, faces, context = {}) {
  const candidates = normalizeRules(rules).filter((rule) => rule.enabled && (rule.faces === Number(faces)));
  const actorId = String(context.actorId || "");
  const itemId = String(context.itemId || "");
  const itemKey = actorId && itemId ? `${actorId}:${itemId}` : "";

  if (itemKey) {
    const itemRule = candidates.find((rule) => rule.itemKeys.includes(itemKey));
    if (itemRule) return { rule: itemRule, scope: "item" };
  }
  if (actorId) {
    const actorRule = candidates.find((rule) => rule.actorIds.includes(actorId));
    if (actorRule) return { rule: actorRule, scope: "actor" };
  }
  const globalRule = candidates.find((rule) => rule.global);
  return globalRule ? { rule: globalRule, scope: "global" } : null;
}

/** Return the post-range, post-replacement result. */
export function transformFace(rawResult, allowedValues, replacements, fallbackRandom) {
  const original = Number(rawResult);
  const allowed = Array.isArray(allowedValues) ? allowedValues : [];
  if (!allowed.length) return { original, ranged: original, final: original, changed: false };

  let ranged = original;
  if (!allowed.includes(ranged)) {
    ranged = typeof fallbackRandom === "function" ? Number(fallbackRandom(allowed)) : allowed[0];
    if (!allowed.includes(ranged)) ranged = allowed[0];
  }

  const final = replacements instanceof Map && replacements.has(ranged)
    ? replacements.get(ranged)
    : ranged;
  return { original, ranged, final, changed: final !== original };
}

export function itemKey(actorId, itemId) {
  return `${String(actorId || "")}:${String(itemId || "")}`;
}

function normalizeReplacementRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    from: row?.from === "" ? "" : String(row?.from ?? ""),
    to: row?.to === "" ? "" : String(row?.to ?? "")
  }));
}

function uniqueStrings(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value) => value !== null && value !== undefined).map(String))];
}

function clampInteger(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function randomId() {
  const cryptoId = globalThis.crypto?.randomUUID?.();
  if (cryptoId) return cryptoId;
  return `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
