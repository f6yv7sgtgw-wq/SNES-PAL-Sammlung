# SNES PAL Sammlung – Version 0.3

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
- Prüfung von Titel und Beschreibungsanriss auf Repros, Defekte und Konvolute
- Konvolut-Richtwert als Summe aller erkannten Spiele aus der Preisbibliothek
- eigene Preisampel inklusive erkannter Versandkosten
- lokale Speicherung im Browser
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
Online-Richtwert:

- **Grün:** mindestens 10 Euro oder 20 Prozent günstiger
- **Gelb:** unklar oder höchstens 10 Euro über dem Richtwert
- **Rot:** mehr als 10 Euro teurer oder als Repro/Defekt/Gesuch unpassend

Unklare Versandkosten, Zustände und Konvolutinhalte werden niemals grün
gerechnet. Der Parser liefert den auf der Suchergebnisseite sichtbaren
Beschreibungsanriss; eine möglicherweise gekürzte Konvolutbeschreibung wird
deshalb gelb gekennzeichnet.

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
ausschließlich im lokalen Speicher des Browsers abgelegt. Der Katalog ist in
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

`npm test` prüft unter anderem die Ampelgrenzen, Versandfilter, Repros,
Konvolutsummen, Basis-/Fortsetzungstitel und alle 530 Katalogtitel auf falsche
Mehrfachzuordnungen. GitHub Pages führt Test und Build bei jedem Push auf
`main` erneut aus.

## Versionen

- [`docs/VERSION-0.3.md`](docs/VERSION-0.3.md) – Kleinanzeigen-Suche und Preisampel
- [`docs/VERSION-0.2.md`](docs/VERSION-0.2.md) – vollständiger PAL-Katalog und Onlinepreise
- [`docs/SEARCH.md`](docs/SEARCH.md) – Suchablauf, Konvolute und Grenzen
- [`docs/DATA-SOURCES.md`](docs/DATA-SOURCES.md) – Katalog-, Preis- und Angebotsquellen
