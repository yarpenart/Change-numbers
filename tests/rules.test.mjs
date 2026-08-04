import assert from "node:assert/strict";
import {
  compileReplacements,
  createRule,
  parseAllowedFaces,
  selectRule,
  transformFace,
  validateRule
} from "../scripts/rules.js";

const rangeA = parseAllowedFaces("1-19", 20);
assert.equal(rangeA.valid, true);
assert.equal(rangeA.values.length, 19);
assert.equal(rangeA.values.includes(20), false);

const rangeB = parseAllowedFaces("1-9, 11-20", 20);
assert.equal(rangeB.valid, true);
assert.equal(rangeB.values.length, 19);
assert.equal(rangeB.values.includes(10), false);

assert.equal(parseAllowedFaces("1-21", 20).valid, false);
assert.equal(parseAllowedFaces("20-1", 20).valid, false);

const replacements = compileReplacements([
  { from: 7, to: 20 },
  { from: 13, to: 1 }
], 20);
assert.equal(replacements.valid, true);
assert.equal(replacements.map.get(7), 20);
assert.equal(replacements.map.get(13), 1);
assert.equal(compileReplacements([{ from: 7, to: 20 }, { from: 7, to: 1 }], 20).valid, false);

const transformedCritical = transformFace(7, rangeA.values, replacements.map, () => 2);
assert.equal(transformedCritical.final, 20);

const transformedReroll = transformFace(20, rangeA.values, new Map(), () => 12);
assert.deepEqual(transformedReroll, { original: 20, ranged: 12, final: 12, changed: true });

const global = createRule({ id: "global", faces: 20, global: true });
const actor = createRule({ id: "actor", faces: 20, actorIds: ["A1"] });
const item = createRule({ id: "item", faces: 20, itemKeys: ["A1:I1"] });
assert.equal(selectRule([global, actor, item], 20, { actorId: "A1", itemId: "I1" }).rule.id, "item");
assert.equal(selectRule([global, actor, item], 20, { actorId: "A1" }).rule.id, "actor");
assert.equal(selectRule([global, actor, item], 20, {}).rule.id, "global");
assert.equal(selectRule([global, actor, item], 12, {}), null);

assert.equal(validateRule(createRule({ allowed: "1-9, 11-20" })).valid, true);
assert.equal(validateRule({ ...createRule(), name: "" }).valid, false);
assert.equal(validateRule({ ...createRule(), faces: 1 }).valid, false);

console.log("All Change Numbers rule tests passed.");
