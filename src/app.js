// -----------------------------------------------------------------------------
// Every SDK handler, and the minute loop that computes the advice.
//
// `createApp(gladys, options)` takes the SDK client (the real one in index.js,
// the SDK's fake Gladys in the tests) and an injectable clock: nothing here
// reads the current time directly.
// -----------------------------------------------------------------------------

import { logger as defaultLogger } from '@gladysassistant/integration-sdk';
import { normalizeConfig } from './config.js';
import { facadeTimeline, seasonAt } from './advice.js';
import { buildDevices, facadeIds, facadeLabel, facadeStates } from './devices.js';
import { STATUS, TEXT, pick, localMonth, formatMoment } from './i18n.js';
import { createStore } from './store.js';
import { buildWidget, MODE_ACTIONS, WIDGET_KEY } from './widget.js';

export const TRIGGER_KEY = 'sun_arrival';
export const LEADS = [0, 15, 30, 60];
// An arrival trigger is still fired when the loop wakes up to 3 minutes late.
const FIRE_WINDOW_MS = 3 * 60000;
const LOCATION_RETRY_MS = 10 * 60000;
// A located house is read again every hour: its coordinates may be corrected.
const LOCATION_REFRESH_MS = 60 * 60000;
const HEARTBEAT_MS = 6 * 3600 * 1000;

export function createApp(
  gladys,
  { now = () => new Date(), dataDir = '/data', logger = defaultLogger, tickMs = 60000 } = {},
) {
  const store = createStore(dataDir, logger);
  let config = normalizeConfig();
  let location = null; // null: not read yet, false: no located house
  let lastLocationAttempt = 0;
  let timer = null;
  let ticking = Promise.resolve();
  const timelines = new Map(); // slot -> timeline of the last tick
  let season = null;

  // A failure repeated every minute writes one line, then one on recovery.
  function failureLog(what) {
    let last = null;
    return {
      fail(err) {
        if (err.message !== last) {
          logger.warn(`${what} failed: ${err.message}`);
        }
        last = err.message;
      },
      ok() {
        if (last !== null) {
          logger.info(`${what} works again`);
        }
        last = null;
      },
    };
  }
  const housesLog = failureLog('Reading the houses');
  const statesLog = failureLog('Publishing the states');
  const eventsLog = failureLog('Firing the arrival trigger');
  const computeLog = failureLog('Computing the advice');

  async function loadLocation() {
    lastLocationAttempt = now().getTime();
    let houses;
    try {
      houses = await gladys.getHouses();
      housesLog.ok();
    } catch (err) {
      // A transient failure keeps the location already known.
      housesLog.fail(err);
      if (location === null) {
        location = false;
        await reportStatus();
      }
      return;
    }
    const house = (houses ?? []).find(
      (h) => Number.isFinite(h?.latitude) && Number.isFinite(h?.longitude),
    );
    const found = house ? { latitude: house.latitude, longitude: house.longitude } : null;
    // One line when the location appears or goes missing, not one per retry.
    const moved =
      found &&
      location &&
      (found.latitude !== location.latitude || found.longitude !== location.longitude);
    if ((found && !location) || moved) {
      logger.info(`House located (${house.name ?? house.selector}), computing the advice`);
    } else if (!found && location !== false) {
      logger.info('No located house in Gladys yet, retrying every 10 minutes');
    }
    location = found ?? false;
    await reportStatus();
  }

  async function reportStatus() {
    if (!location) {
      await gladys.setConnectionStatus(false, STATUS.noLocation);
    } else if (config.invalid.length > 0) {
      const slots = config.invalid.join(', ');
      const message = Object.fromEntries(
        Object.entries(STATUS.invalid).map(([lang, text]) => [
          lang,
          text.replace('{slots}', slots),
        ]),
      );
      await gladys.setConnectionStatus(false, message);
    } else {
      await gladys.setConnectionStatus(true);
    }
  }

  const createdIds = () => new Set((gladys.devices ?? []).map((d) => d.external_id));

  /** The name the user gave the device in Gladys, else the proposed one. */
  function displayName(facade) {
    const id = facadeIds(gladys, facade.slot).device;
    return (
      (gladys.devices ?? []).find((d) => d.external_id === id)?.name ||
      facadeLabel(facade, config.language)
    );
  }

  /**
   * Recompute every facade, publish the changed states and fire the due
   * arrival triggers.
   */
  async function compute({ fireEvents = true } = {}) {
    const date = now();
    const age = date.getTime() - lastLocationAttempt;
    if (age >= (location ? LOCATION_REFRESH_MS : LOCATION_RETRY_MS)) {
      await loadLocation();
    }
    if (!location) {
      season = null;
      return;
    }
    season = seasonAt(config, store.override, localMonth(date));
    const created = createdIds();
    const states = [];
    const events = [];
    timelines.clear();
    for (const facade of config.facades) {
      const timeline = facadeTimeline(facade, location, date, {
        minElevation: config.minElevation,
        season,
      });
      timelines.set(facade.slot, timeline);
      const ids = facadeIds(gladys, facade.slot);
      if (!created.has(ids.device)) {
        continue;
      }
      states.push(...facadeStates(gladys, facade, timeline, date, config.language));
      if (fireEvents) {
        events.push(...dueEvents(facade, ids.device, timeline, date));
      }
    }
    // A failed publication must not hold back the triggers: their window is short.
    if (states.length > 0) {
      try {
        await gladys.publishChangedStates(states, { heartbeat: HEARTBEAT_MS });
        statesLog.ok();
      } catch (err) {
        statesLog.fail(err);
      }
    }
    const fired = [];
    for (const { key, data } of events) {
      try {
        await gladys.publishSceneEvent(TRIGGER_KEY, data);
        fired.push(key);
        logger.debug(`Trigger ${TRIGGER_KEY}: ${data.facade}, ${data.minutes_before} min before`);
        eventsLog.ok();
      } catch (err) {
        eventsLog.fail(err);
      }
    }
    if (fired.length > 0) {
      await store.markFired(fired, date);
    }
  }

  function dueEvents(facade, deviceId, timeline, date) {
    const due = [];
    for (const arrival of timeline.arrivals) {
      for (const lead of LEADS) {
        const at = arrival.at.getTime() - lead * 60000;
        const key = `${facade.slot}:${arrival.at.toISOString()}:${lead}`;
        if (at <= date.getTime() && date.getTime() - at < FIRE_WINDOW_MS && !store.hasFired(key)) {
          due.push({
            key,
            data: {
              device: deviceId,
              lead: String(lead),
              minutes_before: lead,
              facade: displayName(facade),
              arrival_time: formatMoment(arrival.at, date, config.language),
              max_closure: arrival.maxClosure,
              season,
            },
          });
        }
      }
    }
    return due;
  }

  // One computation at a time: the loop, a poll and a config change can meet.
  function tick(options) {
    ticking = ticking
      .then(() => compute(options))
      .then(() => computeLog.ok())
      .catch((err) => computeLog.fail(err));
    return ticking;
  }

  function startLoop() {
    stopLoop();
    timer = setInterval(() => tick(), tickMs);
    timer.unref?.();
  }

  function stopLoop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  async function publishDevices() {
    await gladys.publishDiscoveredDevices(buildDevices(gladys, config));
  }

  async function setOverride(value) {
    await store.setOverride(value);
    logger.info(`Season ${value ?? 'from the configuration'} set by the user`);
    await tick({ fireEvents: false });
    gladys.requestWidgetRefresh(WIDGET_KEY);
  }

  // --- Handlers ----------------------------------------------------------------

  gladys.onScanRequest(async () => {
    await publishDevices();
  });

  // Fallback only: the devices are published with should_poll: false.
  gladys.onPoll(async () => {
    await tick({ fireEvents: false });
  });

  gladys.onSetValue(async (device, feature) => {
    throw new Error(`The facade sensors are read-only (${feature.external_id})`);
  });

  // The states of a feature not yet created were dropped by Gladys: the SDK
  // forgets them on creation, so the next computation sends everything again.
  gladys.onDeviceCreated(async () => {
    await tick({ fireEvents: false });
    gladys.requestWidgetRefresh(WIDGET_KEY);
  });
  gladys.onDeviceUpdated(async () => gladys.requestWidgetRefresh(WIDGET_KEY));
  gladys.onDeviceDeleted(async () => gladys.requestWidgetRefresh(WIDGET_KEY));

  gladys.onConfigUpdated(async (raw) => {
    logger.info('Configuration updated');
    config = normalizeConfig(raw);
    await publishDevices();
    // The occasion to read the house again, in case its coordinates changed.
    lastLocationAttempt = 0;
    await reportStatus();
    await tick({ fireEvents: false });
    gladys.requestWidgetRefresh(WIDGET_KEY);
  });

  gladys.onAction('preview', async () => {
    await tick({ fireEvents: false });
    if (!location) {
      return STATUS.noLocation;
    }
    if (config.facades.length === 0) {
      return Object.fromEntries(Object.entries(TEXT).map(([lang, t]) => [lang, t.noFacade]));
    }
    const date = now();
    const lines = (lang) =>
      config.facades
        .filter((facade) => timelines.has(facade.slot))
        .map((facade) => {
          const timeline = timelines.get(facade.slot);
          const name = facadeLabel(facade, config.language);
          const value = timeline.current.sunOn
            ? `☀ ${timeline.current.closure} % (${timeline.current.incidence}°)`
            : `${pick(TEXT, lang).noSun}, ${pick(TEXT, lang).sunFrom} ${formatMoment(timeline.nextArrival, date, lang)}`;
          return `${name} (${Math.round(facade.azimuth)}°): ${value}`;
        })
        .join(' · ');
    const mode = (lang) =>
      season === 'summer' ? pick(TEXT, lang).summer : pick(TEXT, lang).winter;
    return Object.fromEntries(
      Object.keys(TEXT).map((lang) => [lang, `${mode(lang)} — ${lines(lang)}`]),
    );
  });

  gladys.onSceneAction('set_season', async (fields) => {
    const value = fields.season === 'summer' || fields.season === 'winter' ? fields.season : null;
    await setOverride(value);
    return { season };
  });

  gladys.onWidgetGet(WIDGET_KEY, async ({ settings, language }) =>
    buildWidget({
      rows: config.facades
        .filter((facade) => timelines.has(facade.slot))
        .map((facade) => ({ name: displayName(facade), timeline: timelines.get(facade.slot) })),
      season,
      noLocation: location === false,
      override: store.override,
      now: now(),
      language,
      settings,
    }),
  );

  gladys.onWidgetAction(WIDGET_KEY, async (actionKey) => {
    if (!(actionKey in MODE_ACTIONS)) {
      throw new Error(`Unknown widget action ${actionKey}`);
    }
    await store.setOverride(MODE_ACTIONS[actionKey]);
    logger.info(
      `Season ${MODE_ACTIONS[actionKey] ?? 'from the configuration'} set from the widget`,
    );
    await tick({ fireEvents: false });
    return Object.fromEntries(Object.entries(TEXT).map(([lang, t]) => [lang, t.modeSet]));
  });

  gladys.on('connected', async () => {
    config = normalizeConfig(await gladys.getConfig());
    await store.load();
    await publishDevices();
    await loadLocation();
    await tick();
    startLoop();
  });

  gladys.on('disconnected', () => stopLoop());

  return {
    tick,
    stop: stopLoop,
    get season() {
      return season;
    },
    get timelines() {
      return timelines;
    },
  };
}
