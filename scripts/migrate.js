import { neon } from '@neondatabase/serverless';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL not found in environment or .env.local');
  process.exit(1);
}

const sql = neon(databaseUrl);

// Single source of truth: migrations/*.sql files (paste the same files into
// the Neon SQL Editor). This script reads and applies them — do not duplicate
// DDL inline here. Applied versions are tracked in schema_migrations so
// re-runs only apply pending files.
const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Split SQL text into statements, respecting single/double-quoted strings,
 * dollar-quoted bodies ($$ ... $$, $tag$ ... $tag$), line comments (--) and
 * block comments (slash-star ... star-slash). A naive `.split(';')` breaks as soon
 * as a future migration contains a semicolon inside a string or function body.
 */
function splitStatements(sqlText) {
  const statements = [];
  let current = '';
  let i = 0;
  const n = sqlText.length;

  while (i < n) {
    const ch = sqlText[i];
    const next2 = sqlText.slice(i, i + 2);

    // Line comment: skip to end of line
    if (next2 === '--') {
      const end = sqlText.indexOf('\n', i);
      i = end === -1 ? n : end;
      continue;
    }

    // Block comment: skip to closing */
    if (next2 === '/*') {
      const end = sqlText.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }

    // Single- or double-quoted string ('' escapes a quote)
    if (ch === "'" || ch === '"') {
      current += ch;
      i++;
      while (i < n) {
        if (sqlText[i] === ch) {
          if (sqlText[i + 1] === ch) {
            current += ch + ch;
            i += 2;
            continue;
          }
          current += ch;
          i++;
          break;
        }
        current += sqlText[i];
        i++;
      }
      continue;
    }

    // Dollar-quoted string: $tag$ ... $tag$ (tag may be empty: $$)
    if (ch === '$') {
      const tagMatch = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sqlText.slice(i));
      if (tagMatch) {
        const tag = tagMatch[0];
        const end = sqlText.indexOf(tag, i + tag.length);
        const stop = end === -1 ? n : end + tag.length;
        current += sqlText.slice(i, stop);
        i = stop;
        continue;
      }
      current += ch;
      i++;
      continue;
    }

    if (ch === ';') {
      if (current.trim().length > 0) statements.push(current.trim());
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  if (current.trim().length > 0) statements.push(current.trim());
  return statements;
}

async function getAppliedVersions() {
  await sql.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    []
  );
  const rows = await sql.query('SELECT version, checksum FROM schema_migrations', []);
  return new Map(rows.map((r) => [r.version, r.checksum]));
}

async function runMigration() {
  console.log('Running migration...');

  try {
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    if (files.length === 0) {
      console.log('No migration files found, nothing to do.');
      return;
    }

    const applied = await getAppliedVersions();

    for (const file of files) {
      const filePath = path.resolve(MIGRATIONS_DIR, file);
      const sqlText = fs.readFileSync(filePath, 'utf8');
      const checksum = sha256(sqlText);
      const recorded = applied.get(file);

      if (recorded === checksum) {
        console.log(`Skipping ${file} (already applied, checksum match).`);
        continue;
      }
      if (recorded !== undefined) {
        throw new Error(
          `Migration ${file} was modified after being applied (checksum mismatch). ` +
            `Refusing to re-apply; create a new migration file instead.`
        );
      }

      console.log(`Applying ${file}...`);
      const statements = splitStatements(sqlText);
      // Atomic per-file application: DDL + bookkeeping commit together, so a
      // mid-file failure leaves nothing partially applied and the next run
      // replays the whole file (migrations must stay idempotent).
      const queries = statements.map((stmt) => sql.query(stmt, []));
      queries.push(
        sql.query('INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)', [
          file,
          checksum,
        ])
      );
      await sql.transaction(queries);
      console.log(`Applied ${file} (${statements.length} statements).`);
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
