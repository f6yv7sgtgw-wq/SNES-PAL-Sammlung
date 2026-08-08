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

## Versandfilter

Reine Abholangebote werden entfernt. Ist Versand erkennbar, aber der Preis
offen, oder enthält der Beschreibungsanriss gar keinen Versandhinweis, bleibt
das Angebot zur manuellen Prüfung gelb. Ein Angebot mit offenen Gesamtkosten
kann niemals grün werden.

## Einzelspiele und Konvolute

Für Einzelangebote wird der längste eindeutig erkannte Katalogtitel verwendet.
Dadurch werden beispielsweise `Final Fight` und `Final Fight 2` nicht
versehentlich gemeinsam bewertet. Für echte Konvolute können getrennte
Titelvorkommen beide Spiele erkennen.

Bei Konvoluten ist der Richtwert die Summe aller eindeutig erkannten Spiele im
jeweils erkannten Zustand. Nennt die Anzeige mehr Spiele als erkannt wurden,
ist der Inhalt abgeschnitten oder bleibt die Zuordnung unsicher, wird das
Angebot gelb und nicht künstlich günstig gerechnet.

## Ampel

- **Grün:** mindestens 10 Euro oder 20 Prozent unter dem Richtwert
- **Gelb:** unklar oder bis einschließlich 10 Euro über dem Richtwert
- **Rot:** mehr als 10 Euro über dem Richtwert oder fachlich unpassend

Repros, Defekte, Gesuche und reine Verpackungs-/Anleitungsangebote sind rot.
Erkannte Versandkosten werden zum Angebotspreis addiert.

## Technische Grenze

Der GenericParser liefert den Beschreibungsanriss der Kleinanzeigen-
Ergebnisseite. Die SNES-Anwendung greift nicht direkt auf Detailseiten zu.
Deshalb bleibt jede möglicherweise unvollständige Konvolutbewertung gelb und
muss in der verlinkten Anzeige bestätigt werden.
