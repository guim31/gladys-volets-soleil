// -----------------------------------------------------------------------------
// Position of the Sun, computed locally (no network, no dependency).
//
// The NOAA solar calculator algorithm (Jean Meeus, "Astronomical Algorithms"),
// the one behind https://gml.noaa.gov/grad/solcalc/: about 0.01° on the
// position for the years 1800-2100, far below what a shutter can tell apart.
// The tests compare it with astronomy-engine (test/fixtures/sun-reference.json).
// -----------------------------------------------------------------------------

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

const sin = (deg) => Math.sin(deg * RAD);
const cos = (deg) => Math.cos(deg * RAD);
const mod = (value, n) => ((value % n) + n) % n;

/**
 * Atmospheric refraction, in degrees, for a geometric elevation (NOAA).
 * It lifts the Sun by about half a degree on the horizon.
 */
function refraction(elevation) {
  if (elevation > 85) {
    return 0;
  }
  const te = Math.tan(elevation * RAD);
  let arcsec;
  if (elevation > 5) {
    arcsec = 58.1 / te - 0.07 / te ** 3 + 0.000086 / te ** 5;
  } else if (elevation > -0.575) {
    arcsec =
      1735 + elevation * (-518.2 + elevation * (103.4 + elevation * (-12.79 + elevation * 0.711)));
  } else {
    arcsec = -20.774 / te;
  }
  return arcsec / 3600;
}

/**
 * Apparent position of the Sun seen from a place on Earth.
 * @param {Date} date
 * @param {number} latitude degrees, north positive
 * @param {number} longitude degrees, east positive
 * @returns {{ azimuth: number, elevation: number }} degrees; azimuth from the
 *   north, clockwise (90 = east, 180 = south); elevation above the horizon,
 *   refraction included
 */
export function sunPosition(date, latitude, longitude) {
  const ms = date.getTime();
  const julianCentury = (ms / 86400000 + 2440587.5 - 2451545) / 36525;
  const t = julianCentury;

  const meanLongitude = mod(280.46646 + t * (36000.76983 + t * 0.0003032), 360);
  const meanAnomaly = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const center =
    sin(meanAnomaly) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    sin(2 * meanAnomaly) * (0.019993 - 0.000101 * t) +
    sin(3 * meanAnomaly) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  const apparentLongitude = meanLongitude + center - 0.00569 - 0.00478 * sin(omega);
  const meanObliquity =
    23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * cos(omega);
  const declination = Math.asin(sin(obliquity) * sin(apparentLongitude)) * DEG;

  const y = Math.tan((obliquity / 2) * RAD) ** 2;
  const equationOfTime =
    4 *
    DEG *
    (y * sin(2 * meanLongitude) -
      2 * eccentricity * sin(meanAnomaly) +
      4 * eccentricity * y * sin(meanAnomaly) * cos(2 * meanLongitude) -
      0.5 * y * y * sin(4 * meanLongitude) -
      1.25 * eccentricity * eccentricity * sin(2 * meanAnomaly));

  const utcMinutes = mod(ms, 86400000) / 60000;
  const trueSolarTime = mod(utcMinutes + equationOfTime + 4 * longitude, 1440);
  const hourAngle = trueSolarTime / 4 - 180;

  const cosZenith = Math.min(
    1,
    Math.max(
      -1,
      sin(latitude) * sin(declination) + cos(latitude) * cos(declination) * cos(hourAngle),
    ),
  );
  const zenith = Math.acos(cosZenith) * DEG;
  const geometric = 90 - zenith;

  const azimuth = mod(
    Math.atan2(
      sin(hourAngle),
      cos(hourAngle) * sin(latitude) - Math.tan(declination * RAD) * cos(latitude),
    ) *
      DEG +
      180,
    360,
  );
  return { azimuth, elevation: geometric + refraction(geometric) };
}
