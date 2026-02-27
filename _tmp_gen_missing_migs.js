const fs = require("fs");
const path = require("path");

const invPath = path.resolve("PROD_SCHEMA_INVENTORY.json");
const inv = JSON.parse(fs.readFileSync(invPath, "utf8"));

function key(t){ return `${t.table_schema}.${t.table_name}`; }

const tables = new Set(inv.tables.map(t => key(t)));
const colsByTable = new Map();
for (const c of inv.columns) {
  const k = `${c.table_schema}.${c.table_name}`;
  if (!colsByTable.has(k)) colsByTable.set(k, []);
  colsByTable.get(k).push(c);
}

const consByTable = new Map();
for (const c of inv.constraints) {
  const k = `${c.table_schema}.${c.table_name}`;
  if (!consByTable.has(k)) consByTable.set(k, []);
  consByTable.get(k).push(c);
}

const idxByTable = new Map();
for (const i of inv.indexes) {
  const k = `${i.table_schema}.${i.table_name}`;
  if (!idxByTable.has(k)) idxByTable.set(k, []);
  idxByTable.get(k).push(i);
}

// ---------- helpers ----------
function qIdent(name){
  // simple identifier quoting
  return `"${String(name).replace(/"/g,'""')}"`;
}

function pgType(col){
  // Use Postgres-native types from information_schema
  // (udt_name catches things like int4, int8, uuid, jsonb, etc)
  const dt = String(col.data_type || "").toLowerCase();
  const udt = String(col.udt_name || "").toLowerCase();

  if (dt === "character varying" || dt === "varchar") {
    const len = col.character_maximum_length;
    return len ? `varchar(${len})` : "varchar";
  }
  if (dt === "character" || dt === "char") {
    const len = col.character_maximum_length;
    return len ? `char(${len})` : "char";
  }
  if (dt === "text") return "text";
  if (dt === "integer" || udt === "int4") return "int";
  if (dt === "bigint" || udt === "int8") return "bigint";
  if (dt === "smallint" || udt === "int2") return "smallint";
  if (dt === "boolean") return "boolean";
  if (dt === "uuid") return "uuid";
  if (dt === "jsonb") return "jsonb";
  if (dt === "json") return "json";
  if (dt.startsWith("timestamp")) return "timestamp";
  if (dt === "date") return "date";
  if (dt === "numeric") {
    const p = col.numeric_precision;
    const s = col.numeric_scale;
    if (p != null && s != null) return `numeric(${p},${s})`;
    if (p != null) return `numeric(${p})`;
    return "numeric";
  }
  if (dt === "double precision") return "double precision";
  if (dt === "real") return "real";

  // fallback to udt_name when it looks usable
  if (udt && /^[a-z0-9_]+$/.test(udt)) return udt;

  // last resort
  return "text";
}

function colSql(col){
  const name = qIdent(col.column_name);
  const type = pgType(col);
  const nullable = String(col.is_nullable).toUpperCase() === "YES" ? "" : " NOT NULL";
  const def = col.column_default ? ` DEFAULT ${col.column_default}` : "";
  return `  ${name} ${type}${def}${nullable}`;
}

function pkColsFor(tableKey){
  const cons = consByTable.get(tableKey) || [];
  const pk = cons.filter(c => c.constraint_type === "PRIMARY KEY" && c.column_name);
  // preserve appearance order as provided (should be ordinal_position-ish)
  return pk.map(c => c.column_name);
}

function uniqueConstraintsFor(tableKey){
  const cons = consByTable.get(tableKey) || [];
  const u = cons.filter(c => c.constraint_type === "UNIQUE" && c.constraint_name);
  // group by constraint name -> columns
  const m = new Map();
  for (const r of u) {
    if (!m.has(r.constraint_name)) m.set(r.constraint_name, []);
    if (r.column_name) m.get(r.constraint_name).push(r.column_name);
  }
  return [...m.entries()].map(([name, cols]) => ({ name, cols }));
}

function fkConstraintsFor(tableKey){
  const cons = consByTable.get(tableKey) || [];
  const f = cons.filter(c => c.constraint_type === "FOREIGN KEY" && c.constraint_name);
  const m = new Map();
  for (const r of f) {
    if (!m.has(r.constraint_name)) m.set(r.constraint_name, []);
    if (r.column_name) m.get(r.constraint_name).push(r);
  }
  // each entry: {name, cols:[{column_name, foreign_table_schema, foreign_table_name, foreign_column_name}]}
  return [...m.entries()].map(([name, rows]) => ({ name, rows }));
}

function injectIfNotExistsIndex(indexdef){
  // Convert:
  //  CREATE INDEX name ON ...
  //  CREATE UNIQUE INDEX name ON ...
  // into:
  //  CREATE INDEX IF NOT EXISTS name ON ...
  //  CREATE UNIQUE INDEX IF NOT EXISTS name ON ...
  return indexdef
    .replace(/^CREATE INDEX\s+/i, "CREATE INDEX IF NOT EXISTS ")
    .replace(/^CREATE UNIQUE INDEX\s+/i, "CREATE UNIQUE INDEX IF NOT EXISTS ");
}

function writeFileNoClobber(fp, content){
  if (fs.existsSync(fp)) throw new Error(`REFUSING_OVERWRITE: ${fp}`);
  fs.writeFileSync(fp, content, "utf8");
  console.log("WROTE", fp);
}

// ---------- migration builders ----------
function header(name){
  return `import { MigrationInterface, QueryRunner } from "typeorm";

export class ${name} implements MigrationInterface {
  name = "${name}";

  private isPostgres(queryRunner: QueryRunner): boolean {
    const t = (queryRunner.connection?.options as any)?.type;
    return String(t).toLowerCase() === "postgres";
  }

`;
}

function footer(){
  return `}
`;
}

function ensureTablesMigration(className, tableList){
  // Creates tables + PK/UNIQUE/FK + indexes, all idempotent
  let out = header(className);

  out += `  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!this.isPostgres(queryRunner)) return;

`;

  for (const t of tableList) {
    const k = `public.${t}`;
    if (!tables.has(k)) {
      // not present in inventory -> skip (but log in generated file so it's explicit)
      out += `    // NOTE: ${k} not found in PROD_SCHEMA_INVENTORY.json (skipped)\n\n`;
      continue;
    }

    const cols = (colsByTable.get(k) || []).slice();
    const pkCols = pkColsFor(k);

    // Build CREATE TABLE IF NOT EXISTS
    const colLines = cols.map(colSql);
    if (pkCols.length) {
      colLines.push(`  CONSTRAINT ${qIdent(`${t}_pkey`)} PRIMARY KEY (${pkCols.map(qIdent).join(", ")})`);
    }

    out += `    // === ensure table public.${t} ===
    await queryRunner.query(\`
      CREATE TABLE IF NOT EXISTS public.${qIdent(t)} (
${colLines.join(",\n")}
      );
    \`);

`;

    // UNIQUE constraints
    const uniques = uniqueConstraintsFor(k);
    for (const u of uniques) {
      if (!u.cols.length) continue;
      out += `    // unique: ${u.name}
    await queryRunner.query(\`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = '${u.name.replace(/'/g,"''")}'
        ) THEN
          ALTER TABLE public.${qIdent(t)}
            ADD CONSTRAINT ${qIdent(u.name)} UNIQUE (${u.cols.map(qIdent).join(", ")});
        END IF;
      END $$;
    \`);

`;
    }

    // FK constraints
    const fks = fkConstraintsFor(k);
    for (const fk of fks) {
      const rows = fk.rows;
      if (!rows.length) continue;

      // Assume 1:1 column mapping order
      const localCols = rows.map(r => r.column_name).filter(Boolean);
      const refSchema = rows[0].foreign_table_schema || "public";
      const refTable = rows[0].foreign_table_name;
      const refCols = rows.map(r => r.foreign_column_name).filter(Boolean);

      if (!refTable || !localCols.length || !refCols.length) continue;

      out += `    // fk: ${fk.name}
    await queryRunner.query(\`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = '${fk.name.replace(/'/g,"''")}'
        ) THEN
          ALTER TABLE public.${qIdent(t)}
            ADD CONSTRAINT ${qIdent(fk.name)}
            FOREIGN KEY (${localCols.map(qIdent).join(", ")})
            REFERENCES ${qIdent(refSchema)}.${qIdent(refTable)} (${refCols.map(qIdent).join(", ")});
        END IF;
      END $$;
    \`);

`;
    }

    // Indexes
    const idx = idxByTable.get(k) || [];
    for (const i of idx) {
      // skip PK index auto-created
      const def = String(i.indexdef || "");
      if (!def) continue;
      // If it's the implicit PK index, Postgres names vary; keep it, IF NOT EXISTS makes it safe anyway
      const def2 = injectIfNotExistsIndex(def);
      out += `    // index: ${i.indexname}
    await queryRunner.query(\`${def2}\`);

`;
    }
  }

  out += `  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentionally no-op (prod truth restore). Do NOT drop prod tables.
    return;
  }
`;

  out += footer();
  return out;
}

function ensureColumnMigration(className, tableName, colName){
  // Finds the column definition in inventory and adds it IF NOT EXISTS.
  const k = `public.${tableName}`;
  const cols = (colsByTable.get(k) || []).slice();
  const c = cols.find(x => String(x.column_name) === colName);
  if (!c) throw new Error(`Column not found in inventory: public.${tableName}.${colName}`);

  let out = header(className);
  out += `  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!this.isPostgres(queryRunner)) return;

    await queryRunner.query(\`
      ALTER TABLE public.${qIdent(tableName)}
      ADD COLUMN IF NOT EXISTS ${qIdent(colName)} ${pgType(c)}${c.column_default ? ` DEFAULT ${c.column_default}` : ""}${String(c.is_nullable).toUpperCase()==="YES" ? "" : " NOT NULL"};
    \`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no-op (avoid destructive down)
    return;
  }
`;
  out += footer();
  return out;
}

// ---------- define the 8 missing/misplaced migrations we’re restoring ----------
const outDir = path.resolve("src/migrations");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// 1) CreateBaseTables1700000000000 -> ensures core base tables exist.
// We keep it conservative: only tables that are NOT "later feature" tables.
const baseTables = [
  "users",
  "profiles",
  "venues",
  "wallets",
  "wallet_transactions",
  "venue_wallets",
  "venue_wallet_transactions",
  "cashout_requests",
  "cashout_locks",
  "bank_info",
  "payouts",
  "transfers",
  "store_items",
  "store_item_orders",
  "migrations" // harmless; already exists; IF NOT EXISTS
].filter(t => tables.has(`public.${t}`));

// 2) ProdWalletsBaseline1768891965353 -> ensure wallet tables (in case base is altered in future)
const walletTables = [
  "wallets",
  "wallet_transactions",
  "venue_wallets",
  "venue_wallet_transactions"
].filter(t => tables.has(`public.${t}`));

// 3) CreateCreditsLedger1768109000000 -> credits tables
const creditsTables = [
  "credits_account",
  "credits_ledger_entry",
  "credits_transfer"
].filter(t => tables.has(`public.${t}`));

// 4) CreateStaffTable1768804022771 -> staff table
const staffTables = ["staff"].filter(t => tables.has(`public.${t}`));

// 5) CreateDrinkOrdersOnly1768897364993 -> drink_orders table
const drinkTables = ["drink_orders"].filter(t => tables.has(`public.${t}`));

// 6) AddUsersDisplayName1768723743137 -> users.displayName (exact case per inventory)
let usersDisplayNameCol = null;
{
  const k = "public.users";
  const cols = colsByTable.get(k) || [];
  const hit = cols.find(c => String(c.column_name).toLowerCase() === "displayname");
  if (hit) usersDisplayNameCol = hit.column_name;
}

// 7) 3046-AddWalletIdToCashoutRequests -> cashout_requests.walletId (exact case per inventory)
let cashoutWalletIdCol = null;
{
  const k = "public.cashout_requests";
  const cols = colsByTable.get(k) || [];
  const hit = cols.find(c => String(c.column_name).toLowerCase() === "walletid");
  if (hit) cashoutWalletIdCol = hit.column_name;
}

// 8) 3047-AddFailureReasonAndRetryOfCashoutIdToCashoutRequests -> columns failureReason + retryOfCashoutId
let cashoutFailureReasonCol = null;
let cashoutRetryOfCashoutIdCol = null;
{
  const k = "public.cashout_requests";
  const cols = colsByTable.get(k) || [];
  const fr = cols.find(c => String(c.column_name).toLowerCase() === "failurereason");
  const rc = cols.find(c => String(c.column_name).toLowerCase() === "retryofcashoutid");
  if (fr) cashoutFailureReasonCol = fr.column_name;
  if (rc) cashoutRetryOfCashoutIdCol = rc.column_name;
}

// ---------- write the 8 files (no overwrite) ----------
writeFileNoClobber(path.join(outDir, "1700000000000-CreateBaseTables.ts"),
  ensureTablesMigration("CreateBaseTables1700000000000", baseTables)
);

writeFileNoClobber(path.join(outDir, "1768891965353-ProdWalletsBaseline.ts"),
  ensureTablesMigration("ProdWalletsBaseline1768891965353", walletTables)
);

writeFileNoClobber(path.join(outDir, "1768109000000-CreateCreditsLedger.ts"),
  ensureTablesMigration("CreateCreditsLedger1768109000000", creditsTables)
);

writeFileNoClobber(path.join(outDir, "1768804022771-CreateStaffTable.ts"),
  ensureTablesMigration("CreateStaffTable1768804022771", staffTables)
);

writeFileNoClobber(path.join(outDir, "1768897364993-CreateDrinkOrdersOnly.ts"),
  ensureTablesMigration("CreateDrinkOrdersOnly1768897364993", drinkTables)
);

if (!usersDisplayNameCol) throw new Error("users.displayName column not found in inventory");
writeFileNoClobber(path.join(outDir, "1768723743137-AddUsersDisplayName.ts"),
  ensureColumnMigration("AddUsersDisplayName1768723743137", "users", usersDisplayNameCol)
);

if (!cashoutWalletIdCol) throw new Error("cashout_requests.walletId column not found in inventory");
writeFileNoClobber(path.join(outDir, "3046-AddWalletIdToCashoutRequests.ts"),
  ensureColumnMigration("3046-AddWalletIdToCashoutRequests", "cashout_requests", cashoutWalletIdCol)
);

if (!cashoutFailureReasonCol) throw new Error("cashout_requests.failureReason column not found in inventory");
if (!cashoutRetryOfCashoutIdCol) throw new Error("cashout_requests.retryOfCashoutId column not found in inventory");
const twoCols = `import { MigrationInterface, QueryRunner } from "typeorm";

export class 3047-AddFailureReasonAndRetryOfCashoutIdToCashoutRequests implements MigrationInterface {
  name = "3047-AddFailureReasonAndRetryOfCashoutIdToCashoutRequests";

  private isPostgres(queryRunner: QueryRunner): boolean {
    const t = (queryRunner.connection?.options as any)?.type;
    return String(t).toLowerCase() === "postgres";
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!this.isPostgres(queryRunner)) return;

    await queryRunner.query(\`
      ALTER TABLE public."cashout_requests"
      ADD COLUMN IF NOT EXISTS "${cashoutFailureReasonCol}" ${pgType((colsByTable.get("public.cashout_requests")||[]).find(c=>c.column_name===cashoutFailureReasonCol))}${((colsByTable.get("public.cashout_requests")||[]).find(c=>c.column_name===cashoutFailureReasonCol)?.column_default) ? ` DEFAULT ${((colsByTable.get("public.cashout_requests")||[]).find(c=>c.column_name===cashoutFailureReasonCol)?.column_default)}` : ""};
    \`);

    await queryRunner.query(\`
      ALTER TABLE public."cashout_requests"
      ADD COLUMN IF NOT EXISTS "${cashoutRetryOfCashoutIdCol}" ${pgType((colsByTable.get("public.cashout_requests")||[]).find(c=>c.column_name===cashoutRetryOfCashoutIdCol))}${((colsByTable.get("public.cashout_requests")||[]).find(c=>c.column_name===cashoutRetryOfCashoutIdCol)?.column_default) ? ` DEFAULT ${((colsByTable.get("public.cashout_requests")||[]).find(c=>c.column_name===cashoutRetryOfCashoutIdCol)?.column_default)}` : ""};
    \`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no-op (avoid destructive down)
    return;
  }
}
`;
writeFileNoClobber(path.join(outDir, "3047-AddFailureReasonAndRetryOfCashoutIdToCashoutRequests.ts"), twoCols);

console.log("DONE: generated missing migrations from prod inventory");