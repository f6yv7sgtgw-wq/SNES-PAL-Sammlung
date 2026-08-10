# Projekt SNES 0.3.5

Version 0.3.5 ist ein mobiles GUI-Rework. Die fachliche Sammlungs-, Preis- und
Suchlogik aus 0.3.4 bleibt erhalten; geändert werden Darstellung, mobile
Robustheit und die Dichte der Suchergebnis-Karten.

## Mobile Darstellung

- horizontales Überlaufen wird für die gesamte Oberfläche verhindert
- Grid- und Flex-Kinder in Statistik-, Sammlungs-, Katalog-, Such- und
  Dialogbereichen dürfen auf kleinen Displays sauber schrumpfen
- große numerische Werte verwenden responsive Schriftgrößen
- der finanzielle Überblick stapelt Beschriftung und Betrag auf schmalen
  Displays, statt den Betrag aus der Karte laufen zu lassen
- Zustands-, Preis-, Richtwert-, Suchstatistik- und Vergleichskarten erhalten
  dieselben Shrink-/Wrap-Regeln
- bei sehr schmalen Displays wechseln Statistik- und Zustandsraster notfalls auf
  eine Spalte
- Formulare, Badges, Überschriften und Aktionsbereiche dürfen keine horizontale
  Seitenbreite erzwingen

## Suchergebnis-Karten

Die Darstellung orientiert sich am kompakten Kartenmuster von GenericParser
1.5.0:

- kleines quadratisches Vorschaubild und Inhalt dauerhaft nebeneinander
- 92 × 92 Pixel als Desktop-Basis, auf Telefonen abgestuft bis 70 × 70 bzw.
  64 × 64 Pixel
- Anzeigentext/Beschreibung wird nicht mehr dargestellt
- Angebotstitel bleibt sichtbar und wird auf zwei Zeilen begrenzt
- Ampel, Zustand, Einzelangebot/Konvolut, Preisvergleich, erkannte Spiele und
  Aktionen bleiben erhalten
- kompaktere Abstände, Badges und Vergleichsfelder
- responsive Ergebnisraster ohne horizontales Scrollen

## Versionsanzeige

Der Header zeigt weiterhin **Projekt SNES** und auf Desktop sowie Mobilgerät
sichtbar **v0.3.5**.

## Qualitätssicherung

Version 0.3.5 ergänzt einen eigenen UI-Vertragstest. Geprüft werden unter anderem:

- sichtbare 0.3.5-Identität
- horizontale Overflow-Sicherung
- mobile Finanzkarten
- kleine quadratische Suchbilder
- ausgeblendete Anzeigenbeschreibung
- Einbindung des 0.3.5-Stylesheets in den GitHub-Pages-Einstieg

Der GitHub-Pages-Build prüft zusätzlich das tatsächlich erzeugte Artefakt auf
0.3.5, den bestehenden Excel-Bootstrap und die responsive UI. Ein erfolgreicher
Deploy darf dadurch nicht mehr unbemerkt einen älteren Pages-Einstieg ausliefern.
