// -----------------------------------------------------------------------------
// Entry point: wire the SDK to the application (src/app.js), then connect.
//
// The Gladys supervisor provides GLADYS_HOST_API_URL, GLADYS_INTEGRATION_TOKEN
// and GLADYS_INTEGRATION_SELECTOR (read by the SDK) and TZ, the Gladys time
// zone used to show the local times. DATA_DIR defaults to /data, the only
// writable path of the sandbox.
// -----------------------------------------------------------------------------

import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { createApp } from './src/app.js';

const gladys = new GladysIntegration();
const app = createApp(gladys, { dataDir: process.env.DATA_DIR || '/data' });

gladys.handleShutdown((signal) => {
  logger.info(`Received ${signal} -> graceful shutdown`);
  app.stop();
});

logger.info('Starting the sun-and-shutters integration...');
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});
