(async () => {
  const ds = require('./dist/data-source.js').default;

  console.log('DS_TYPE=', ds.options.type);
  console.log('DS_URL_SET=', !!ds.options.url);

  await ds.initialize();
  const who = await ds.query("select current_database() as db, current_user as usr");
  console.log('CONNECTED_TO=', who);

  const ran = await ds.runMigrations();
  console.log('RUN_MIGRATIONS_COUNT=', ran.length);
  console.log('RUN_MIGRATIONS_NAMES=', ran.map(m => m.name));

  const mig = await ds.query("select to_regclass('public.migrations') as migrations_table");
  console.log('MIGRATIONS_TABLE_NOW=', mig);

  const adr = await ds.query("select to_regclass('public.account_deletion_requests') as adr");
  console.log('ACCOUNT_DELETION_REQUESTS_NOW=', adr);

  await ds.destroy();
})().catch(e => {
  console.error('NODE_MIGRATION_ERROR=', e);
  process.exit(1);
});
