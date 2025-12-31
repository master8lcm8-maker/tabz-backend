const Database = require("better-sqlite3");

const db = new Database("tabz-dev.sqlite");

const row = db
  .prepare(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name='profiles'"
  )
  .get();

console.log(row);
