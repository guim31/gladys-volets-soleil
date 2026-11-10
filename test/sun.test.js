// The NOAA algorithm against astronomy-engine (test/fixtures/sun-reference.json):
// Toulouse and Paris, equinoxes, solstices and both 2026 clock changes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sunPosition } from '../src/sun.js';

const reference = JSON.parse(
  await readFile(new URL('./fixtures/sun-reference.json', import.meta.url), 'utf8'),
);

test('the Sun position matches the reference within 0.05°', () => {
  assert.ok(reference.positions.length >= 36);
  for (const ref of reference.positions) {
    const sun = sunPosition(new Date(ref.utc), ref.latitude, ref.longitude);
    const where = `${ref.place} ${ref.local}`;
    assert.ok(Math.abs(sun.azimuth - ref.azimuth) < 0.05, `${where}: azimuth ${sun.azimuth}`);
    // Below the horizon both refraction models diverge, and nothing depends on it.
    if (ref.elevation > 0) {
      assert.ok(
        Math.abs(sun.elevation - ref.elevation) < 0.05,
        `${where}: elevation ${sun.elevation}`,
      );
    } else {
      assert.ok(sun.elevation < 0, `${where}: below the horizon`);
    }
  }
});

test('the summer solstice noon in Toulouse is high in the south', () => {
  // 13:56 local time (UTC+2) is the true solar noon on 21 June (longitude 1.44° E).
  const sun = sunPosition(new Date('2026-06-21T11:56:00Z'), 43.6047, 1.4442);
  assert.ok(Math.abs(sun.azimuth - 180) < 1, `azimuth ${sun.azimuth}`);
  // 90 - latitude + 23.44, plus the refraction
  assert.ok(Math.abs(sun.elevation - 69.84) < 0.05, `elevation ${sun.elevation}`);
});
