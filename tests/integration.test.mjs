import assert from "node:assert/strict";

const onceHooks = new Map();
const onHooks = new Map();
globalThis.Hooks = {
  once: (name, callback) => onceHooks.set(name, callback),
  on: (name, callback) => onHooks.set(name, callback)
};

class MockApplicationV2 {
  constructor(options = {}) { this.options = options; }
  render() { return this; }
  async _prepareContext() { return {}; }
  async _onRender() {}
}

class MockDie {
  constructor({ faces = 20, result = 1, random = 1 } = {}) {
    this.faces = faces;
    this.nextResult = result;
    this.nextRandom = random;
    this.results = [];
    this._root = { options: {} };
  }

  async roll() {
    const result = { result: this.nextResult };
    this.results.push(result);
    return result;
  }

  randomFace() {
    return this.nextRandom;
  }
}

const settingValues = new Map([
  ["yarpen-change-numbers.enabled", true],
  ["yarpen-change-numbers.interfaceLanguage", "en"],
  ["yarpen-change-numbers.showOriginal", true],
  ["yarpen-change-numbers.rules", []]
]);

globalThis.foundry = {
  applications: {
    api: {
      ApplicationV2: MockApplicationV2,
      DialogV2: { confirm: async () => true },
      HandlebarsApplicationMixin: (Base) => class extends Base {}
    }
  },
  dice: { terms: { Die: MockDie } },
  utils: {
    deepClone: structuredClone,
    escapeHTML: (value) => String(value)
  }
};

globalThis.game = {
  settings: {
    get: (moduleId, key) => settingValues.get(`${moduleId}.${key}`),
    set: async (moduleId, key, value) => settingValues.set(`${moduleId}.${key}`, value),
    register: (moduleId, key, config) => {
      const fullKey = `${moduleId}.${key}`;
      if (!settingValues.has(fullKey)) settingValues.set(fullKey, config.default);
    },
    registerMenu: () => {}
  },
  modules: new Map([["yarpen-change-numbers", {}]]),
  system: { id: "dnd5e" },
  user: { character: null, isGM: true }
};
globalThis.ui = { notifications: { warn: () => {}, error: () => {}, info: () => {} } };
globalThis.canvas = { tokens: { controlled: [] } };

await import("../scripts/main.js");
onceHooks.get("init")();

settingValues.set("yarpen-change-numbers.rules", [{
  id: "critical-map",
  name: "Critical map",
  enabled: true,
  faces: 20,
  allowed: "1-20",
  replacements: [{ from: 7, to: 20 }, { from: 13, to: 1 }],
  global: true,
  actorIds: [],
  itemKeys: []
}]);

const criticalDie = new MockDie({ faces: 20, result: 7 });
const criticalResult = await criticalDie.roll();
assert.equal(criticalResult.result, 20);
assert.equal(criticalDie.results[0].result, 20);
assert.equal(criticalDie._root.options["yarpen-change-numbers"].changes[0].final, 20);

const fumbleDie = new MockDie({ faces: 20, result: 13 });
assert.equal((await fumbleDie.roll()).result, 1);

settingValues.set("yarpen-change-numbers.rules", [{
  id: "no-twenty",
  name: "No twenty",
  enabled: true,
  faces: 20,
  allowed: "1-19",
  replacements: [],
  global: true,
  actorIds: [],
  itemKeys: []
}]);

const rangeDie = new MockDie({ faces: 20, result: 20, random: 12 });
assert.equal((await rangeDie.roll()).result, 12);

settingValues.set("yarpen-change-numbers.rules", [{
  id: "item-only",
  name: "Item only",
  enabled: true,
  faces: 20,
  allowed: "1-20",
  replacements: [{ from: 4, to: 18 }],
  global: false,
  actorIds: [],
  itemKeys: ["ACTOR:ITEM"]
}]);

const itemRoll = { options: {} };
onHooks.get("dnd5e.postRollConfiguration")([itemRoll], {
  subject: { actor: { id: "ACTOR" }, item: { id: "ITEM" } }
});
const itemDie = new MockDie({ faces: 20, result: 4 });
itemDie._root = itemRoll;
assert.equal((await itemDie.roll()).result, 18);

const otherDie = new MockDie({ faces: 20, result: 4 });
assert.equal((await otherDie.roll()).result, 4);

console.log("All Change Numbers integration tests passed.");
