import { neon } from '@neondatabase/serverless';
import path from 'path';
import { fileURLToPath } from 'url';
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

// KEEP IN SYNC: the inline DDL below must match
// migrations/001_initial_schema.sql, which is the version to paste into the
// Neon SQL Editor. The .sql file is deliberately not read here: the neon
// driver only documents single-statement sql`...` / sql.query(text, params)
// and sql.transaction([...]), not multi-statement strings, so the statements
// are duplicated. Add new statements to both places.
async function runMigration() {
  console.log('Running migration...');

  try {
    // 1. Create table for backups
    await sql`CREATE TABLE IF NOT EXISTS backups (
        id VARCHAR(16) PRIMARY KEY,
        password_hash VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_ip VARCHAR(45)
    )`;

    // 2. Create table for rate limits
    await sql`CREATE TABLE IF NOT EXISTS rate_limits (
        id SERIAL PRIMARY KEY,
        ip VARCHAR(45) NOT NULL,
        action VARCHAR(10) NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW()
    )`;

    // 3. Create index for rate limits
    await sql`CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_timestamp ON rate_limits(ip, timestamp)`;

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
