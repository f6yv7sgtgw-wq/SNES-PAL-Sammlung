# Veröffentlichung und Projektstand

## Gemeinsamer Quellstand

Version 0.3 verwendet für die Projektseite und GitHub Pages dieselben React-
Komponenten, Katalogdaten, Cover und Suchregeln. Die GitHub-Pages-Ausgabe wird
bei jeder Änderung auf `main` automatisch getestet, gebaut und veröffentlicht.

Das Repository enthält:

- die vollständige React-/Vinext-Anwendung
- den Katalog mit 530 PAL-Spielen und 529 Coverbildern
- alle fünf Richtwerte je Spiel, soweit online verfügbar
- lokale Sammlungsverwaltung mit JSON-Import und -Export
- die Kleinanzeigen-Suche für alle fehlenden Spiele
- eine eigene GitHub-Pages-Ausgabe derselben Oberfläche

## Abnahmekriterien für 0.3.x

- Navigation mit **Sammlung**, **Katalog** und **Suche**
- Suche ausschließlich über Kleinanzeigen
- deutschlandweit, reine Abholangebote werden entfernt
- konservative Ampel inklusive erkannter Versandkosten
- Konvolutwerte nur aus eindeutig erkannten Katalogtiteln
- keine Wünsche, Preisalarme oder zusätzlichen Marktplätze
- mobile Darstellung ohne horizontales Scrollen
- lokale Speicherung von Sammlung, Suchstand und Treffern
- Suchtreffer in IndexedDB mit automatischer Migration aus Version 0.3.1
- automatische Wiederholung vorübergehender Arbeitspaketfehler
