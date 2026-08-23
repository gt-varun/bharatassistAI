// A side-effect import, not `import dotenv from 'dotenv'; dotenv.config();`
// below the other imports — ES module `import` declarations are all
// evaluated (in the order listed) before any of this file's own top-level
// code runs, so a `dotenv.config()` call placed after `import { createApp }`
// would execute *after* app.js (and everything it transitively imports) has
// already read `process.env`, no matter which line comes first in the
// source. Being the very first import makes this one run — and populate
// process.env — before the next import even starts loading.
import 'dotenv/config';

import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    const app = createApp();
    app.listen(PORT, () => {
      logger.info(`BharatAssist Backend Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
};

startServer();
