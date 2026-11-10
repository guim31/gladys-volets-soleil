// The whole application against the SDK's fake Gladys: states, triggers,
// season override, missing location, quiet logs. The clock is injected.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { createWorld, TOULOUSE } from './helpers/world.js';
import { buildDevices, facadeIds } from '../src/devices.js';
import { normalizeConfig } from '../src/config.js';

process.env.TZ = 'Europe/Paris';

const TWO_FACADES = {
  facade_1_orientation: 'S',
  facade_2_orientation: 'W',
  facade_2_name: 'Living room',
};

test('every facade publishes its advice (Toulouse, summer solstice evening)', async () => {
  const { gladys } = await createWorld({ config: TWO_FACADES, at: '2026-06-21T17:30:00Z' });
  const south = facadeIds(gladys, 1);
  const west = facadeIds(gladys, 2);
  const state = (id) => gladys.fake.lastState(id);
  assert.equal(state(west.feature('sun')), 1);
  assert.equal(state(west.feature('closure')), 90);
  assert.equal(state(west.feature('exposure')), 91);
  assert.equal(state(west.feature('incidence')), 24);
  assert.equal(state(west.feature('next-departure')), '21:03');
  assert.equal(state(west.feature('next-arrival')), 'demain 13:57');
  assert.equal(state(south.feature('sun')), 0);
  assert.equal(state(south.feature('closure')), 0);
  assert.equal(state(south.feature('incidence')), 90);
  assert.equal(state(south.feature('next-arrival')), 'demain 09:45');
  assert.deepEqual(gladys.fake.connectionStatus, { connected: true });
  assert.deepEqual(
    gladys.fake.discoveredDevices.map((d) => d.name),
    ['Façade S', 'Living room'],
  );
});

test('a normal minute publishes only what changed and writes nothing at info level', async () => {
  const { gladys, advance, logger } = await createWorld({
    config: TWO_FACADES,
    at: '2026-06-21T17:30:00Z',
  });
  const before = gladys.fake.states.length;
  const infoBefore = logger.lines.filter((l) => l.level === 'info').length;
  await advance(1);
  const published = gladys.fake.states.slice(before);
  assert.ok(published.length <= 3, `${published.length} states for one minute`);
  await advance(1);
  assert.equal(logger.lines.filter((l) => l.level === 'info').length, infoBefore);
  assert.equal(logger.lines.filter((l) => l.level !== 'debug' && l.level !== 'info').length, 0);
});

test('the arrival trigger fires once per lead, from one hour before to the arrival', async () => {
  const { gladys, advance, dataDir } = await createWorld({
    config: TWO_FACADES,
    at: '2026-06-21T10:50:00Z',
  });
  for (let minute = 0; minute < 75; minute += 1) {
    await advance(1);
  }
  const west = facadeIds(gladys, 2).device;
  const events = gladys.fake.sceneEvents.filter((e) => e.data.device === west);
  assert.deepEqual(
    events.map((e) => e.data.lead),
    ['60', '30', '15', '0'],
  );
  assert.deepEqual(events[3], {
    key: 'sun_arrival',
    data: {
      device: west,
      lead: '0',
      minutes_before: 0,
      facade: 'Living room',
      arrival_time: '13:57',
      max_closure: 90,
      season: 'summer',
    },
  });
  // The south facade has its Sun since the morning: nothing for it.
  assert.equal(gladys.fake.sceneEvents.length, 4);

  // A restart inside the window fires nothing twice (the keys live in /data).
  const again = await createWorld({ config: TWO_FACADES, at: '2026-06-21T11:58:00Z', dataDir });
  assert.equal(again.gladys.fake.sceneEvents.length, 0);
});

test('a scene forces the season, and the choice survives a restart', async () => {
  const world = await createWorld({ config: TWO_FACADES, at: '2026-06-21T17:30:00Z' });
  const closure = facadeIds(world.gladys, 2).feature('closure');
  const ack = await world.gladys.fake.sceneAction('set_season', { season: 'winter' });
  assert.deepEqual(ack.data.outputs, { season: 'winter' });
  assert.equal(world.gladys.fake.lastState(closure), 0);
  const saved = JSON.parse(await readFile(path.join(world.dataDir, 'state.json'), 'utf8'));
  assert.equal(saved.override, 'winter');

  const restarted = await createWorld({
    config: TWO_FACADES,
    at: '2026-06-21T17:31:00Z',
    dataDir: world.dataDir,
  });
  assert.equal(restarted.app.season, 'winter');
  const back = await restarted.gladys.fake.sceneAction('set_season', { season: 'config' });
  assert.deepEqual(back.data.outputs, { season: 'summer' });
  assert.equal(restarted.gladys.fake.lastState(closure), 90);
});

test('winter months by default: November advises 0 % everywhere', async () => {
  const { gladys } = await createWorld({
    config: { facade_1_orientation: 'S' },
    at: '2026-11-10T12:00:00Z',
  });
  const ids = facadeIds(gladys, 1);
  assert.equal(gladys.fake.lastState(ids.feature('sun')), 1);
  assert.equal(gladys.fake.lastState(ids.feature('closure')), 0);
  assert.ok(gladys.fake.lastState(ids.feature('exposure')) > 80);
});

test('without a located house: a status in four languages, then a retry', async () => {
  const world = await createWorld({
    houses: [{ id: 'h', name: 'Home', selector: 'home', latitude: null, longitude: null }],
  });
  const status = world.gladys.fake.connectionStatus;
  assert.equal(status.connected, false);
  assert.deepEqual(Object.keys(status.message).sort(), ['de', 'en', 'es', 'fr']);
  assert.equal(world.gladys.fake.states.length, 0);
  const widget = await world.gladys.fake.widgetGet('facades', { language: 'fr', settings: {} });
  assert.match(widget.data.content.components.at(0).text, /Aucune position/);

  world.gladys.fake.houses = [TOULOUSE];
  await world.advance(5);
  assert.equal(world.gladys.fake.states.length, 0, 'retry every 10 minutes, not every minute');
  await world.advance(5);
  assert.deepEqual(world.gladys.fake.connectionStatus, { connected: true });
  assert.ok(world.gladys.fake.states.length > 0);
  // One line when missing, one when found: not one per retry.
  assert.equal(world.logger.lines.filter((l) => /house/i.test(l.message)).length, 2);
});

test('an unreadable orientation is reported, the other facades keep working', async () => {
  const { gladys } = await createWorld({
    config: { facade_1_orientation: 'S', facade_2_orientation: 'sud-ouest' },
  });
  const status = gladys.fake.connectionStatus;
  assert.equal(status.connected, false);
  assert.match(status.message.fr, /emplacements 2/);
  assert.equal(gladys.fake.discoveredDevices.length, 1);
});

test('states wait for the device to be added, then are all published', async () => {
  const { gladys } = await createWorld({ config: TWO_FACADES, created: false });
  assert.equal(gladys.fake.discoveredDevices.length, 2);
  assert.equal(gladys.fake.states.length, 0);
  const [device] = buildDevices(gladys, normalizeConfig(TWO_FACADES));
  await gladys.fake.deviceCreated(device);
  assert.equal(gladys.fake.states.length, 6);
  assert.ok(gladys.fake.widgetRefreshes.includes('facades'));
});

test('the configuration update republishes the devices in the chosen language', async () => {
  const { gladys } = await createWorld({ config: TWO_FACADES });
  await gladys.fake.configUpdated({ ...TWO_FACADES, language: 'de', facade_3_orientation: 'E' });
  assert.deepEqual(
    gladys.fake.discoveredDevices.map((d) => d.name),
    ['Fassade S', 'Living room', 'Fassade E'],
  );
  assert.equal(gladys.fake.discoveredDevices[0].features[0].name, 'Sonne auf der Fassade');
});

test('the widget lists the facades with the Gladys names and fits the core budget', async () => {
  const { gladys } = await createWorld({ config: TWO_FACADES, at: '2026-06-21T17:30:00Z' });
  for (const language of ['en', 'fr', 'de', 'es']) {
    const ack = await gladys.fake.widgetGet('facades', { language, settings: {} });
    assert.deepEqual(validateWidgetContent(ack.data.content), [], language);
  }
  const ack = await gladys.fake.widgetGet('facades', { language: 'fr', settings: {} });
  const status = ack.data.content.components.find((c) => c.type === 'status');
  assert.deepEqual(
    status.items.map((i) => [i.label, i.value]),
    [
      ['Façade S', 'soleil à demain 09:45'],
      ['Living room', "90 % · jusqu'à 21:03"],
    ],
  );
  const hidden = await gladys.fake.widgetGet('facades', {
    language: 'en',
    settings: { show_mode: false, show_mode_buttons: false },
  });
  assert.deepEqual(
    hidden.data.content.components.map((c) => c.type),
    ['status'],
  );

  const tap = await gladys.fake.widgetAction('facades', 'mode_winter', {}, { settings: {} });
  assert.equal(tap.success, true);
  const after = await gladys.fake.widgetGet('facades', { language: 'en', settings: {} });
  const buttons = after.data.content.components.filter((c) => c.type === 'button');
  assert.deepEqual(
    buttons.map((b) => [b.action.key, b.icon]),
    [
      ['mode_summer', 'sun'],
      ['mode_winter', 'check-circle'],
      ['mode_config', 'settings'],
    ],
  );
  assert.match(after.data.content.components[0].text, /^Winter mode: let the sun in \(forced\)$/);
});

test('the preview action describes every facade', async () => {
  const { gladys } = await createWorld({ config: TWO_FACADES, at: '2026-06-21T17:30:00Z' });
  const ack = await gladys.fake.action('preview', {});
  assert.match(
    ack.data.message.fr,
    /^Été — Façade S \(180°\): pas de soleil, soleil à demain 09:45 · Living room \(270°\): ☀ 90 % \(24°\)$/,
  );
});
