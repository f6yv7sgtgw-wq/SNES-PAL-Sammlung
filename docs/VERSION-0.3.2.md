# SNES PAL Sammlung 0.3.2

Version 0.3.2 erweitert den lokalen Suchspeicher und macht den Vollsuchlauf
gegen vorübergehende Worker- und Netzwerkfehler widerstandsfähig.

## Erweiterter Suchspeicher

Version 0.3.1 speicherte den vollständigen Suchstand als einen
`localStorage`-Eintrag. Auf iPhone und Safari wurde dadurch bei einem großen
Lauf die kleine Speichergrenze erreicht. Version 0.3.2 trennt deshalb Status
und Angebote in IndexedDB:

- jeder Treffer wird einmal unter seiner Kleinanzeigen-ID gespeichert
- erneute Funde aktualisieren denselben Datensatz
- Fortschritt und nächster Fortsetzungspunkt liegen getrennt von den Treffern
- vorhandene Daten aus Version 0.3.1 werden automatisch übernommen
- der alte Stand wird erst nach erfolgreicher Migration entfernt
- ein Speicherfehler beendet den laufenden Suchvorgang nicht

Die Oberfläche zeigt an, ob der erweiterte Suchspeicher aktiv ist und – soweit
vom Browser bereitgestellt – die belegte und maximale Kapazität.

## Wiederholung bei `Load failed`

`Zelda Link to the Past: Load failed` war kein ungültiger Suchbegriff. Ein
direkter Kontrollaufruf derselben Abfrage gegen GenericParser 1.2.2 lieferte
regulär Treffer. `Load failed` kennzeichnet in Safari eine Anfrage ohne
auswertbare HTTP-Antwort.

Für Netzwerkabbrüche, Zeitüberschreitungen, HTTP 408/425/429 und Serverfehler
ab HTTP 500 wiederholt die Anwendung dasselbe Arbeitspaket nun automatisch
zweimal. Alle drei Versuche verwenden unverändert Spiel und Ergebnisseite.
Bleibt der Fehler bestehen, pausiert der Lauf an genau diesem Paket; **Suche
fortsetzen** probiert es erneut. Vertrags- oder Fremdquellenfehler werden nicht
wiederholt.

## Verifikation

- automatischer Erfolg nach einmaligem Safari-Fehler `Load failed`
- Abbruch erst nach drei vorübergehenden Fehlern
- keine Wiederholung bei Vertrags- oder Fremdquellenfehlern
- Live-Smoke-Test für `SNES Zelda Link to the Past` gegen GenericParser 1.2.2
- automatische Migration des Version-0.3.1-Datenformats
- Produktions- und GitHub-Pages-Build
