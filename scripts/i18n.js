import { MODULE_ID } from "./rules.js";

const TEXT = {
  en: {
    title: "YarpenArt: Change Numbers",
    rules: "Rules",
    addRule: "Add rule",
    duplicate: "Duplicate",
    delete: "Delete",
    moveUp: "Move up",
    moveDown: "Move down",
    enabled: "Rule enabled",
    ruleName: "Rule name",
    dieFaces: "Die size",
    dieFacesHint: "Enter the number of faces (for example 20 for a d20).",
    allowedFaces: "Allowed results",
    allowedFacesHint: "Inclusive ranges separated by commas, for example: 1-19 or 1-9, 11-20.",
    orderHint: "Disallowed faces are rerolled first, then replacements are applied.",
    preview: "Preview",
    allowedCount: "{allowed} of {faces} faces allowed",
    allFaces: "All faces are allowed.",
    replacements: "Result replacements",
    replacementsHint: "When the left value is rolled, the right value becomes the real result.",
    from: "Rolled",
    to: "Becomes",
    addReplacement: "Add replacement",
    assignments: "Assignments",
    global: "Apply globally",
    globalHint: "Use this rule for every matching die unless an actor or item rule has priority.",
    actors: "Characters",
    items: "Inventory items",
    actorSearch: "Search character name...",
    itemSearch: "Search item or owner name...",
    selectedFirst: "Selected targets are always shown at the top.",
    noActors: "No matching characters.",
    noItems: "No matching inventory items.",
    selected: "Selected",
    token: "Token",
    actor: "Actor",
    item: "Item",
    noTarget: "No target",
    save: "Save rules",
    saved: "Change Numbers rules saved.",
    invalid: "Correct the highlighted rule fields before saving.",
    deleteConfirmTitle: "Delete rule?",
    deleteConfirm: "Delete \"{name}\"?",
    yes: "Delete",
    no: "Cancel",
    originalChanged: "Changed die results",
    scopeGlobal: "Global",
    scopeActor: "Character",
    scopeItem: "Item",
    incompatibleSystem: "YarpenArt: Change Numbers is designed for the dnd5e system.",
    noRules: "Add a rule to begin.",
    priority: "Priority: item > character > global. At the same level, the first rule on the list wins.",
    rangeError: "Use values from 1 to d{faces}, for example 1-{faces}.",
    replacementError: "Replacement values must be unique and between 1 and {faces}.",
    nameError: "Enter a rule name.",
    dieError: "Die size must be a whole number from 2 to 1000."
  },
  pl: {
    title: "YarpenArt: Change Numbers",
    rules: "Reguły",
    addRule: "Dodaj regułę",
    duplicate: "Duplikuj",
    delete: "Usuń",
    moveUp: "Przesuń wyżej",
    moveDown: "Przesuń niżej",
    enabled: "Reguła aktywna",
    ruleName: "Nazwa reguły",
    dieFaces: "Rozmiar kości",
    dieFacesHint: "Wpisz liczbę ścianek, np. 20 dla k20.",
    allowedFaces: "Dozwolone wyniki",
    allowedFacesHint: "Przedziały domknięte oddzielone przecinkami, np. 1-19 albo 1-9, 11-20.",
    orderHint: "Najpierw niedozwolone ścianki są przerzucane, a potem wykonywane są podmiany.",
    preview: "Podgląd",
    allowedCount: "Dozwolone: {allowed} z {faces} ścianek",
    allFaces: "Wszystkie ścianki są dozwolone.",
    replacements: "Podmiany wyników",
    replacementsHint: "Gdy wypadnie wartość po lewej, prawdziwym wynikiem staje się wartość po prawej.",
    from: "Wyrzucono",
    to: "Zamień na",
    addReplacement: "Dodaj podmianę",
    assignments: "Przypisania",
    global: "Zastosuj globalnie",
    globalHint: "Użyj tej reguły dla każdej pasującej kości, chyba że pierwszeństwo ma reguła postaci lub przedmiotu.",
    actors: "Postacie",
    items: "Przedmioty w ekwipunku",
    actorSearch: "Wyszukaj nazwę postaci...",
    itemSearch: "Wyszukaj przedmiot lub właściciela...",
    selectedFirst: "Wybrane cele są zawsze wyświetlane na górze.",
    noActors: "Brak pasujących postaci.",
    noItems: "Brak pasujących przedmiotów.",
    selected: "Wybrano",
    token: "Token",
    actor: "Aktor",
    item: "Przedmiot",
    noTarget: "Brak celu",
    save: "Zapisz reguły",
    saved: "Reguły Change Numbers zostały zapisane.",
    invalid: "Przed zapisaniem popraw zaznaczone pola reguły.",
    deleteConfirmTitle: "Usunąć regułę?",
    deleteConfirm: "Usunąć „{name}”?",
    yes: "Usuń",
    no: "Anuluj",
    originalChanged: "Zmienione wyniki kości",
    scopeGlobal: "Globalnie",
    scopeActor: "Postać",
    scopeItem: "Przedmiot",
    incompatibleSystem: "YarpenArt: Change Numbers jest przeznaczony dla systemu dnd5e.",
    noRules: "Dodaj pierwszą regułę.",
    priority: "Priorytet: przedmiot > postać > globalnie. Na tym samym poziomie wygrywa pierwsza reguła na liście.",
    rangeError: "Użyj wartości od 1 do k{faces}, np. 1-{faces}.",
    replacementError: "Wartości podmiany muszą być unikalne i mieścić się od 1 do {faces}.",
    nameError: "Wpisz nazwę reguły.",
    dieError: "Rozmiar kości musi być liczbą całkowitą od 2 do 1000."
  }
};

export function getLanguage() {
  try {
    return game.settings.get(MODULE_ID, "interfaceLanguage") === "pl" ? "pl" : "en";
  } catch (_error) {
    return "en";
  }
}

export function dictionary() {
  return TEXT[getLanguage()];
}

export function translate(key, data = {}) {
  let value = dictionary()[key] ?? TEXT.en[key] ?? key;
  for (const [name, replacement] of Object.entries(data)) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }
  return value;
}
