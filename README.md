# YarpenArt: Change Numbers

Moduł dla Foundry VTT V13 Build 351 i dnd5e 5.3.3 pozwalający GM-owi zmieniać możliwe wyniki dowolnego rozmiaru kości.

## Funkcje

- Dowolne dozwolone przedziały, np. `1-19`, `2-20` albo `1-9, 11-20`.
- Dowolne podmiany, np. `7 → 20` i `13 → 1`.
- Obsługa każdego rozmiaru kości od k2 do k1000.
- Przypisania globalne, do konkretnych postaci oraz do konkretnych przedmiotów w ich ekwipunku.
- Priorytet: przedmiot, następnie postać, następnie reguła globalna.
- Wyszukiwarka postaci oraz przedmiotów; zaznaczone cele są zawsze na początku przewijanej listy.
- Zgodność z Dice So Nice. Animacja otrzymuje już końcowy, zmieniony wynik.
- Wynik jest zmieniany przed przewagą/niekorzyścią, przerzutami, eksplozją kości oraz wybieraniem najwyższego lub najniższego wyniku.
- Podmienione naturalne 1 i 20 uruchamiają zasady krytycznej porażki i krytycznego sukcesu dnd5e. Dotyczy to również automatycznego rozpoznawania krytycznego trafienia broni.
- Angielski i polski interfejs; angielski jest domyślny przy pierwszej instalacji.

## Ustawienia

Po aktywowaniu modułu otwórz:

`Configure Settings → Module Settings → YarpenArt: Change Numbers → Open rule editor`

Kolejność działania pojedynczej reguły:

1. Jeżeli wypadnie niedozwolona ścianka, moduł losuje ponownie aż uzyska dozwolony wynik.
2. Moduł sprawdza tabelę podmian i zamienia dozwolony wynik.
3. Foundry/dnd5e stosuje modyfikatory rzutu i zasady krytyków.
4. Dice So Nice wyświetla końcowy wynik.

Jeśli kilka reguł tego samego poziomu pasuje do tej samej kości, wygrywa pierwsza reguła widoczna na liście. Strzałki w edytorze zmieniają kolejność.

## Instalacja przez Manifest URL

Po opublikowaniu pierwszego wydania w GitHub użyj w Foundry:

`https://github.com/yarpenart/Change-Numbers/releases/latest/download/module.json`

## GitHub Desktop i Visual Studio Code

1. Utwórz na GitHub puste publiczne repozytorium `Change-Numbers` na koncie `yarpenart`.
2. W GitHub Desktop wybierz **File → Add local repository** i wskaż folder modułu. Jeżeli folder nie ma jeszcze repozytorium, wybierz utworzenie repozytorium w tym miejscu.
3. Zatwierdź wszystkie pliki i wybierz **Publish repository**. Nie zaznaczaj opcji prywatnego repozytorium, jeżeli Manifest URL ma działać publicznie.
4. Otwórz folder przez **Repository → Open in Visual Studio Code**.
5. W GitHub Desktop utwórz tag `v0.1.0` albo uruchom w terminalu VS Code:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

6. GitHub Actions automatycznie utworzy Release zawierający `module.json` i `yarpen-change-numbers-v0.1.0.zip`.

Przy następnym wydaniu utwórz kolejny tag, np. `v0.1.1`. Workflow wpisze numer wersji i poprawny adres ZIP do manifestu wydania.

## Testy lokalne

W terminalu VS Code:

```bash
node tests/rules.test.mjs
```

## Zakres integracji przedmiotów

Reguła przypisana do przedmiotu obejmuje rzuty wykonywane przez aktywności tego przedmiotu w dnd5e 5.3.3, w tym ataki i obrażenia. Zwykły rzut `/r 1d20`, który nie pochodzi z przedmiotu, korzysta z reguły kontrolowanej postaci albo przypisanej postaci użytkownika.
