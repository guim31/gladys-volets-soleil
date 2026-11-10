// -----------------------------------------------------------------------------
// Integration configuration: defaults (mirroring the manifest `default`s) and
// normalization, so the rest of the code never deals with strings or holes.
//
// The facades live in six fixed slots (facade_1_* … facade_6_*): the slot
// number is the stable id of the device, whatever the name or the orientation
// the user types later.
// -----------------------------------------------------------------------------

export const LANGUAGES = ['en', 'fr', 'de', 'es'];
export const MODES = ['auto', 'summer', 'winter'];
export const FACADE_SLOTS = [1, 2, 3, 4, 5, 6];

export const DEFAULT_CONFIG = {
  language: 'fr',
  mode: 'auto',
  summer_start_month: '5',
  summer_end_month: '9',
  min_elevation: 5,
  facade_1_orientation: 'S',
  facade_1_aperture: 180,
  facade_1_horizon: 0,
  facade_2_aperture: 180,
  facade_2_horizon: 0,
  facade_3_aperture: 180,
  facade_3_horizon: 0,
  facade_4_aperture: 180,
  facade_4_horizon: 0,
  facade_5_aperture: 180,
  facade_5_horizon: 0,
  facade_6_aperture: 180,
  facade_6_horizon: 0,
};

// Compass points, in English letters. "O" is also read as west (French
// "ouest", Spanish "oeste"): the documentation says so, and German users are
// told to type W or degrees ("O" is "Ost" for them).
const COMPASS = {
  N: 0,
  NNE: 22.5,
  NE: 45,
  ENE: 67.5,
  E: 90,
  ESE: 112.5,
  SE: 135,
  SSE: 157.5,
  S: 180,
  SSW: 202.5,
  SW: 225,
  WSW: 247.5,
  W: 270,
  WNW: 292.5,
  NW: 315,
  NNW: 337.5,
};

/**
 * Read an orientation typed by the user: degrees from the north, clockwise
 * ("180", "247,5", "135°"), or a compass point ("S", "SO", "WNW").
 * @returns {number|null} degrees in [0, 360), or null when unreadable
 */
export function parseOrientation(raw) {
  if (raw === undefined || raw === null) {
    return null;
  }
  const text = String(raw).trim().toUpperCase().replace('°', '').replace(',', '.');
  if (text === '') {
    return null;
  }
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    const value = Number(text);
    return value >= 0 && value <= 360 ? value % 360 : null;
  }
  const letters = text.replace(/O/g, 'W');
  return COMPASS[letters] ?? null;
}

function clampNumber(value, fallback, min, max) {
  const number = Number(String(value ?? '').replace(',', '.'));
  if (value === undefined || value === null || value === '' || !Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

function month(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 12 ? number : Number(fallback);
}

/**
 * Merge the user config with the defaults and parse the facades.
 * @returns {{ language: string, mode: string, summerStart: number, summerEnd: number,
 *   minElevation: number, facades: Array<{ slot: number, name: string,
 *   orientationText: string, azimuth: number, aperture: number, horizon: number }>,
 *   invalid: number[] }}
 */
export function normalizeConfig(raw = {}) {
  const merged = { ...DEFAULT_CONFIG, ...raw };
  const facades = [];
  const invalid = [];
  for (const slot of FACADE_SLOTS) {
    const orientationText = String(merged[`facade_${slot}_orientation`] ?? '').trim();
    if (orientationText === '') {
      continue;
    }
    const azimuth = parseOrientation(orientationText);
    if (azimuth === null) {
      invalid.push(slot);
      continue;
    }
    facades.push({
      slot,
      name: String(merged[`facade_${slot}_name`] ?? '').trim(),
      orientationText: orientationText.toUpperCase(),
      azimuth,
      aperture: clampNumber(merged[`facade_${slot}_aperture`], 180, 10, 180),
      horizon: clampNumber(merged[`facade_${slot}_horizon`], 0, 0, 80),
    });
  }
  return {
    language: LANGUAGES.includes(merged.language) ? merged.language : DEFAULT_CONFIG.language,
    mode: MODES.includes(merged.mode) ? merged.mode : DEFAULT_CONFIG.mode,
    summerStart: month(merged.summer_start_month, DEFAULT_CONFIG.summer_start_month),
    summerEnd: month(merged.summer_end_month, DEFAULT_CONFIG.summer_end_month),
    minElevation: clampNumber(merged.min_elevation, DEFAULT_CONFIG.min_elevation, 0, 45),
    facades,
    invalid,
  };
}
