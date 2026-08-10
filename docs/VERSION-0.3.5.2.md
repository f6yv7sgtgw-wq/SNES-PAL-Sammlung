# Projekt SNES 0.3.5.2

Version 0.3.5.2 korrigiert die fachliche Zuordnung von Kleinanzeigen-Angeboten
zu den Online-Richtwerten. Die mobile Oberfläche aus 0.3.5/0.3.5.1 bleibt
unverändert.

## Zustandsabhängiger Richtwert

Vor der Ampelbewertung wird jetzt zuerst der angebotene Lieferumfang aus Titel,
Beschreibung und – sofern vorhanden – dem Zustandsfeld des GenericParser
erkannt.

| Erkannter Angebotszustand | Verwendeter Richtwert |
| --- | --- |
| Nur Modul | Modul |
| Modul + Anleitung | Modul + Anleitung |
| Modul + Box / OVP ohne Anleitung | Modul + Box |
| CIB / vollständig mit OVP und Anleitung | CIB |
| Neu / Sealed | Neu / Sealed |
| Zustand unklar | Modul |

Für Teilbestände werden die vorhandenen Einzelrichtwerte addiert. CIB und Sealed
verwenden dagegen weiterhin ihre dedizierten Marktwerte.

## Konservativer Fallback

Eine einzelne Angabe wie `OVP` ohne eindeutigen Hinweis auf eine vorhandene
Anleitung gilt nicht automatisch als CIB. Wenn der genaue Lieferumfang nicht
sicher erkennbar ist, zeigt die Suchkarte **Unklar · Modul-Richtwert** und der
Preis wird konservativ gegen den Modulwert verglichen.

Damit können lose oder unvollständig beschriebene Angebote nicht mehr durch
einen versehentlich verwendeten CIB- oder Sealed-Richtwert künstlich günstig
erscheinen.

## Suchspeicher

Bereits gespeicherte Treffer aus älteren Versionen können den damals berechneten
falschen Richtwert enthalten. 0.3.5.2 verwendet deshalb einen neu versionierten
IndexedDB-Suchspeicher. Beim ersten Start beginnt der Suchfortschritt einmalig
neu; die persönliche Sammlung und ihre Kaufpreise bleiben vollständig erhalten.

## Tests

Neue Tests prüfen ausdrücklich:

- Modul → Modul-Richtwert
- Modul + Anleitung → Summe aus Modul und Anleitung
- Modul + Box → Summe aus Modul und Box
- CIB → dedizierter CIB-Richtwert
- Sealed → Neu-/Sealed-Richtwert
- unklare bzw. reine OVP-Angabe → Modul-Richtwert
- neue Suchspeicher-Version für die geänderte Preissemanik
- 0.3.5.2 im Next- und GitHub-Pages-Build
