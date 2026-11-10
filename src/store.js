// -----------------------------------------------------------------------------
// The little the integration remembers across restarts, in /data/state.json:
//   - the season forced by a scene or the widget (null = follow the config);
//   - the arrival triggers already fired, so a restart never fires one twice.
// -----------------------------------------------------------------------------

import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';

const KEEP_FIRED_MS = 3 * 24 * 3600 * 1000;

export function createStore(dataDir, logger) {
  const file = path.join(dataDir, 'state.json');
  let state = { override: null, fired: {} };

  return {
    get override() {
      return state.override;
    },
    hasFired(key) {
      return key in state.fired;
    },

    async load() {
      try {
        const saved = JSON.parse(await readFile(file, 'utf8'));
        state = {
          override: ['summer', 'winter'].includes(saved.override) ? saved.override : null,
          fired: saved.fired && typeof saved.fired === 'object' ? saved.fired : {},
        };
      } catch (err) {
        if (err.code !== 'ENOENT') {
          logger.warn(`Cannot read ${file}, starting afresh: ${err.message}`);
        }
      }
    },

    async setOverride(value) {
      state.override = value;
      await this.save();
    },

    /** Remember fired keys and forget the old ones. */
    async markFired(keys, now) {
      for (const key of keys) {
        state.fired[key] = now.toISOString();
      }
      for (const [key, at] of Object.entries(state.fired)) {
        if (now.getTime() - Date.parse(at) > KEEP_FIRED_MS) {
          delete state.fired[key];
        }
      }
      await this.save();
    },

    async save() {
      try {
        await mkdir(dataDir, { recursive: true });
        await writeFile(`${file}.tmp`, JSON.stringify(state));
        await rename(`${file}.tmp`, file);
      } catch (err) {
        logger.warn(`Cannot write ${file}: ${err.message}`);
      }
    },
  };
}
