// Geometry of the advice, the season, the orientation parser and the
// timelines (arrivals, departures) on reference days in Toulouse and Paris.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { azimuthDifference, evaluate, facadeTimeline, seasonAt } from '../src/advice.js';
import { normalizeConfig, parseOrientation } from '../src/config.js';
import { formatMoment } from '../src/i18n.js';

const SUMMER = { minElevation: 5, season: 'summer' };
const south = { azimuth: 180, aperture: 180, horizon: 0 };
const TOULOUSE = { latitude: 43.6047, longitude: 1.4442 };
const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const facade = (orientation, extra = {}) =>
  normalizeConfig({ facade_1_orientation: orientation, ...extra }).facades[0];

test('orientations: degrees, compass points, French and Spanish west', () => {
  assert.equal(parseOrientation('180'), 180);
  assert.equal(parseOrientation(' 247,5° '), 247.5);
  assert.equal(parseOrientation('360'), 0);
  assert.equal(parseOrientation('s'), 180);
  assert.equal(parseOrientation('SO'), 225);
  assert.equal(parseOrientation('SW'), 225);
  assert.equal(parseOrientation('O'), 270);
  assert.equal(parseOrientation('ONO'), 292.5);
  assert.equal(parseOrientation('NNE'), 22.5);
  for (const bad of ['', 'south', '400', '-10', 'X', null, undefined]) {
    assert.equal(parseOrientation(bad), null, String(bad));
  }
});

test('a facade slot is used only with a readable orientation', () => {
  const config = normalizeConfig({
    facade_1_orientation: '',
    facade_2_orientation: 'E',
    facade_2_name: 'Kitchen',
    facade_3_orientation: 'nowhere',
    facade_4_orientation: 'W',
    facade_4_aperture: '500',
    facade_4_horizon: '12',
  });
  assert.deepEqual(
    config.facades.map((f) => [f.slot, f.name, f.azimuth, f.aperture, f.horizon]),
    [
      [2, 'Kitchen', 90, 180, 0],
      [4, '', 270, 180, 12],
    ],
  );
  assert.deepEqual(config.invalid, [3]);
  // The default configuration has one south facade.
  assert.deepEqual(
    normalizeConfig().facades.map((f) => f.azimuth),
    [180],
  );
});

test('azimuth differences wrap around the north', () => {
  assert.equal(azimuthDifference(10, 350), 20);
  assert.equal(azimuthDifference(350, 10), -20);
  assert.equal(azimuthDifference(180, 180), 0);
});

test('the advice follows the incidence and the elevation', () => {
  // Facing the wall at 30° high: cos θ = cos 30° = 0.87 → 90 %.
  assert.deepEqual(evaluate(south, { azimuth: 180, elevation: 30 }, SUMMER), {
    sunOn: true,
    incidence: 30,
    exposure: 87,
    closure: 90,
  });
  // High summer Sun: cos θ = cos 65° = 0.42 → 40 %.
  assert.equal(evaluate(south, { azimuth: 180, elevation: 65 }, SUMMER).closure, 40);
  // A low Sun is softened: 10° high, facing → 0.98 × 10/15 → 70 %.
  assert.equal(evaluate(south, { azimuth: 180, elevation: 10 }, SUMMER).closure, 70);
  // Grazing light, 85° to the side.
  const grazing = evaluate(south, { azimuth: 95, elevation: 20 }, SUMMER);
  assert.equal(grazing.sunOn, true);
  assert.equal(grazing.closure, 10);
  // Behind the wall, under the threshold, under the horizon mask, outside the aperture.
  assert.equal(evaluate(south, { azimuth: 20, elevation: 30 }, SUMMER).sunOn, false);
  assert.equal(evaluate(south, { azimuth: 180, elevation: 4 }, SUMMER).sunOn, false);
  assert.equal(
    evaluate({ ...south, horizon: 25 }, { azimuth: 180, elevation: 20 }, SUMMER).sunOn,
    false,
  );
  assert.equal(
    evaluate({ ...south, aperture: 90 }, { azimuth: 130, elevation: 30 }, SUMMER).sunOn,
    false,
  );
  // Not on the facade: incidence 90, nothing advised.
  assert.deepEqual(evaluate(south, { azimuth: 20, elevation: 30 }, SUMMER), {
    sunOn: false,
    incidence: 90,
    exposure: 0,
    closure: 0,
  });
});

test('winter lets the Sun in', () => {
  const advice = evaluate(
    south,
    { azimuth: 180, elevation: 20 },
    { minElevation: 5, season: 'winter' },
  );
  assert.equal(advice.sunOn, true);
  assert.equal(advice.exposure, 94);
  assert.equal(advice.closure, 0);
});

test('the season: forced, configured, or by months (wrapping the new year)', () => {
  const auto = { mode: 'auto', summerStart: 5, summerEnd: 9 };
  assert.equal(seasonAt(auto, null, 4), 'winter');
  assert.equal(seasonAt(auto, null, 5), 'summer');
  assert.equal(seasonAt(auto, null, 9), 'summer');
  assert.equal(seasonAt(auto, null, 10), 'winter');
  assert.equal(seasonAt(auto, 'winter', 7), 'winter');
  assert.equal(seasonAt({ ...auto, mode: 'summer' }, null, 1), 'summer');
  assert.equal(seasonAt({ ...auto, mode: 'summer' }, 'winter', 1), 'winter');
  const south = { mode: 'auto', summerStart: 11, summerEnd: 3 };
  assert.equal(seasonAt(south, null, 12), 'summer');
  assert.equal(seasonAt(south, null, 2), 'summer');
  assert.equal(seasonAt(south, null, 6), 'winter');
});

test('summer solstice in Toulouse: the west facade gets the Sun after the solar noon', () => {
  const west = facade('W');
  const timeline = facadeTimeline(west, TOULOUSE, new Date('2026-06-21T06:00:00Z'), SUMMER);
  assert.equal(timeline.current.sunOn, false);
  // Solar noon 11:56 UTC (azimuth 180), sunset behind the 5° threshold near 19:03 UTC.
  assert.equal(timeline.nextArrival.toISOString(), '2026-06-21T11:57:00.000Z');
  assert.equal(timeline.nextDeparture.toISOString(), '2026-06-21T19:03:00.000Z');
  assert.equal(timeline.arrivals[0].maxClosure, 90);

  const evening = facadeTimeline(west, TOULOUSE, new Date('2026-06-21T17:30:00Z'), SUMMER);
  assert.deepEqual(evening.current, { sunOn: true, incidence: 24, exposure: 91, closure: 90 });
  assert.equal(
    formatMoment(evening.nextDeparture, evening.nextDeparture, 'fr', 'Europe/Paris'),
    '21:03',
  );
});

test('winter solstice in Paris: the north facade never sees the Sun, the south one does', () => {
  const now = new Date('2026-12-21T11:00:00Z');
  const north = facadeTimeline(facade('N'), PARIS, now, SUMMER);
  assert.equal(north.nextArrival, null);
  assert.equal(north.nextDeparture, null);
  const southFacade = facadeTimeline(facade('S'), PARIS, now, SUMMER);
  assert.equal(southFacade.current.sunOn, true);
  // Low winter Sun (17.7°) facing the wall: almost full closure in summer mode.
  assert.equal(southFacade.current.closure, 90);
  assert.equal(
    facadeTimeline(facade('S'), PARIS, now, { ...SUMMER, season: 'winter' }).current.closure,
    0,
  );
});

test('the clock changes do not shift the arrivals (Paris, 29 March and 25 October 2026)', () => {
  // The Sun ignores the clocks: an arrival moves by about a minute from one day
  // to the next in UTC, while the local time jumps by an hour.
  const east = facade('E');
  for (const [before, after] of [
    ['2026-03-28T03:00:00Z', '2026-03-29T03:00:00Z'],
    ['2026-10-24T03:00:00Z', '2026-10-25T03:00:00Z'],
  ]) {
    const a = facadeTimeline(east, PARIS, new Date(before), SUMMER).nextArrival;
    const b = facadeTimeline(east, PARIS, new Date(after), SUMMER).nextArrival;
    const drift = Math.abs(b.getTime() - a.getTime() - 24 * 3600 * 1000) / 60000;
    assert.ok(drift <= 3, `drift of ${drift} min`);
  }
  // 25 October: the same UTC instant reads one hour earlier in local time.
  const sunday = facadeTimeline(east, PARIS, new Date('2026-10-25T03:00:00Z'), SUMMER).nextArrival;
  const saturday = facadeTimeline(
    east,
    PARIS,
    new Date('2026-10-24T03:00:00Z'),
    SUMMER,
  ).nextArrival;
  const local = (date) => formatMoment(date, date, 'en', 'Europe/Paris');
  assert.equal(Number(local(saturday).slice(0, 2)) - Number(local(sunday).slice(0, 2)), 1);
});

test('the moments read in the local time zone', () => {
  const now = new Date('2026-06-21T20:00:00Z'); // 22:00 in Paris
  const tz = 'Europe/Paris';
  assert.equal(formatMoment(new Date('2026-06-21T21:30:00Z'), now, 'fr', tz), '23:30');
  assert.equal(formatMoment(new Date('2026-06-22T05:10:00Z'), now, 'fr', tz), 'demain 07:10');
  assert.equal(formatMoment(new Date('2026-06-22T05:10:00Z'), now, 'de', tz), 'morgen 07:10');
  assert.match(formatMoment(new Date('2026-06-23T05:10:00Z'), now, 'en', tz), /^Tue 07:10$/);
  assert.equal(formatMoment(null, now, 'es', tz), 'no antes de 48 h');
  // 25 October has 25 hours: "tomorrow" stays right.
  assert.equal(
    formatMoment(new Date('2026-10-26T06:00:00Z'), new Date('2026-10-24T21:30:00Z'), 'en', tz),
    'Mon 07:00',
  );
  assert.equal(
    formatMoment(new Date('2026-10-26T06:00:00Z'), new Date('2026-10-25T22:30:00Z'), 'en', tz),
    'tomorrow 07:00',
  );
});
