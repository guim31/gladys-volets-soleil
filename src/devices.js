// -----------------------------------------------------------------------------
// One Gladys device per facade, all features read-only sensors.
//
// `should_poll: false`: the values move on a minute scale and the container
// recomputes them itself every minute (src/app.js); `onPoll` stays a fallback.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as C,
  DEVICE_FEATURE_TYPES as T,
  DEVICE_FEATURE_UNITS as U,
} from '@gladysassistant/integration-sdk';
import { NAMES, pick, formatMoment } from './i18n.js';

export const DEVICE_TYPE = 'facade';

export function facadeIds(gladys, slot) {
  return gladys.externalIds(DEVICE_TYPE, `slot-${slot}`);
}

/** The name proposed for a facade: the user's, else "Façade S". */
export function facadeLabel(facade, language) {
  return facade.name || `${pick(NAMES, language).facade} ${facade.orientationText}`;
}

function feature(ids, key, name, category, type, extra) {
  return {
    name,
    external_id: ids.feature(key),
    category,
    type,
    read_only: true,
    has_feedback: false,
    keep_history: true,
    ...extra,
  };
}

export function buildDevice(gladys, facade, language) {
  const ids = facadeIds(gladys, facade.slot);
  const n = pick(NAMES, language);
  const percent = { unit: U.PERCENT, min: 0, max: 100 };
  return {
    name: facadeLabel(facade, language),
    external_id: ids.device,
    should_poll: false,
    features: [
      feature(ids, 'sun', n.sun, C.INPUT, T.INPUT.BINARY, { min: 0, max: 1 }),
      feature(ids, 'closure', n.closure, C.LIGHT_SENSOR, T.SENSOR.DECIMAL, percent),
      feature(ids, 'exposure', n.exposure, C.LIGHT_SENSOR, T.SENSOR.DECIMAL, percent),
      feature(ids, 'incidence', n.incidence, C.ANGLE_SENSOR, T.SENSOR.INTEGER, {
        unit: U.DEGREE,
        min: 0,
        max: 90,
      }),
      feature(ids, 'next-arrival', n.nextArrival, C.TEXT, T.TEXT.TEXT, {
        min: 0,
        max: 0,
        keep_history: false,
      }),
      feature(ids, 'next-departure', n.nextDeparture, C.TEXT, T.TEXT.TEXT, {
        min: 0,
        max: 0,
        keep_history: false,
      }),
    ],
  };
}

export function buildDevices(gladys, config) {
  return config.facades.map((facade) => buildDevice(gladys, facade, config.language));
}

/** States of a facade device from its timeline (src/advice.js). */
export function facadeStates(gladys, facade, timeline, now, language) {
  const ids = facadeIds(gladys, facade.slot);
  const { current } = timeline;
  return [
    { device_feature_external_id: ids.feature('sun'), state: current.sunOn ? 1 : 0 },
    { device_feature_external_id: ids.feature('closure'), state: current.closure },
    { device_feature_external_id: ids.feature('exposure'), state: current.exposure },
    { device_feature_external_id: ids.feature('incidence'), state: current.incidence },
    {
      device_feature_external_id: ids.feature('next-arrival'),
      text: formatMoment(timeline.nextArrival, now, language),
    },
    {
      device_feature_external_id: ids.feature('next-departure'),
      text: formatMoment(timeline.nextDeparture, now, language),
    },
  ];
}
