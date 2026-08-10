# Projekt SNES 0.3.5.1

Version 0.3.5.1 ist ein gezielter Mobile-Hotfix für die Suchergebnis-Karten.
Die Sammlungs-, Preis-, Sortier- und Suchlogik bleibt unverändert.

## Ursache

Auf Telefonen übernahm der Aktionsbereich noch die ältere Regel
`flex-direction: column`. Gleichzeitig setzte 0.3.5 für die Aktionen einen
`flex-basis` von 120 Pixeln. In der vertikalen Richtung wurde dieser Wert zur
Button-Höhe. Dadurch entstanden die im mobilen Screenshot sichtbaren sehr hohen
Flächen für **Zur Sammlung** und **Anzeige öffnen**.

## Hotfix

- beide Aktionen werden auf Telefonen als kompaktes 2-Spalten-Raster dargestellt
- feste Aktionshöhe von 36 Pixeln; der alte vertikale 120-Pixel-Flex-Basis wirkt
  nicht mehr
- bei nur einer Aktion nutzt der Button die volle Kartenbreite
- Vorschaubild auf Telefonen 64 × 64 Pixel, auf sehr schmalen Geräten 58 × 58
- Preisvergleich bleibt in drei Spalten, sodass sechs Werte nur zwei Zeilen
  benötigen
- der letzte Vergleichswert spannt nicht mehr unnötig über die volle Kartenbreite
- Begründung wird mobil auf eine Zeile begrenzt
- Angebotsbeschreibung bleibt vollständig ausgeblendet
- Footer-Metadaten werden kompakt in einer Zeile zusammengefasst
- Titel bleibt auf zwei Zeilen begrenzt

## Qualitätssicherung

Der 0.3.5.1-Test prüft explizit:

- Versionsidentität `v0.3.5.1`
- Einbindung des Hotfix-Stylesheets in Next-App und GitHub-Pages-Einstieg
- 64-Pixel-Mobile-Thumbnail
- dreispaltigen Preisvergleich
- 36-Pixel-Aktionsbuttons ohne Flex-Basis
- weiterhin ausgeblendeten Anzeigentext
- einzeilige mobile Begründung

Das GitHub-Pages-Artefakt-Gate verlangt dieselben Hotfix-Merkmale, bevor der
Deploy erfolgreich markiert werden darf.
