# SNES PAL Sammlung – Version 0.3.3

Ein für iPhone und Desktop optimierter Sammlungsmanager für europäische
Super-Nintendo-Spiele.

- [Projektseite](https://snes-pal-sammlung.jnldc.chatgpt.site)
- [GitHub Pages](https://f6yv7sgtgw-wq.github.io/SNES-PAL-Sammlung/)

## Funktionen

- vollständiger Katalog mit 530 SNES-PAL-Spielen
- Cover, Erscheinungsjahr, Entwickler, Herausgeber und Seltenheitsbewertung
- aktuelle Online-Richtwerte für Modul, OVP/CIB, Neu/Sealed, Box und Anleitung
- Spiele zur Sammlung hinzufügen, bearbeiten und entfernen
- Zustand, Kaufpreis, Kaufdatum und persönliche Notizen erfassen
- Sammlungsfortschritt, Richtwert und erfasste Ausgaben im Überblick
- Suche, Status- und Seltenheitsfilter sowie mehrere Sortierungen
- dritter Hauptbereich **Suche** für alle noch fehlenden Spiele
- ausschließliche Anbindung des GenericParser an Kleinanzeigen
- deutschlandweite Suche mit Versand; reine Abholangebote werden entfernt
- sequenzieller Vollsuchlauf mit sanftem Stopp und lokal gespeichertem Fortsetzen
- automatische Wiederholung vorübergehender Parser- und Netzwerkfehler
- Prüfung von Titel und Beschreibungsanriss auf Repros, Defekte und Konvolute
- Konvolut-Richtwert als Summe aller erkannten Spiele aus der Preisbibliothek
- vierstufige Preisampel nach prozentualer Abweichung inklusive erkannter Versandkosten
- neutrale Kennzeichnung für nicht belastbar bewertbare Angebote
- feste Ergebnisgruppen Grün, Gelb, Orange, Rot und Unklar mit frei wählbarer
  Sortierung innerhalb jeder Farbe nach Angebot, Richtwert, Eurodifferenz,
  Prozentdifferenz oder Spieltitel
- erweiterte lokale Suchspeicherung über IndexedDB mit automatischer Übernahme älterer Treffer
- JSON-Datensicherung mit Export und Import
- dunkle, touchfreundliche Oberfläche

Nicht enthalten sind Wunschlisten, Preisalarme, Benachrichtigungen, Vinted,
eBay oder Händlerquellen. Die Kleinanzeigen-Suche wird bewusst vom Nutzer
gestartet und läuft nur, solange die Seite geöffnet ist.

## Kleinanzeigen-Suche

Die Anwendung verwendet ausschließlich den öffentlichen Worker des
[`GenericParser`](https://github.com/f6yv7sgtgw-wq/GenericParser) mit dem
Vertrag `generic-parser-module-v1`. Für den Beschreibungsanriss nutzt die App
die kompatible Route `/api/search`; jeder Request setzt trotzdem den
Vertragsheader und fest `source: "kleinanzeigen"`. Antworten werden auf Vertrag,
Seitenquelle und jede einzelne Trefferquelle geprüft. Eine unerwartet aktive
Vinted-Quelle stoppt den Lauf, statt Ergebnisse zu vermischen.

Die Ampel vergleicht den Gesamtpreis mit dem zum erkannten Zustand passenden
Online-Richtwert. Ist der Versandpreis offen, wird sichtbar gekennzeichnet der
Angebotspreis vor Versand verwendet:

- **Grün:** günstiger oder höchstens 10 Prozent über dem Richtwert
- **Gelb:** 11 bis 25 Prozent über dem Richtwert
- **Orange:** 26 bis 40 Prozent über dem Richtwert
- **Rot:** ab gerundeten 41 Prozent über dem Richtwert oder als Repro/Defekt/Gesuch unpassend
- **Unklar:** Preis, Titelzuordnung oder Konvolutinhalt nicht belastbar bewertbar

Ein nicht ausdrücklich genannter Zustand wird konservativ mit dem Modulwert
verglichen und entsprechend markiert. Der Parser liefert den auf der
Suchergebnisseite sichtbaren Beschreibungsanriss; eine möglicherweise gekürzte
Konvolutbeschreibung bleibt deshalb **Unklar**.

Version 0.3.1 bereinigt Suchbegriffe für die Worker-Route. `Ranma 1/2` wird
beispielsweise als `SNES Ranma 1 2` abgefragt, während die Treffer weiterhin
gegen den unveränderten Katalogtitel geprüft werden. Dadurch lässt sich ein bei
diesem Titel unterbrochener Lauf ohne Verlust der gespeicherten Ergebnisse
fortsetzen.

Version 0.3.2 speichert Suchstand und Angebote nicht mehr als einen großen
`localStorage`-Eintrag, sondern getrennt in IndexedDB. Beim ersten Laden werden
vorhandene Treffer automatisch übernommen und anschließend nur noch geänderte
Anzeigen aktualisiert. Vorübergehende Fehler wie Safaris `Load failed`, HTTP
408/429 oder Serverfehler werden für dasselbe Arbeitspaket automatisch zweimal
wiederholt. Erst wenn alle drei Versuche fehlschlagen, pausiert der Lauf mit
unverändertem Fortsetzungspunkt.

Version 0.3.3 hält die Ampelfolge unabhängig von der gewählten Sortierung fest.
Innerhalb jeder Farbe lassen sich die Treffer auf- oder absteigend nach
Angebotspreis, Richtwert, Differenz in Euro, Differenz in Prozent oder
Spieltitel ordnen. Standardmäßig stehen die relativ günstigsten Angebote oben;
die Auswahl bleibt nach einem Neuladen erhalten.

Bei der Titelzuordnung gewinnt die längste eindeutige Fundstelle. Ein Angebot
für `Aero the Acro-Bat 2` zählt deshalb nicht zusätzlich den Richtwert von
`Aero the Acro-Bat`. Getrennte Titelvorkommen in einem echten Konvolut werden
dagegen einzeln summiert. Weitere Details stehen in
[`docs/SEARCH.md`](docs/SEARCH.md).

## Preisquelle

Die Richtwerte stammen aus dem PAL-SNES-Preisführer von PriceCharting und wurden
am 28. Juli 2026 geprüft. Die dort in US-Dollar geführten Werte werden mit dem
EZB-Tageskurs vom 28. Juli 2026 in Euro umgerechnet. Typische Versandkosten sind
nicht enthalten.

Für drei von insgesamt 2.650 Zustandswerten veröffentlicht PriceCharting keinen
Marktwert. Die Anwendung zeigt dort bewusst `–`. Die ursprünglichen Werte des
Konsolenguides vom 5. Juli 2020 bleiben im Katalog unter `guidePrices` erhalten,
werden aber nicht mehr als aktuelle Richtwerte angezeigt.

Das PDF enthält für `Williams Arcade's Greatest Hits` kein Cover. Die App zeigt
für diesen Titel deshalb bewusst einen Platzhalter.

## Daten

Die persönliche Sammlung sowie Suchfortschritt und gefundene Angebote werden
ausschließlich im lokalen Speicher des Browsers abgelegt. Die Suchergebnisse
liegen in IndexedDB; die Sammlungseinstellungen bleiben im kleinen
Browserspeicher. Der Katalog ist in
`app/snes-games.json` enthalten. Mit
`scripts/extract_snes_guide.py` lässt er sich aus dem ursprünglichen PDF
reproduzierbar neu erzeugen. `scripts/update-online-prices.mjs` prüft die
Titelzuordnung und kann einen neuen Online-Preissnapshot übernehmen.

## Entwicklung

```bash
npm ci
npm run dev
```

Die Anwendung basiert auf React, TypeScript und Vinext.

## Qualitätsprüfung

```bash
npm test
npm run lint
npm run build:pages
```

`npm test` prüft unter anderem die vier Ampelgrenzen, die feste Farbfolge und
alle Sortierfelder, Versandfilter, Repros,
Konvolutsummen, Basis-/Fortsetzungstitel, die Wiederholung von `Load failed`
und alle 530 Katalogtitel auf falsche Mehrfachzuordnungen sowie routesichere
Suchbegriffe. GitHub Pages führt Test und Build bei jedem Push auf `main`
erneut aus.

## Versionen

- [`docs/VERSION-0.3.3.md`](docs/VERSION-0.3.3.md) – feste Farbgruppen und Sortierung innerhalb der Gruppen
- [`docs/VERSION-0.3.2.md`](docs/VERSION-0.3.2.md) – erweiterter Speicher und automatische Wiederholung
- [`docs/VERSION-0.3.1.md`](docs/VERSION-0.3.1.md) – Ranma-Fortsetzungsfix und Prozentampel
- [`docs/VERSION-0.3.md`](docs/VERSION-0.3.md) – Kleinanzeigen-Suche und Preisampel
- [`docs/VERSION-0.2.md`](docs/VERSION-0.2.md) – vollständiger PAL-Katalog und Onlinepreise
- [`docs/SEARCH.md`](docs/SEARCH.md) – Suchablauf, Konvolute und Grenzen
- [`docs/DATA-SOURCES.md`](docs/DATA-SOURCES.md) – Katalog-, Preis- und Angebotsquellen
