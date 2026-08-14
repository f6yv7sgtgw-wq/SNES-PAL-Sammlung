# SNES Collect 1.0.0

Version 1.0.0 macht aus Projekt SNES die fertige App **SNES Collect**: eine auf
dem iPhone installierbare PWA mit eigenem App-Icon und einer geglätteten,
verfeinerten Oberfläche. Die Sammlungs-, Katalog- und Suchlogik aus 0.3.5.3
bleibt unverändert; Sammlung, Kaufpreise und der Suchspeicher werden nicht
angetastet.

## Neuer Name und App-Icon

- Die App heißt jetzt **SNES Collect**. Der Name erscheint im Header, im
  Seitentitel, im iOS-Homescreen-Titel und im Web-App-Manifest.
- Neues App-Icon (SNES-Modul mit Checkliste und Fortschrittsring) in allen
  benötigten Größen: 180 px Apple-Touch-Icon, 192 px und 512 px
  Manifest-Icons, 512 px Maskable-Variante und 64 px Favicon.
- Das Markenzeichen im Header übernimmt die Bildsprache des Icons: dunkle
  Kachel mit Lila-Ring und den vier SNES-Tastenfarben.

## Installierbare PWA

- `manifest.webmanifest` mit `display: standalone`, Portrait-Ausrichtung,
  App-Farben (`#090a0f`) und Maskable-Icon — Chrome/Android und iOS ab 16.4
  bieten die Installation an.
- iOS-Metadaten für den Homescreen: `apple-mobile-web-app-capable`,
  schwarz-transluzente Statusleiste, `apple-touch-icon`; die bestehenden
  Safe-Area-Abstände greifen im Standalone-Modus.
- Service Worker `sw.js` nach dem Evercade-Next-1.6-Muster: **network-first**,
  der Cache (`snes-collect-1.0.0`) dient ausschließlich als Offline-Fallback.
  Updates erscheinen damit sofort nach einem Deploy, die App-Shell und zuletzt
  geladene Inhalte bleiben offline nutzbar. Alte Cache-Generationen werden bei
  der Aktivierung entfernt.
- Die Artefakt-Validierung des Pages-Builds prüft Manifest, Icons, Service
  Worker und Registrierung öffentlich nach.

## Geglättete Oberfläche (UI-1.0-Schicht)

Die additive Schicht `ui-v100.css` verfeinert die bestehende Optik, ohne
Layout-Härtungen aus 0.3.5.x zu verändern:

- einheitliche Kartenradien (16 px) und weichere Hover-/Fokus-Übergänge
- Tabs als gleichmäßige Pillen mit erhaltener Akzentlinie
- sanftes Druck-Feedback (Scale) auf allen Buttons
- Standalone-Feinheiten: kein vertikales Overscroll-Gummiband, dichterer
  Header-Hintergrund, unterer Safe-Area-Abstand
- `prefers-reduced-motion` deaktiviert sämtliche Übergänge und Animationen

## Technische Details

- `VERSION.json` ist die einzige Versionsquelle und beschreibt jetzt auch die
  PWA-Bestandteile.
- Neuer Regressionstest `tests/release-v100.test.mjs` pinnt Identität,
  Manifest, Icons, Service Worker und die weiterhin aktive Zubehörfilterung
  aus 0.3.5.3.
- Der IndexedDB-Suchspeicher (`snes-pal-sammlung-search-v0353`) und das
  Sammlungsschema v2 bleiben unverändert bestehen.
