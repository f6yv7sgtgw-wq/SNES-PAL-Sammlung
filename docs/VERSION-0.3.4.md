# SNES PAL Sammlung 0.3.4

Version 0.3.4 erweitert den Sammlungsmanager um ein komponentenbasiertes
Besitzmodell und integriert den vom Nutzer gepflegten Excel-Bestand direkt in
die Anwendung.

## Änderungen

- neues Sammlungsschema Version 2
- Modul, Box und Anleitung werden getrennt gespeichert
- zusätzlicher CIB-Status (`completeInBox`)
- zusätzlicher Sealed-Status
- Anzahl pro Sammlungseintrag
- Kaufpreis bleibt als Gesamt-Kaufpreis des Eintrags erhalten
- alte Version-1-Daten werden automatisch migriert
- Excel-Ausgangsbestand wird beim ersten Start von 0.3.4 eingebaut
- vorhandene lokale Einträge überschreiben bei der Einmalmigration die
  Excel-Ausgangswerte
- bewusste spätere Löschungen bleiben erhalten, weil Version 2 danach nicht
  erneut automatisch mit dem Ausgangsbestand vermischt wird

## Richtwertlogik

| Bestand | Bewertung |
| --- | --- |
| CIB | CIB-Richtwert |
| Neu / Sealed | Neu-/Sealed-Richtwert |
| Modul | Modul-Richtwert |
| Modul + Anleitung | Modul + Anleitung |
| Modul + Box | Modul + Box |
| Modul + Box + Anleitung, aber nicht CIB | Modul + Box + Anleitung |
| mehrere Exemplare | berechneter Richtwert × Anzahl |

Die Komponentenwerte werden nur summiert, wenn alle für den gewählten Bestand
benötigten Werte vorhanden sind.

## Integrierte Excel-Sammlung

Quelle: `SNES_GAMES.xlsx`

- 118 Titel konnten dem 530-Spiele-Katalog eindeutig zugeordnet werden
- 120 Exemplare durch zwei `x2`-Einträge
- 2.042,00 € übernommene Kaufpreise
- 17 Einträge mit Anleitung
- 15 Einträge mit Box
- 12 explizite vollständige CIB-Einträge
- `CIB (ohne Inlay)` wird nicht als vollständiges CIB markiert, die vorhandenen
  Komponenten bleiben aber erfasst
- `OVP ohne Anleitung` wird als Modul + Box abgebildet
- `Anleitung, Maus, Mauspad` wird als Modul + Anleitung abgebildet und die
  Zubehörinformation bleibt in der Notiz erhalten
- `Super Game Boy` wird als Hardware/Zubehör nicht in den 530-Spiele-Katalog
  aufgenommen

## Tests

Neue Modelltests prüfen:

- CIB nutzt den CIB-Richtwert und nicht die Summe der Einzelteile
- Modul + Anleitung addiert beide Einzelrichtwerte
- unvollständige CIB-Konstellationen verwenden Komponentenwerte
- Mengen werden beim Richtwert berücksichtigt
- Version-1-Zustände werden korrekt migriert
- Excel-Bestand, Kaufpreissumme und exemplarische Zuordnungen bleiben konsistent
