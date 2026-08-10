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
5. Vorübergehende Netzwerk-, Timeout-, Drosselungs- und Serverfehler werden
   für dasselbe Arbeitspaket automatisch zweimal wiederholt. Nach drei
   Fehlschlägen bleibt der Fortsetzungspunkt unverändert gespeichert.
6. Doppelte Anzeigen werden über ihre Kleinanzeigen-ID zusammengeführt.
7. Zeichen mit Routenbedeutung werden nur für die Parserabfrage neutralisiert.
   So wird `Ranma 1/2` als `SNES Ranma 1 2` gesucht, die Trefferzuordnung nutzt
   aber weiterhin den vollständigen Katalogtitel.

## Versandfilter

Reine Abholangebote werden entfernt. Erkannte Versandkosten werden zum Preis
addiert. Ist Versand möglich, aber der Preis offen, oder enthält der
Beschreibungsanriss keinen Versandhinweis, wird die Ampel auf Basis des
Angebotspreises vor Versand berechnet. Die Karte trägt dann deutlich den
Hinweis **Versand offen**.

## Spielbestand und Zubehörfilter

Vor dem Preisvergleich wird geprüft, ob tatsächlich ein Spiel oder Modul
angeboten wird. Reine Zubehörtreffer gehören nicht in die Kaufsuche nach
fehlenden Spielen und werden seit Version 0.3.5.3 vollständig verworfen.

Verworfen werden insbesondere:

- reine `Spielanleitung`-, `Anleitung`-, `Manual`- und `Handbuch`-Angebote
- Formulierungen wie `Anleitung für das Spiel`
- `Leerbox`, `Leerverpackung`, `nur OVP`, `nur Box`
- Box-/Anleitungsangebote mit `ohne Spiel`, `ohne Modul`, `kein Modul`,
  `Modul nicht dabei`, `Spiel fehlt` oder vergleichbaren Negationen

Ein vorhandenes Wort wie `Anleitung` reicht also nicht mehr aus, um automatisch
`Modul + Anleitung` anzunehmen. Ebenso reicht `OVP` allein nicht für CIB oder
`Modul + Box`.

## Zustandsabhängiger Richtwert

Nach dem Zubehörfilter wird der Lieferumfang ermittelt und genau der dazu
passende Richtwert verwendet:

- **Modul** → Modul-Richtwert
- **Modul + Anleitung** → Modul-Richtwert + Anleitungs-Richtwert
- **Modul + Box** → Modul-Richtwert + Box-Richtwert
- **CIB** → direkter CIB-Richtwert
- **Neu / Sealed** → direkter Neu-/Sealed-Richtwert
- **Zustand unklar** → konservativ Modul-Richtwert

`Modul + Anleitung` setzt ein tatsächliches Modul-/Spielsignal plus Anleitung
voraus. `Modul + Box` setzt ebenfalls ein Spiel-/Modulsignal voraus; bei
`ohne Anleitung` muss aus dem Angebot weiterhin hervorgehen, dass das Spiel
selbst enthalten ist. Ein explizites `CIB`- oder Sealed-Signal bleibt eindeutig.

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

Repros, Defekte und Gesuche bleiben unpassende rote Treffer. Reine
Verpackungs-/Anleitungsangebote werden dagegen seit 0.3.5.3 bereits vor der
Ampelbewertung aus der Spielsuche entfernt. Ein nicht eindeutig genannter
**Zustand** nutzt konservativ den Modul-Richtwert; die Annahme wird in der
Trefferkarte angezeigt.

## Sortierung der Ergebnisse

Die Hauptreihenfolge ist fest und wird von keiner Sortierung verändert:
**Grün → Gelb → Orange → Rot → Unklar**. Innerhalb jeder Farbgruppe können die
Angebote auf- oder absteigend nach Angebotspreis, Richtwert, Differenz in Euro,
Differenz in Prozent oder Spieltitel sortiert werden. Nicht verfügbare Werte
stehen innerhalb ihrer Gruppe immer am Ende.

Standard ist **Differenz in Prozent · niedrig zuerst**, sodass innerhalb jeder
Farbe das relativ günstigste Angebot zuerst erscheint. Die gewählte Sortierung
und Richtung werden als kleine Browserpräferenz gespeichert; Suchergebnisse und
Suchfortschritt bleiben davon unberührt.

## Technische Grenze

Der GenericParser liefert den Beschreibungsanriss der Kleinanzeigen-
Ergebnisseite. Die SNES-Anwendung greift nicht direkt auf Detailseiten zu.
Deshalb bleibt jede möglicherweise unvollständige Konvolutbewertung unklar und
muss in der verlinkten Anzeige bestätigt werden.

## Lokale Speicherung

Suchstatus und Angebote liegen getrennt in IndexedDB. Dadurch gilt nicht mehr
die kleine `localStorage`-Grenze, die bei großen Vollsuchläufen erreicht wurde.
Beim ersten Start von Version 0.3.2 wurde der letzte lesbare Stand aus Version
0.3.1 automatisch übernommen und erst nach erfolgreicher Migration entfernt.
Jede Kleinanzeigen-ID belegt genau einen Datensatz; erneute Funde aktualisieren
diesen Datensatz. Die konkrete Obergrenze verwaltet weiterhin der Browser. Die
Oberfläche zeigt deshalb die vom Browser gemeldete Nutzung und Kapazität an.

Da 0.3.5.3 die Zubehör- und Zustandslogik fachlich ändert, verwendet diese
Version einen neuen Suchspeicher `snes-pal-sammlung-search-v0353`. Alte Treffer
werden damit nicht mit veralteter Klassifizierung weiter angezeigt. Die
Sammlungsdaten liegen davon getrennt und bleiben unverändert.
