# SNES PAL Sammlung 0.3

Version 0.3 ergänzt den Sammlungsmanager um den dritten Hauptbereich **Suche**.

## Suchumfang

- ausschließlich Kleinanzeigen über den GenericParser-Vertrag `generic-parser-module-v1`
- kompatible Route `/api/search`, weil sie den für Konvolute benötigten Beschreibungsanriss liefert
- `source: "kleinanzeigen"` in jedem Suchpaket
- deutschlandweit ohne Orts- oder Radiusbegrenzung
- reine Abholangebote werden entfernt
- keine Vinted-, eBay- oder Händlerdaten
- sequenzielle Suche aller aktuell fehlenden Spiele
- vollständige Parser-Pagination ohne feste Ergebnisobergrenze
- sanfter Stopp nach dem laufenden Arbeitspaket
- lokales Fortsetzen nach Stopp, Fehler oder Browser-Neustart

## Angebotsprüfung

- Titel und vom Parser gelieferter Beschreibungsanriss werden gemeinsam geprüft
- Repros, Defekte, Gesuche und reine Verpackungs-/Anleitungsangebote werden rot
- Versandmöglichkeit und erkennbare Versandkosten fließen in den Gesamtpreis ein
- der Zustand wählt den Richtwert für Modul, OVP/CIB oder Neu/Sealed
- Konvolute werden in erkannte Katalogtitel zerlegt
- die längste eindeutige Titelfundstelle verhindert Doppelzählungen von Basis- und Fortsetzungstiteln
- der Konvolut-Richtwert ist die Summe aller erkannten Spiele
- eine genannte Spielanzahl muss vollständig erkannt sein, bevor ein Konvolut grün werden kann
- vorhandene und fehlende Spiele eines Konvoluts werden getrennt dargestellt
- möglicherweise gekürzte oder unklare Inhalte werden gelb markiert

## Ampel

- **Grün:** mindestens 10 Euro oder 20 Prozent unter dem Richtwert
- **Gelb:** unklar oder bis einschließlich 10 Euro über dem Richtwert
- **Rot:** mehr als 10 Euro über dem Richtwert oder fachlich unpassend

Unbekannte Versandkosten, unbekannte Zustände, Platzhalterpreise und unklare
Konvolute werden nicht künstlich günstig gerechnet.

## Daten und Betrieb

Sammlung, Suchfortschritt und Treffer bleiben lokal im Browser. Die Suche ist
kein Hintergrundjob: Die Seite muss während des Laufs geöffnet bleiben. Eine
Unterbrechung verliert den bestätigten Fortschritt nicht.

## Verifikation

- 11 Logiktests für Ampel, Versand, Ausschlüsse und Konvolute
- vollständiger 530-Titel-Regressionslauf gegen falsche Mehrfachzuordnungen
- Produktionsbuild und gerenderter HTML-Test
- separater GitHub-Pages-Build
- ESLint-Prüfung
