# Migration der bestehenden SNES-Projektseite zu GitHub Pages

## Ziel

Die bestehende Seite unter

`https://snes-pal-sammlung.jnldc.chatgpt.site/`

soll vollständig und ohne funktionale oder optische Abweichungen unter GitHub Pages veröffentlicht werden.

## Festgestellter Unterschied

Die beiden derzeit erreichbaren Stände sind nicht identisch:

### Bestehende Projektseite

- weiterentwickelte Oberfläche
- vollständiger Katalog mit 530 PAL-Spielen
- Navigation mit Sammlung und Katalog
- aktualisierte Online-Marktpreise
- lokaler Sammlungsstand und Backup-Funktionen

### Aktueller Repository-Stand

- ältere vereinfachte `index.html`
- kein vollständiger vorinstallierter 530-Spiele-Katalog
- andere Oberfläche
- keine belegbare vollständige Übernahme des 0.2-Builds

## Ursache

Die bestehende `jnldc.chatgpt.site`-Veröffentlichung stellt über die verfügbare Schnittstelle weder den Originalquellcode noch ein vollständiges Build-Artefakt bereit. Die Website kann daher nicht verlustfrei aus dem veröffentlichten Ergebnis zurück in ihre ursprünglichen Projektdateien überführt werden.

## Bereits erledigt

- GitHub Pages für den Branch `main` eingerichtet
- automatischer Deployment-Workflow angelegt
- Unterschied zwischen Repository und bestehender Projektseite dokumentiert
- fachlicher Stand der Version 0.2 im Repository gesichert
- Daten- und Preisstatus dokumentiert

## Für die vollständige Übernahme benötigte Originalartefakte

Mindestens einer der folgenden Stände ist erforderlich:

1. ursprünglicher Projekt-/Build-Ordner der bestehenden Seite
2. ZIP-Export der veröffentlichten Version 0.2
3. vollständige HTML-, CSS-, JavaScript- und Datendateien
4. vollständiger Katalogexport mit allen 530 Spielen und Preisen

## Zielstruktur im Repository

```text
/
├── index.html
├── assets/
│   ├── css/
│   ├── js/
│   └── icons/
├── data/
│   └── snes-pal-catalog.json
├── docs/
│   ├── MIGRATION.md
│   ├── VERSION-0.2.md
│   └── DATA-SOURCES.md
├── README.md
└── .github/workflows/pages.yml
```

## Abnahmekriterien

Die Migration gilt erst dann als abgeschlossen, wenn:

- Oberfläche optisch der bestehenden Seite entspricht
- alle 530 Spiele vorhanden sind
- sämtliche Preisfelder übernommen wurden
- Sammlung und Katalog funktionieren
- Import und Export funktionieren
- bestehende lokale Daten nach Möglichkeit migriert werden können
- GitHub Pages denselben Stand wie die bisherige Projektseite ausliefert
- keine Wünsche-, Deal- oder Preisalarm-Menüpunkte erscheinen

## Veröffentlichungsstrategie

Der vorhandene GitHub-Pages-Workflow bleibt aktiv. Nach Übernahme des Originalbuilds reicht ein Commit auf `main`, damit der neue Stand automatisch veröffentlicht wird.
