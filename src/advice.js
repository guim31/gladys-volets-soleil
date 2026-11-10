// -----------------------------------------------------------------------------
// From the Sun's position to a shutter advice, for one facade. Pure functions:
// the date and the house location are always passed in.
//
// Geometry: a facade is a vertical wall whose outward normal points to its
// azimuth. The Sun shines on it when it is
//   - above the threshold: max(minimum elevation, the facade's horizon mask),
//   - and inside the facade's field of view: |sun azimuth - facade azimuth|
//     below half the aperture (180° = the whole half-space in front of the wall).
// The incidence angle θ is the angle between the Sun's rays and the normal:
//   cos θ = cos(elevation) × cos(azimuth difference)
// 0° = the Sun faces the wall, 90° = grazing light.
//
// Advised closure (summer): 100 × cos θ × min(1, elevation / 15°), rounded to
// the nearest 10 %. The second factor softens the first minutes of a low Sun,
// still weak through the atmosphere. In winter the advice is always 0 %: let
// the Sun in. Never a shutter command: a scene does that.
// -----------------------------------------------------------------------------

import { sunPosition } from './sun.js';

const RAD = Math.PI / 180;
const MINUTE = 60000;
const SCAN_STEP = 5 * MINUTE;
export const LOOKAHEAD_MS = 48 * 60 * MINUTE;
export const FULL_STRENGTH_ELEVATION = 15;

/** Signed difference between two azimuths, in (-180, 180]. */
export function azimuthDifference(a, b) {
  const d = (((a - b) % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}

/**
 * The advice for a facade at a Sun position.
 * @param {{ azimuth: number, aperture: number, horizon: number }} facade
 * @param {{ azimuth: number, elevation: number }} sun
 * @param {{ minElevation: number, season: 'summer'|'winter' }} options
 * @returns {{ sunOn: boolean, incidence: number, exposure: number, closure: number }}
 */
export function evaluate(facade, sun, { minElevation, season }) {
  const threshold = Math.max(minElevation, facade.horizon);
  const delta = azimuthDifference(sun.azimuth, facade.azimuth);
  const sunOn = sun.elevation > threshold && Math.abs(delta) < facade.aperture / 2;
  if (!sunOn) {
    return { sunOn: false, incidence: 90, exposure: 0, closure: 0 };
  }
  const cosIncidence = Math.max(0, Math.cos(sun.elevation * RAD) * Math.cos(delta * RAD));
  const incidence = Math.round(Math.acos(Math.min(1, cosIncidence)) / RAD);
  const exposure = Math.round(100 * cosIncidence);
  const strength = Math.min(1, sun.elevation / FULL_STRENGTH_ELEVATION);
  const closure = season === 'summer' ? Math.round(10 * cosIncidence * strength) * 10 : 0;
  return { sunOn, incidence, exposure, closure };
}

/**
 * Season in force at a date: the override from a scene, else the configured
 * mode; `auto` follows the summer months (a range that may wrap the new year,
 * for the southern hemisphere).
 * @param {{ mode: string, summerStart: number, summerEnd: number }} config
 * @param {string|null} override 'summer' | 'winter' | null
 * @param {number} month local month, 1-12
 */
export function seasonAt(config, override, month) {
  const mode = override ?? config.mode;
  if (mode === 'summer' || mode === 'winter') {
    return mode;
  }
  const { summerStart: start, summerEnd: end } = config;
  const inSummer = start <= end ? month >= start && month <= end : month >= start || month <= end;
  return inSummer ? 'summer' : 'winter';
}

/**
 * Everything a facade device and its trigger need at `now`.
 * @param {object} facade parsed facade (src/config.js)
 * @param {{ latitude: number, longitude: number }} location
 * @param {Date} now
 * @param {{ minElevation: number, season: string }} options
 * @returns {{ current: object, arrivals: Array<{ at: Date, maxClosure: number }>,
 *   nextArrival: Date|null, nextDeparture: Date|null }}
 *   `arrivals` lists the arrivals from one hour ago to the look-ahead, each
 *   with the highest advised closure of the sunny period it opens.
 */
export function facadeTimeline(facade, location, now, options) {
  const at = (date) =>
    evaluate(facade, sunPosition(date, location.latitude, location.longitude), options);
  const current = at(now);
  const start = Math.floor((now.getTime() - 65 * MINUTE) / MINUTE) * MINUTE;
  const end = now.getTime() + LOOKAHEAD_MS;

  const transitions = [];
  let previousTime = start;
  let previous = at(new Date(start)).sunOn;
  for (let t = start + SCAN_STEP; t <= end; t += SCAN_STEP) {
    const state = at(new Date(t)).sunOn;
    if (state !== previous) {
      // Refine to the minute: the first minute showing the new state.
      let exact = t;
      for (let m = previousTime + MINUTE; m < t; m += MINUTE) {
        if (at(new Date(m)).sunOn === state) {
          exact = m;
          break;
        }
      }
      transitions.push({ time: exact, sunOn: state });
    }
    previous = state;
    previousTime = t;
  }

  const arrivals = [];
  transitions.forEach((transition, index) => {
    if (!transition.sunOn) {
      return;
    }
    const departure =
      transitions[index + 1]?.time ?? Math.min(end, transition.time + 18 * 60 * MINUTE);
    let maxClosure = 0;
    for (let t = transition.time; t <= departure; t += SCAN_STEP) {
      maxClosure = Math.max(maxClosure, at(new Date(t)).closure);
    }
    arrivals.push({ at: new Date(transition.time), maxClosure });
  });

  const future = (wanted) =>
    transitions.find((tr) => tr.sunOn === wanted && tr.time > now.getTime());
  const nextArrival = future(true);
  const nextDeparture = future(false);
  return {
    current,
    arrivals,
    nextArrival: nextArrival ? new Date(nextArrival.time) : null,
    nextDeparture: nextDeparture ? new Date(nextDeparture.time) : null,
  };
}
