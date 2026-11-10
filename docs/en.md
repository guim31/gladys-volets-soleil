# Volets & Soleil — sun and shutters

For each facade of your house, this integration tells whether the sun shines on it and **how much to close
the shutters** to keep the house cool in summer, or to let the sun in during winter. Everything is computed
locally from the position of the sun: no account, no internet access, no API.

The integration never moves a shutter itself: your scenes do, with the values it publishes.

_Developed without shutters connected to a test Gladys: feedback welcome on the forum._

## What you get

One device per facade, with:

- **Sun on the facade** (yes / no): the sun is above the threshold and in front of the wall;
- **Advised closure** (0-100 %), detailed below;
- **Direct sunlight** (0-100 %): the share of the sun's strength hitting the wall, `100 × cos θ`, whatever the
  season;
- **Sun incidence angle** (°): 0° when the sun faces the wall, 90° for grazing light, or when the sun is not on
  the facade;
- **Next sun arrival** and **Next sun departure**, in local time (`14:32`, `tomorrow 07:12`), over the next 48
  hours.

Everything is recomputed every minute; only the values that change are sent to Gladys.

**The advised closure.** With θ the angle between the sun's rays and the facade, and `h` the sun elevation:

`closure = 100 × cos θ × min(1, h / 15°)`, rounded to the nearest 10 %.

A west facade at 7 pm in July (sun low and in front) gets 90 %; a south facade at noon (sun high, rays
nearly parallel to the wall) gets 40 %; the second factor softens the first minutes of a low, still weak sun.
**In winter, the advice is always 0 %**: open, to let the sun warm the house. Steps of 10 % avoid moving the
shutters every minute.

## Configuration

- **Location**: the coordinates of your house in Gladys (**Settings → Houses**). The integration asks for the
  permission to read them when installed. Without them, it shows an error and checks again every 10 minutes.
- **Language of names and texts**: the language of the device names and of the texts sent to Gladys.
- **Season**: _Automatic (months)_ uses the summer months below (a range that crosses the new year works, for
  the southern hemisphere); _Always summer_ or _Always winter_. The integration cannot read your thermometer
  itself: to follow the outdoor temperature, use the **Force the season** scene action (see below).
- **Minimum sun elevation**: below this height above the horizon, the sun is ignored (5° by default).
- **Facades 1 to 6**: fill in the **orientation** of each facade, the direction its windows look at: degrees
  from the north, clockwise (90 = east, 180 = south, 270 = west), or a compass point in English letters (N, NE,
  E, SE, S, SW, W, NW, and NNE, ENE…). `O` is read as west (French and Spanish). An empty orientation ignores
  the slot. Optional:
  - **Name**: the device name (otherwise "Facade S");
  - **Field of view**: 180° for a flat wall, less when deep window recesses or side walls hide the sun earlier;
  - **Horizon mask**: the elevation hidden by a hill, a building or a balcony in front of the facade.

Tip: a map application gives the orientation of your walls; a facade facing south-south-west is about 200°.

## Actions

- **Show the advice now**: the season in force and the advice of every facade, to check the orientations.

## Scenes

**Trigger "Sun reaches a facade"**: choose the facade and when: on arrival, 15 min, 30 min or 1 hour before.
Variables: the facade, the arrival time, the minutes before arrival, the **highest advised closure** of the
coming sunny period, and the season (`summer` or `winter`).

Examples:

- _Lower the living room shutters before the sun_: trigger "Sun reaches a facade", Living room, 30 min before →
  condition: the season variable is `summer` → set the shutter position.
- _Close more when it gets strong_: trigger on the **Advised closure** of the facade device above 70 % → set
  the shutter position to 30 % (in Gladys, a shutter position counts the opening).
- _Reopen when the sun leaves_: trigger on **Sun on the facade** going to "no" → open the shutters.

**Action "Force the season"**: summer, winter, or back to the configuration. For example a scene "every day at 10
am, if the outdoor temperature is above 25 °C → Force the season: summer". The choice is kept across restarts.
Output: the season in force.

## Dashboard

The **Sun on the facades** widget lists every facade with its advised closure and the next sun time, the season
in force, and three buttons to force the season (the active one shows a check mark). Its settings hide the season
line or the buttons.

## Limits and troubleshooting

- "No house location": set the coordinates of the house in **Settings → Houses**; the first house with
  coordinates is used.
- "Unreadable facade orientation": fix the orientation of the slots named in the message (degrees or compass
  points).
- The model is geometric: no clouds, no weather. Trees and neighbours are approximated by the minimum
  elevation and the horizon mask.
- Times are shown in the time zone of Gladys. A sunny period shorter than 5 minutes may be missed.
- Logs: the container logs only the lifecycle; set `LOG_LEVEL=debug` for every computation.
