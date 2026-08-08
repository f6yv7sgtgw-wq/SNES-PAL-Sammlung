# Kleinanzeigen-Suche

## Ablauf

1. Beim Start wird aus allen nicht vorhandenen Katalogtiteln eine feste
   Suchwarteschlange erzeugt.
2. Jeder Titel wird einzeln mit `source: "kleinanzeigen"` abgefragt.
3. Alle vom Parser gelieferten Folgeseiten werden verarbeitet; es gibt keine
   feste Trefferobergrenze in der Oberfläche.
4. Ein sanfter Stopp beendet den Lauf nach dem aktuellen Arbeitspaket. Der
   bestätigte Stand lässt sich nach Stopp, Fehler oder Browser-Neustart
   fortsetzen.
5. Doppelte Anzeigen werden über ihre Kleinanzeigen-ID zusammengeführt.
6. Zeichen mit Routenbedeutung werden nur für die Parserabfrage neutralisiert.
   So wird `Ranma 1/2` als `SNES Ranma 1 2` gesucht, die Trefferzuordnung nutzt
   aber weiterhin den vollständigen Katalogtitel.

## Versandfilter

Reine Abholangebote werden entfernt. Erkannte Versandkosten werden zum Preis
addiert. Ist Versand möglich, aber der Preis offen, oder enthält der
Beschreibungsanriss keinen Versandhinweis, wird die Ampel auf Basis des
Angebotspreises vor Versand berechnet. Die Karte trägt dann deutlich den
Hinweis **Versand offen**.

## Einzelspiele und Konvolute

Für Einzelangebote wird der längste eindeutig erkannte Katalogtitel verwendet.
Dadurch werden beispielsweise `Final Fight` und `Final Fight 2` nicht
versehentlich gemeinsam bewertet. Für echte Konvolute können getrennte
Titelvorkommen beide Spiele erkennen.

Bei Konvoluten ist der Richtwert die Summe aller eindeutig erkannten Spiele im
jeweils erkannten Zustand. Nennt die Anzeige mehr Spiele als erkannt wurden,
ist der Inhalt abgeschnitten oder bleibt die Zuordnung unsicher, wird das
Angebot neutral als **Unklar** markiert und nicht künstlich günstig gerechnet.

## Ampel

- **Grün:** günstiger oder bis einschließlich 10 Prozent über dem Richtwert
- **Gelb:** 11 bis einschließlich 25 Prozent über dem Richtwert
- **Orange:** 26 bis einschließlich 40 Prozent über dem Richtwert
- **Rot:** ab gerundeten 41 Prozent über dem Richtwert oder fachlich unpassend
- **Unklar:** Preis, Titelzuordnung oder Konvolutinhalt nicht belastbar bewertbar

Repros, Defekte, Gesuche und reine Verpackungs-/Anleitungsangebote sind rot.
Ein nicht eindeutig genannter Zustand nutzt konservativ den Modul-Richtwert;
die Annahme wird in der Trefferkarte angezeigt.

## Technische Grenze

Der GenericParser liefert den Beschreibungsanriss der Kleinanzeigen-
Ergebnisseite. Die SNES-Anwendung greift nicht direkt auf Detailseiten zu.
Deshalb bleibt jede möglicherweise unvollständige Konvolutbewertung unklar und
muss in der verlinkten Anzeige bestätigt werden.
