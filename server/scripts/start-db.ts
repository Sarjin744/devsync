import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';

async function startDb() {
  const dataDir = path.resolve(__dirname, '../.pgdata');
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    persistent: true,
  });

  console.log('Initialising embedded PostgreSQL at:', dataDir);
  await pg.initialise();
  console.log('Starting embedded PostgreSQL on port 5432...');
  await pg.start();
  console.log('Embedded PostgreSQL is now RUNNING on localhost:5432');

  try {
    await pg.createDatabase('devsync');
    console.log('Created database "devsync"');
  } catch (err: any) {
    if (err?.message?.includes('already exists')) {
      console.log('Database "devsync" already exists');
    } else {
      console.log('Database notice:', err?.message || err);
    }
  }

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('Stopping database...');
    await pg.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    console.log('Stopping database...');
    await pg.stop();
    process.exit(0);
  });
}

startDb().catch((err) => {
  console.error('Failed to start embedded PostgreSQL:', err);
  process.exit(1);
});
