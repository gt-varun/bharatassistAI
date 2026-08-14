/**
 * Brings the database's indexes in line with the schemas.
 *
 *   pnpm sync-indexes
 *
 * MongoDB never changes the options of an index that already exists — a
 * `createIndex` with different options against the same name is refused
 * rather than applied. So a schema change like the `User` phone/email
 * partial indexes has no effect on a database created before it, and the
 * old, broken index quietly stays in charge.
 *
 * `syncIndexes()` drops the indexes that no longer match and rebuilds them.
 * It is safe to re-run: with nothing to change it does nothing. It is a
 * script rather than something that happens at startup on purpose —
 * dropping and rebuilding an index is not something a server should decide
 * to do by itself while it is serving requests.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { logger } from '../utils/logger.js';

import { UserModel } from '../models/User.js';
import { CitizenProfileModel } from '../models/CitizenProfile.js';

const MODELS = [UserModel, CitizenProfileModel];

async function main(): Promise<void> {
  await connectDB();

  for (const model of MODELS) {
    const dropped = await model.syncIndexes();
    if (dropped.length) {
      logger.info({ collection: model.collection.name, dropped }, 'Replaced stale indexes');
    } else {
      logger.info({ collection: model.collection.name }, 'Indexes already correct');
    }
  }

  await mongoose.disconnect();
  logger.info('Index sync complete.');
}

main().catch(async (error) => {
  logger.error({ error }, 'Index sync failed');
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
