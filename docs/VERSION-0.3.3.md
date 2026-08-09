# SNES PAL Sammlung 0.3.3

Version 0.3.3 ergänzt die Kleinanzeigen-Ergebnisse um eine frei wählbare
Sortierung innerhalb der bestehenden Ampelfarben.

## Feste Farbgruppen

Die Ergebnisliste bleibt immer in dieser Hauptreihenfolge:

1. Grün
2. Gelb
3. Orange
4. Rot
5. Unklar

Keine Sortierauswahl vermischt diese Gruppen. Auch ein sehr niedriger roter
Angebotspreis steht daher nicht vor einem grünen oder gelben Treffer.

## Sortierfelder

Innerhalb jeder Farbgruppe kann auf- oder absteigend sortiert werden nach:

- Angebotspreis
- Richtwert
- Differenz in Euro
- Differenz in Prozent
- Spieltitel

Die Eurodifferenz folgt dem auf der Trefferkarte sichtbaren Vorzeichen: Ein um
20 Euro günstigeres Angebot steht bei aufsteigender Sortierung vor einem um
5 Euro günstigeren Angebot. Fehlende Vergleichswerte stehen unabhängig von der
Sortierrichtung am Ende ihrer Farbgruppe.

Standardmäßig wird nach der prozentualen Differenz aufsteigend sortiert. Die
gewählte Kombination aus Feld und Richtung bleibt nach einem Neuladen erhalten.

## Verifikation

- feste Reihenfolge Grün, Gelb, Orange, Rot und Unklar
- auf- und absteigende Sortierung je Feld nur innerhalb der Farbgruppe
- korrekte Vorzeichenlogik der Eurodifferenz
- fehlende Werte am Gruppenende
- mobile Bedienung ohne horizontales Scrollen
