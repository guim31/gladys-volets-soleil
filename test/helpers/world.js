// A fake Gladys (the SDK's own) around the application, with a settable clock,
// a temporary /data and a logger that records what it writes.

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { createApp } from '../../src/app.js';
import { buildDevices } from '../../src/devices.js';
import { normalizeConfig } from '../../src/config.js';

export const TOULOUSE = {
  id: 'h1',
  name: 'Home',
  selector: 'home',
  latitude: 43.6047,
  longitude: 1.4442,
};
export const PARIS = {
  id: 'h2',
  name: 'Flat',
  selector: 'flat',
  latitude: 48.8566,
  longitude: 2.3522,
};

export function recordingLogger() {
  const lines = [];
  const log = (level) => (message) => lines.push({ level, message: String(message) });
  return {
    lines,
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
  };
}

/**
 * @param {{ config?: object, houses?: object[], at?: string, created?: boolean,
 *   dataDir?: string }} options `created`: the devices are already added in Gladys.
 */
export async function createWorld({
  config = {},
  houses = [TOULOUSE],
  at = '2026-06-21T12:00:00Z',
  created = true,
  dataDir,
} = {}) {
  const clock = { now: new Date(at) };
  const dir = dataDir ?? (await mkdtemp(path.join(tmpdir(), 'volets-')));
  // The devices as Gladys stores them once added (same ids as discovery).
  const scratch = createFakeGladys();
  const devices = created ? buildDevices(scratch, normalizeConfig(config)) : [];
  const gladys = createFakeGladys({ config, houses, devices });
  const logger = recordingLogger();
  const app = createApp(gladys, { now: () => clock.now, dataDir: dir, logger });
  await gladys.connect();
  app.stop(); // the tests drive the loop by hand
  const advance = async (minutes) => {
    clock.now = new Date(clock.now.getTime() + minutes * 60000);
    await app.tick();
  };
  return { gladys, app, clock, logger, dataDir: dir, advance };
}
