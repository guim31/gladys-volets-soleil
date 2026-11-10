# Volets & Soleil — sun and shutters for Gladys Assistant

An external integration for [Gladys Assistant](https://gladysassistant.com) that tells, for every facade of
your house, whether the sun shines on it and **how much to close the shutters**: shade in summer, let the sun
in during winter. The position of the sun is computed locally from the house location set in Gladys: no
account, no cloud, no network access.

_Developed without shutters connected to a test Gladys: feedback welcome._

## What it does

- **One device per facade** (up to six), described by its orientation (degrees or compass points), an optional
  field of view and horizon mask. Features: sun on the facade, advised closure (0-100 %), direct sunlight
  (0-100 %), sun incidence angle, next sun arrival and departure (local time).
- **Advised closure** = `100 × cos θ × min(1, elevation / 15°)`, rounded to 10 %, where θ is the angle between
  the sun's rays and the facade. Always 0 % in winter. The season follows the summer months you choose, or is
  fixed, or is forced by a scene (for example from your outdoor thermometer) or from the widget.
- **Scene trigger** "Sun reaches a facade", on arrival or 15, 30 or 60 minutes before, with the highest advised
  closure of the coming sunny period as a variable.
- **Scene action** "Force the season" (summer, winter, or back to the configuration).
- **Dashboard widget** "Sun on the facades": every facade at a glance, with buttons to force the season.
- The integration never moves a shutter itself: your scenes do.

Texts and documentation in English, French, German and Spanish: [en](docs/en.md), [fr](docs/fr.md),
[de](docs/de.md), [es](docs/es.md).

## Requirements

- Gladys Assistant **5.1.0** or later.
- The coordinates of your house in Gladys (**Settings → Houses**): the integration asks for the permission to
  read them (`location` in the manifest).

## Installation

In Gladys, open **Integrations → Install from GitHub** and enter the address of this repository:
`https://github.com/guim31/gladys-volets-soleil`. Then fill in the orientation of your facades in the
configuration screen, and add the discovered devices.

## Limits

- Geometric model only: no clouds, no weather. Trees and neighbours are approximated by a minimum elevation and
  a horizon mask per facade.
- The integration cannot read another Gladys device: to follow the outdoor temperature, a scene calls the
  "Force the season" action.
- The first house with coordinates is used. A sunny period shorter than 5 minutes may be missed.

## Development

```bash
npm install
npm run format:check
npm run lint
npm test
npx -y github:GladysAssistant/integration-store --skip-image-check .
```

The tests run against the SDK's fake Gladys (`@gladysassistant/integration-sdk/testing`) with an injected clock.
The solar position is checked against reference positions from astronomy-engine for Toulouse and Paris, at the
equinoxes, the solstices and the two clock changes of 2026 (`test/fixtures/sun-reference.json`).

Releases go through **Actions → Release** (see `CLAUDE.md`).

## Credits

- Solar position: the [NOAA solar calculator](https://gml.noaa.gov/grad/solcalc/) algorithm, after Jean Meeus,
  _Astronomical Algorithms_.
- Reference positions for the tests: [astronomy-engine](https://github.com/cosinekitty/astronomy) by Don Cross
  (MIT), used once to produce the fixture, not a dependency.
- Started from the official
  [integration template](https://github.com/GladysAssistant/integration-template-js).

## License

[Apache-2.0](LICENSE).
