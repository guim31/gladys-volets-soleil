# Volets & Soleil — Sonne und Rollläden

Für jede Fassade deines Hauses zeigt diese Integration, ob die Sonne darauf scheint und **wie weit du die
Rollläden schließen solltest**, damit das Haus im Sommer kühl bleibt oder im Winter die Sonne hereinlässt. Alles
wird lokal aus dem Sonnenstand berechnet: kein Konto, kein Internet, keine API.

Die Integration bewegt nie selbst einen Rollladen: Das machen deine Szenen, mit den Werten, die sie
veröffentlicht.

_Ohne an ein Test-Gladys angeschlossene Rollläden entwickelt: Rückmeldungen im Forum sind willkommen._

## Was du bekommst

Ein Gerät pro Fassade, mit:

- **Sonne auf der Fassade** (ja / nein): Die Sonne steht über der Schwelle und vor der Wand;
- **Empfohlene Schließung** (0-100 %), unten erklärt;
- **Direkte Sonneneinstrahlung** (0-100 %): der Anteil der Sonnenkraft, der die Wand trifft, `100 × cos θ`,
  unabhängig von der Jahreszeit;
- **Einfallswinkel der Sonne** (°): 0°, wenn die Sonne der Wand gegenübersteht, 90° bei streifendem Licht oder
  wenn die Sonne nicht auf der Fassade ist;
- **Nächste Ankunft der Sonne** und **Nächster Abgang der Sonne**, in Ortszeit (`14:32`, `morgen 07:12`), über
  die nächsten 48 Stunden.

Alles wird jede Minute neu berechnet; nur geänderte Werte werden an Gladys gesendet.

**Die empfohlene Schließung.** Mit θ dem Winkel zwischen den Sonnenstrahlen und der Fassade und `h` der
Sonnenhöhe:

`Schließung = 100 × cos θ × min(1, h / 15°)`, auf 10 % gerundet.

Eine Westfassade um 19 Uhr im Juli (Sonne tief und frontal) bekommt 90 %; eine Südfassade mittags (Sonne hoch,
Strahlen fast parallel zur Wand) 40 %; der zweite Faktor dämpft die ersten Minuten einer tiefen, noch schwachen
Sonne. **Im Winter ist die Empfehlung immer 0 %**: offen, damit die Sonne das Haus wärmt. Die 10-%-Stufen
verhindern, dass sich die Rollläden jede Minute bewegen.

## Konfiguration

- **Standort**: die Koordinaten deines Hauses in Gladys (**Einstellungen → Häuser**). Die Integration bittet bei
  der Installation um die Erlaubnis, sie zu lesen. Ohne sie zeigt sie einen Fehler und prüft alle 10 Minuten
  erneut.
- **Sprache der Namen und Texte**: die Sprache der Gerätenamen und der an Gladys gesendeten Texte.
- **Jahreszeit**: _Automatisch (Monate)_ folgt den gewählten Sommermonaten (ein Bereich über den Jahreswechsel
  funktioniert, für die Südhalbkugel); _Immer Sommer_ oder _Immer Winter_. Die Integration kann dein Thermometer
  nicht selbst lesen: Um der Außentemperatur zu folgen, nutze die Szenenaktion **Jahreszeit erzwingen** (siehe
  unten).
- **Mindesthöhe der Sonne**: Unter dieser Höhe über dem Horizont wird die Sonne ignoriert (standardmäßig 5°).
- **Fassaden 1 bis 6**: Trage die **Ausrichtung** jeder Fassade ein, die Richtung, in die ihre Fenster blicken:
  Grad ab Norden im Uhrzeigersinn (90 = Ost, 180 = Süd, 270 = West) oder eine Himmelsrichtung in englischen
  Buchstaben (N, NE, E, SE, S, SW, W, NW sowie NNE, ENE…). Achtung: `O` wird als Westen gelesen (französisch und
  spanisch), für Osten also `E` oder 90 eingeben. Eine leere Ausrichtung ignoriert den Platz. Optional:
  - **Name**: der Gerätename (sonst „Fassade S“);
  - **Sichtfeld**: 180° für eine flache Wand, weniger, wenn tiefe Fensterlaibungen oder Seitenwände die Sonne
    früher verdecken;
  - **Horizontmaske**: die Höhe, die ein Hügel, ein Gebäude oder ein Balkon vor der Fassade verdeckt.

Tipp: Eine Kartenanwendung zeigt die Ausrichtung deiner Wände; eine Süd-Südwest-Fassade hat etwa 200°.

## Aktionen

- **Empfehlung jetzt anzeigen**: die geltende Jahreszeit und die Empfehlung jeder Fassade, um die Ausrichtungen
  zu prüfen.

## Szenen

**Auslöser „Sonne erreicht eine Fassade“**: Wähle die Fassade und den Zeitpunkt: bei Ankunft, 15 Min., 30 Min.
oder 1 Stunde vorher. Variablen: die Fassade, die Ankunftszeit, die Minuten vor Ankunft, die **höchste
empfohlene Schließung** der kommenden Sonnenperiode und die Jahreszeit (`summer` oder `winter`).

Beispiele:

- _Wohnzimmer-Rollläden vor der Sonne senken_: Auslöser „Sonne erreicht eine Fassade“, Wohnzimmer, 30 Min.
  vorher → Bedingung: Die Variable Jahreszeit ist `summer` → Rollladenposition setzen.
- _Weiter schließen, wenn sie stark brennt_: Auslöser auf die **Empfohlene Schließung** des Fassadengeräts über
  70 % → Rollladenposition auf 30 % setzen (in Gladys zählt die Position eines Rollladens die Öffnung).
- _Wieder öffnen, wenn die Sonne geht_: Auslöser auf **Sonne auf der Fassade**, die auf „nein“ wechselt →
  Rollläden öffnen.

**Aktion „Jahreszeit erzwingen“**: Sommer, Winter oder zurück zur Konfiguration. Zum Beispiel eine Szene „jeden
Tag um 10 Uhr, wenn die Außentemperatur über 25 °C liegt → Jahreszeit erzwingen: Sommer“. Die Wahl bleibt nach
einem Neustart erhalten. Ausgabe: die geltende Jahreszeit.

## Dashboard

Das Widget **Sonne auf den Fassaden** listet jede Fassade mit ihrer empfohlenen Schließung und der nächsten
Sonnenzeit, die geltende Jahreszeit und drei Tasten, um die Jahreszeit zu erzwingen (die aktive trägt ein
Häkchen). Seine Einstellungen blenden die Jahreszeit-Zeile oder die Tasten aus.

## Grenzen und Fehlerbehebung

- „Kein Hausstandort“: Trage die Koordinaten des Hauses unter **Einstellungen → Häuser** ein; das erste Haus mit
  Koordinaten wird verwendet.
- „Unlesbare Fassadenausrichtung“: Korrigiere die Ausrichtung der in der Meldung genannten Plätze (Grad oder
  Himmelsrichtungen).
- Das Modell ist geometrisch: keine Wolken, kein Wetter. Bäume und Nachbarn werden durch die Mindesthöhe und die
  Horizontmaske angenähert.
- Die Zeiten folgen der Zeitzone von Gladys. Eine Sonnenperiode unter 5 Minuten kann übersehen werden.
- Protokolle: Der Container schreibt nur seinen Lebenszyklus; `LOG_LEVEL=debug` zeigt jede Berechnung.
