# Projekt SNES 0.3.5.3

Version 0.3.5.3 ist ein Suchlogik-Hotfix für reine Zubehörangebote. Ausgangspunkt
war ein reales Suchergebnis **„Asterix – Spielanleitung – Super Nintendo SNES“**,
das in 0.3.5.2 fälschlich als **Modul + Anleitung** erkannt und gegen die Summe
aus Modul- und Anleitungsrichtwert bewertet wurde.

## Ursache

Die 0.3.5.2-Zustandserkennung wertete ein vorhandenes Anleitungssignal ohne
zusätzlichen Box-Hinweis bereits als `module_manual`. Dadurch konnte eine
Spielanleitung allein als Spiel plus Anleitung erscheinen, obwohl kein Modul
angeboten wurde.

## Neue Zubehörfilterung

Vor der Zustandsermittlung prüft 0.3.5.3 nun, ob tatsächlich ein Spiel/Modul
Bestandteil des Angebots ist.

Verworfen werden insbesondere:

- reine `Spielanleitung`-, `Anleitung`-, `Manual`- oder `Handbuch`-Angebote
- Formulierungen wie `Anleitung für das Spiel`
- `Leerbox`, `Leerverpackung`, `nur OVP`, `nur Box`
- Box-/Anleitungsangebote mit `ohne Spiel`, `ohne Modul`, `kein Modul`,
  `Modul nicht dabei` oder vergleichbaren Negationen
- Zubehör-only Parser-Metadaten, wenn der Angebotstext gleichzeitig klar macht,
  dass kein Spiel/Modul enthalten ist

Diese Treffer werden nicht rot bewertet, sondern als für die Spielsuche
irrelevant verworfen.

## Zustandslogik

Nach dem Zubehörfilter gilt:

| Angebot | verwendeter Richtwert |
| --- | --- |
| Modul | Modul |
| Modul + Anleitung | Modul + Anleitung |
| Modul + Box | Modul + Box |
| CIB | direkter CIB-Wert |
| Neu / Sealed | Neu-/Sealed-Wert |
| Zustand unklar | Modul als konservativer Fallback |

`Modul + Anleitung` setzt jetzt ein echtes Modul-/Spielsignal plus Anleitung
voraus. Für `Modul + Box` wird ebenfalls ein Spiel-/Modulsignal verlangt; eine
bloße OVP-Angabe reicht nicht. Ein ausdrückliches `CIB` bleibt eindeutig, ebenso
Sealed-/Versiegelt-Signale.

## Asterix-Regression

Die Tests verwenden die realen Richtwertrelationen aus dem gemeldeten Beispiel:

- Modul: 10,04 €
- Anleitung: 8,83 €
- Modul + Anleitung: 18,87 €
- Box: 28,05 €
- CIB: 35,32 €
- Neu / Sealed: 230,58 €

Geprüft wird unter anderem:

- `Asterix - Spielanleitung - Super Nintendo SNES` → verworfen
- `Asterix Anleitung für das Spiel` → verworfen
- `Asterix SNES PAL Modul mit Anleitung` → Modul + Anleitung, 18,87 €
- `Asterix mit OVP und Anleitung ... SNES Spiel` → CIB, 35,32 €
- `Asterix SNES Leerbox OVP ohne Spiel` → verworfen
- `Asterix - Super Nintendo / SNES` → Unklar, Modul-Richtwert 10,04 €

## Suchcache

0.3.5.3 verwendet einen neuen IndexedDB-Suchspeicher
`snes-pal-sammlung-search-v0353`. Dadurch werden alte 0.3.5.2-Treffer mit
möglichen Zubehör-Fehlklassifizierungen nicht weiter angezeigt. Die Sammlung
und ihre Kaufpreise bleiben unverändert.

## Deployment-Gate

Der Pages-Build prüft zusätzlich, dass das veröffentlichte Artefakt tatsächlich
Version 0.3.5.3, den neuen Suchcache sowie die Zubehörfilter-Logik enthält.
