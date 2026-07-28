# SNES PAL Sammlung – Version 0.1

Ein für iPhone und Desktop optimierter Sammlungsmanager für europäische
Super-Nintendo-Spiele.

## Funktionen

- vollständiger Katalog mit 530 SNES-PAL-Spielen
- Cover, Erscheinungsjahr, Entwickler, Herausgeber und Seltenheitsbewertung
- feste Richtwerte für Modul, OVP/CIB, Neu/Sealed, Box und Anleitung
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

Die Richtwerte wurden aus dem bereitgestellten PDF `Konsolenguide_SNES.pdf`
übernommen. Der Guide wurde am 5. Juli 2020 erstellt. Die Werte enthalten keine
Versandkosten und sind keine aktuellen Marktpreise.

Das PDF enthält für `Williams Arcade's Greatest Hits` kein Cover. Die App zeigt
für diesen Titel deshalb bewusst einen Platzhalter.

## Daten

Die persönliche Sammlung wird ausschließlich im lokalen Speicher des Browsers
abgelegt. Der Katalog ist in `app/snes-games.json` enthalten. Mit
`scripts/extract_snes_guide.py` lässt er sich aus dem ursprünglichen PDF
reproduzierbar neu erzeugen.

## Entwicklung

```bash
npm install
npm run dev
```

Die Anwendung basiert auf React, TypeScript und Vinext.
