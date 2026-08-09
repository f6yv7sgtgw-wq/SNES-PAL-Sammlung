# Datenquellen und Preisstand

## Katalog

Der Katalog umfasst 530 europäische SNES-PAL-Spiele. Die Ausgangsdaten und
Cover wurden aus dem Konsolenguide vom 5. Juli 2020 übernommen.

## Marktpreise

Die sichtbaren Richtwerte stammen aus dem PAL-SNES-Preisführer von
PriceCharting. Die in US-Dollar geführten Werte wurden mit dem Tageskurs der
Europäischen Zentralbank vom 28. Juli 2026 in Euro umgerechnet.

- 530 von 530 Spielen geprüft
- 2.647 von 2.650 Zustandswerten aktualisiert
- 3 nicht verfügbare Werte werden als `–` dargestellt

Die ursprünglichen Guide-Werte bleiben im Datensatz unter `guidePrices`
erhalten. Marktpreise sind Richtwerte; Zustand, Vollständigkeit, Sprachfassung
und regionale Verpackung können den tatsächlichen Verkaufspreis beeinflussen.

## Persönlicher Ausgangsbestand

Version 0.3.4 enthält den aus `SNES_GAMES.xlsx` übernommenen Ausgangsbestand
direkt in `app/initial-collection.ts`.

- 118 Katalogspiele
- 120 Exemplare
- 2.042,00 € Kaufpreise aus Spalte C
- Spalte D steuert die Komponenten:
  - `CIB` = Modul + Box + Anleitung und vollständiges CIB
  - `Anleitung` = Modul + Anleitung
  - `OVP ohne Anleitung` = Modul + Box
  - `CIB (ohne Inlay)` = alle drei Kernkomponenten, aber nicht als vollständiges CIB
  - `x2` = Anzahl 2
- freie Zusatzangaben bleiben als Notiz erhalten

`Super Game Boy` ist Hardware/Zubehör und deshalb kein Eintrag im
530-Spiele-Katalog. Es wird als nicht zugeordnete Excel-Zeile dokumentiert,
aber nicht als Spiel in den Katalog eingefügt.

## Kleinanzeigen

Version 0.3 bezieht Live-Angebote ausschließlich über den öffentlichen
GenericParser-Worker. Jeder Suchrequest setzt `source: "kleinanzeigen"` und den
Vertrag `generic-parser-module-v1`. Vinted, eBay und Händlerquellen werden nicht
angefragt und fremde Quellenantworten führen zum Abbruch des Suchpakets.

Ausgewertet werden Titel, Preis, Versandhinweise und der vom Parser gelieferte
Beschreibungsanriss. Die Anwendung ruft keine Kleinanzeigen-Detailseiten selbst
ab. Unvollständige Konvoluttexte bleiben deshalb **Unklar**. Offene
Versandkosten und angenommene Zustände werden sichtbar gekennzeichnet; die
Preisfarbe bleibt dabei eine reine Abweichung vom verfügbaren Richtwert.
