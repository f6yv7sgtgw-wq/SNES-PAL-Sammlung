# SNES PAL Sammlung 0.3.1

Version 0.3.1 behebt den reproduzierbaren Abbruch des Vollsuchlaufs bei
`Ranma 1/2` und ersetzt die bisherige Euro-Ampel durch prozentuale Preisbänder.

## Fehlerursache und Fortsetzung

Der GenericParser 1.2.2 beantwortete die unveränderte Abfrage
`SNES Ranma 1/2` mit HTTP 500, weil der Schrägstrich in der internen Suchroute
als Pfadtrennzeichen verarbeitet wurde. Die Anwendung neutralisiert solche
Zeichen nun ausschließlich für die Abfrage (`SNES Ranma 1 2`). Die Auswertung
erfolgt weiterhin gegen den Originaltitel `Ranma 1/2`.

Der bestehende lokale Suchstand bleibt kompatibel. Nach dem Update kann der bei
59,1 Prozent unterbrochene Lauf mit **Suche fortsetzen** am gleichen Spiel und
auf der gleichen Ergebnisseite weiterlaufen.

## Neue Preisampel

- **Grün:** günstiger oder bis einschließlich 10 Prozent über Richtwert
- **Gelb:** 11 bis einschließlich 25 Prozent über Richtwert
- **Orange:** 26 bis einschließlich 40 Prozent über Richtwert
- **Rot:** ab gerundeten 41 Prozent über Richtwert oder fachlich unpassend
- **Unklar:** Preis, Titelzuordnung oder Konvolutinhalt nicht bewertbar

Erkannte Versandkosten werden weiterhin addiert. Sind sie offen, wird die
Abweichung auf Basis des Angebotspreises vor Versand berechnet und sichtbar als
vorläufig gekennzeichnet. Ein unbekannter Zustand verwendet konservativ den
Modul-Richtwert. Dadurch überschreiben technische Unsicherheiten nicht mehr
pauschal die eigentliche Preisabweichung mit Gelb.

Bereits lokal gespeicherte Ergebnisse werden beim Laden neu klassifiziert; ein
Neustart oder Löschen der bisherigen 1.690 Treffer ist nicht erforderlich.

## Verifikation

- routesicherer Suchtext für alle 530 Katalogtitel
- echter Parser-Smoke-Test für `Ranma 1/2` gegen GenericParser 1.2.2
- Grenztests für Grün, Gelb, Orange und Rot
- Regressionstests für Versand, Repros, Konvolute und Fortsetzungstitel
- Produktions- und GitHub-Pages-Build
