# SNES PAL Sammlung

Sammlungsmanager für SNES-PAL-Spiele.

## Projektstatus

- Aktuelle fachliche Version: **0.2**
- Bestehende Projektseite: https://snes-pal-sammlung.jnldc.chatgpt.site/
- GitHub-Pages-Ziel: https://f6yv7sgtgw-wq.github.io/SNES-PAL-Sammlung/
- GitHub Pages ist eingerichtet und veröffentlicht den Stand des Branches `main`.

## Funktionsumfang der bestehenden Version 0.2

- vollständiger PAL-Katalog mit **530 Spielen**
- Sammlungsverwaltung direkt im Browser
- lokale Datenspeicherung auf dem jeweiligen Gerät
- Import und Export zur Sicherung der Sammlung
- reduzierte Navigation mit den Bereichen **Sammlung** und **Katalog**
- keine Wünsche-, Deal- oder Preisalarm-Funktionen

## Preisdaten

Die ursprünglichen Richtwerte aus dem Konsolenguide wurden durch Online-Marktdaten ersetzt.

Dokumentierter Stand:

- 530 von 530 Spielen geprüft
- 2.647 von 2.650 Zustandswerten aktualisiert
- 3 nicht verfügbare Marktwerte werden als `–` geführt
- Marktquelle: PriceCharting, PAL SNES
- Währungsumrechnung: täglicher ECB-Wechselkurs vom 28.07.2026

## Wichtiger Hinweis zur Migration

Die aktuell im Repository vorhandene `index.html` ist eine ältere, vereinfachte Einzeldatei-Version und entspricht nicht vollständig der Oberfläche und dem Datenbestand der bestehenden Projektseite.

Die veröffentlichte Projektseite stellt keinen direkt abrufbaren Quellcode oder Build-Artefakt bereit. Daher darf sie nicht durch eine unvollständige Rekonstruktion ersetzt werden. Der vollständige 0.2-Build muss vor der endgültigen Umschaltung als Originaldateien übernommen werden.

Details stehen unter [`docs/MIGRATION.md`](docs/MIGRATION.md).

## Lokale Nutzung

Die aktuelle Repository-Version kann direkt als statische Seite geöffnet werden:

```text
index.html
```

Die Daten werden im Browser gespeichert. Ein Löschen der Browserdaten entfernt daher auch die lokale Sammlung, sofern sie vorher nicht exportiert wurde.

## Veröffentlichung

Der Workflow unter `.github/workflows/pages.yml` veröffentlicht den Inhalt von `main` über GitHub Pages.

## Repository

https://github.com/f6yv7sgtgw-wq/SNES-PAL-Sammlung
