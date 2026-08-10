# Projekt SNES – Version 0.3.5.1

Ein für iPhone und Desktop optimierter Sammlungsmanager für europäische
Super-Nintendo-Spiele.

- [Projektseite](https://snes-pal-sammlung.jnldc.chatgpt.site)
- [GitHub Pages](https://f6yv7sgtgw-wq.github.io/SNES-PAL-Sammlung/)

## Funktionen

- vollständiger Katalog mit 530 SNES-PAL-Spielen
- Cover, Erscheinungsjahr, Entwickler, Herausgeber und Seltenheitsbewertung
- aktuelle Online-Richtwerte für Modul, OVP/CIB, Neu/Sealed, Box und Anleitung
- integrierter persönlicher Ausgangsbestand aus `SNES_GAMES.xlsx`
- getrennte Besitzmerkmale für Modul, Box und Anleitung
- CIB- und Sealed-Status sowie Anzahl je Spiel
- Kaufpreis, Kaufdatum und persönliche Notizen
- automatische Migration alter Version-1-Sammlungsdaten
- Sammlungsfortschritt, Richtwert und erfasste Ausgaben im Überblick
- Suche, Status- und Seltenheitsfilter sowie mehrere Sortierungen
- dritter Hauptbereich **Suche** für alle noch fehlenden Spiele
- ausschließliche Anbindung des GenericParser an Kleinanzeigen
- deutschlandweite Suche mit Versand; reine Abholangebote werden entfernt
- sequenzieller Vollsuchlauf mit sanftem Stopp und lokal gespeichertem Fortsetzen
- automatische Wiederholung vorübergehender Parser- und Netzwerkfehler
- Prüfung von Titel und Beschreibungsdaten auf Repros, Defekte und Konvolute
- Konvolut-Richtwert als Summe aller erkannten Spiele aus der Preisbibliothek
- vierstufige Preisampel nach prozentualer Abweichung inklusive erkannter Versandkosten
- feste Ergebnisgruppen Grün, Gelb, Orange, Rot und Unklar mit frei wählbarer
  Sortierung innerhalb jeder Farbe
- mobile, gegen horizontale Überläufe abgesicherte Karten und Formulare
- kompakte Suchergebnis-Karten nach dem GenericParser-1.5-Muster mit kleinen
  quadratischen Vorschaubildern und ohne sichtbaren Anzeigentext
- kompakte 36-Pixel-Aktionsbuttons in Suchkarten auf Mobilgeräten
- JSON-Datensicherung mit Export und Import
- dunkle, touchfreundliche Oberfläche

## Hotfix 0.3.5.1

0.3.5.1 korrigiert den im mobilen Screenshot sichtbaren übergroßen
Aktionsbereich der Suchkarten. Auf Telefonen wirkte noch eine ältere vertikale
Flex-Regel auf einen 120-Pixel-Flex-Basiswert; dadurch wurden **Zur Sammlung**
und **Anzeige öffnen** unnötig hoch.

Der Hotfix ersetzt diesen Bereich mobil durch ein zweispaltiges Raster mit
36-Pixel-Buttons. Gleichzeitig wird das Vorschaubild auf 64 × 64 Pixel reduziert
(58 × 58 auf sehr schmalen Geräten), der Preisvergleich zeigt sechs Werte in nur
zwei Zeilen, die Begründung wird auf eine Zeile begrenzt und die Footer-Metadaten
werden kompakt zusammengefasst. Die Anzeigenbeschreibung bleibt ausgeblendet.

Der Header zeigt auf Desktop und Mobilgerät **Projekt SNES · v0.3.5.1**.

## GUI 0.3.5

Version 0.3.5 überarbeitet die mobile Darstellung, ohne die fachliche
Sammlungs- oder Suchlogik zu ändern.

Alle relevanten Grid- und Flex-Bereiche dürfen auf kleinen Displays schrumpfen,
statt die Seitenbreite zu vergrößern. Große Zahlen verwenden responsive
Schriftgrößen. Im finanziellen Überblick werden Beschriftung und Betrag auf
schmalen Telefonen untereinander dargestellt, damit auch längere Eurobeträge
innerhalb ihrer Karte bleiben. Dieselben Regeln gelten für Statistik-,
Zustands-, Richtwert-, Katalog-, Such-, Preisvergleichs- und Dialogkarten.

Die Suchergebnis-Karten orientieren sich an GenericParser 1.5.0: kleines
quadratisches Bild und Text bleiben nebeneinander, die Karten sind deutlich
kompakter und die Anzeigenbeschreibung wird nicht mehr sichtbar dargestellt.
Titel, Preis, Ampel, Zustand, Preisvergleich, erkannte Spiele und Aktionen
bleiben erhalten.

## Sammlungsmodell 0.3.4

Version 0.3.4 ersetzt den bisherigen Einzelzustand durch ein Komponentenmodell.
Pro Sammlungseintrag werden **Modul**, **Box** und **Anleitung** getrennt
gespeichert. Zusätzlich gibt es `completeInBox`, `sealed` und `quantity`.

Die Richtwertlogik ist:

- **CIB:** direkter CIB-Richtwert
- **Neu / Sealed:** direkter Neu-/Sealed-Richtwert
- **Modul + Anleitung:** Modul-Richtwert + Anleitungs-Richtwert
- **Modul + Box:** Modul-Richtwert + Box-Richtwert
- andere Teilbestände: Summe der vorhandenen Einzelkomponenten
- mehrere Exemplare: Richtwert × Anzahl

Wenn ein für eine benötigte Einzelkomponente notwendiger Richtwert fehlt, wird
kein unvollständiger Summenwert erfunden.

Beim ersten Start von 0.3.4 wird der bisherige Version-1-Browserbestand
automatisch in das neue Schema migriert. Gleichzeitig dient der aus
`SNES_GAMES.xlsx` übernommene Bestand als Ausgangsbasis; bereits vorhandene
eigene Einträge gewinnen bei Konflikten. Danach wird ausschließlich der
Version-2-Bestand verwendet, sodass bewusst entfernte Spiele nicht erneut
eingefügt werden.

Der integrierte Excel-Bestand enthält 118 Spiele aus dem 530-Spiele-Katalog,
120 Exemplare und Kaufpreise von zusammen 2.042,00 €. `Super Game Boy` bleibt
als Hardware/Zubehör außerhalb des Spielekatalogs.

## Kleinanzeigen-Suche

Die Anwendung verwendet ausschließlich den öffentlichen Worker des
[`GenericParser`](https://github.com/f6yv7sgtgw-wq/GenericParser) mit dem
Vertrag `generic-parser-module-v1`. Jeder Request setzt fest
`source: "kleinanzeigen"`. Vinted, eBay und Händlerquellen sind in dieser
Version nicht aktiv.

Die Ampel vergleicht den Gesamtpreis mit dem zum erkannten Zustand passenden
Online-Richtwert:

- **Grün:** günstiger oder höchstens 10 Prozent über dem Richtwert
- **Gelb:** 11 bis 25 Prozent über dem Richtwert
- **Orange:** 26 bis 40 Prozent über dem Richtwert
- **Rot:** ab 41 Prozent über dem Richtwert oder als Repro/Defekt/Gesuch unpassend
- **Unklar:** Preis, Titelzuordnung oder Konvolutinhalt nicht belastbar bewertbar

Version 0.3.1 bereinigt routesichere Suchbegriffe, Version 0.3.2 speichert
Suchstand und Angebote in IndexedDB und wiederholt vorübergehende Fehler,
Version 0.3.3 ergänzt die feste Farbfolge mit Sortierung innerhalb jeder Farbe.
Weitere Details stehen in [`docs/SEARCH.md`](docs/SEARCH.md).

## Preisquelle

Die Richtwerte stammen aus dem PAL-SNES-Preisführer von PriceCharting und wurden
am 28. Juli 2026 geprüft. Die dort in US-Dollar geführten Werte werden mit dem
EZB-Tageskurs vom 28. Juli 2026 in Euro umgerechnet. Typische Versandkosten sind
nicht enthalten.

Für drei von insgesamt 2.650 Zustandswerten veröffentlicht PriceCharting keinen
Marktwert. Die Anwendung zeigt dort bewusst `–`.

## Daten

Die persönliche Sammlung sowie Suchfortschritt und gefundene Angebote werden
ausschließlich im lokalen Speicher des Browsers abgelegt. Die Suchergebnisse
liegen in IndexedDB; die Sammlung liegt ab Version 0.3.4 im
`localStorage`-Schema `snes-pal-sammlung-v2`.

Der Katalog ist in `app/snes-games.json` enthalten. Der integrierte
Ausgangsbestand aus der Excel-Datei ist in `app/initial-collection.ts`
versioniert. Die Modell- und Migrationslogik liegt in
`app/collection-model.ts`.

## Entwicklung und Tests

```bash
npm ci
npm run dev
npm test
npm run lint
npm run build:pages
```

`npm test` prüft das Sammlungsmodell, Suchbewertung, Recovery, Sortierung und ab
0.3.5 zusätzlich den mobilen UI-Vertrag. 0.3.5.1 ergänzt einen Regressionstest
für die mobilen Button-Höhen und die dreispaltige Vergleichsdarstellung. Der
GitHub-Pages-Build validiert danach das tatsächlich erzeugte Pages-Artefakt auf
Release-Identität, Excel-Bootstrap und die aktiven Hotfix-Regeln. GitHub Pages
führt Test und Build bei jedem Push auf `main` erneut aus.

## Versionen

- [`docs/VERSION-0.3.5.1.md`](docs/VERSION-0.3.5.1.md) – Mobile-Hotfix für kompakte Suchkarten und Aktionsbuttons
- [`docs/VERSION-0.3.5.md`](docs/VERSION-0.3.5.md) – mobiles GUI-Rework und kompakte Suchkarten
- [`docs/VERSION-0.3.4.md`](docs/VERSION-0.3.4.md) – Komponentenmodell, Excel-Ausgangsbestand und Richtwertlogik
- [`docs/VERSION-0.3.3.md`](docs/VERSION-0.3.3.md) – feste Farbgruppen und Sortierung innerhalb der Gruppen
- [`docs/VERSION-0.3.2.md`](docs/VERSION-0.3.2.md) – erweiterter Speicher und automatische Wiederholung
- [`docs/VERSION-0.3.1.md`](docs/VERSION-0.3.1.md) – Ranma-Fortsetzungsfix und Prozentampel
- [`docs/VERSION-0.3.md`](docs/VERSION-0.3.md) – Kleinanzeigen-Suche und Preisampel
- [`docs/VERSION-0.2.md`](docs/VERSION-0.2.md) – vollständiger PAL-Katalog und Onlinepreise
- [`docs/SEARCH.md`](docs/SEARCH.md) – Suchablauf, Konvolute und Grenzen
- [`docs/DATA-SOURCES.md`](docs/DATA-SOURCES.md) – Katalog-, Preis-, Sammlungs- und Angebotsquellen
