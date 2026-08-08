# SNES PAL Sammlung – Version 0.2

Ein für iPhone und Desktop optimierter Sammlungsmanager für europäische
Super-Nintendo-Spiele.

## Funktionen

- vollständiger Katalog mit 530 SNES-PAL-Spielen
- Cover, Erscheinungsjahr, Entwickler, Herausgeber und Seltenheitsbewertung
- aktuelle Online-Richtwerte für Modul, OVP/CIB, Neu/Sealed, Box und Anleitung
- Spiele zur Sammlung hinzufügen, bearbeiten und entfernen
- Zustand, Kaufpreis, Kaufdatum und persönliche Notizen erfassen
- Sammlungsfortschritt, Richtwert und erfasste Ausgaben im Überblick
- Suche, Status- und Seltenheitsfilter sowie mehrere Sortierungen
- lokale Speicherung im Browser
- JSON-Datensicherung mit Export und Import
- dunkle, touchfreundliche Oberfläche

Nicht enthalten sind Wunschlisten, Deals, Preisalarme oder automatische
Marktsuchen.

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

Die persönliche Sammlung wird ausschließlich im lokalen Speicher des Browsers
abgelegt. Der Katalog ist in `app/snes-games.json` enthalten. Mit
`scripts/extract_snes_guide.py` lässt er sich aus dem ursprünglichen PDF
reproduzierbar neu erzeugen. `scripts/update-online-prices.mjs` prüft die
Titelzuordnung und kann einen neuen Online-Preissnapshot übernehmen.

## Entwicklung

```bash
npm install
npm run dev
```

Die Anwendung basiert auf React, TypeScript und Vinext.

## Veröffentlichungen

- Projektseite: https://snes-pal-sammlung.jnldc.chatgpt.site/
- GitHub Pages: https://f6yv7sgtgw-wq.github.io/SNES-PAL-Sammlung/

Der GitHub-Pages-Build verwendet dieselbe React-Oberfläche, denselben
530-Spiele-Katalog und dieselben Cover wie die Projektseite. Die persönliche
Sammlung bleibt auf beiden Seiten ausschließlich im jeweiligen Browser
gespeichert.
