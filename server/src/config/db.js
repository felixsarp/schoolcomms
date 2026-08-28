import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString || '');

// Small pool: each warm serverless instance keeps its own pool, so this
// caps how many TCP connections one instance can open against the DB.
export const pool = new Pool({
  connectionString,
  ssl: connectionString && !isLocal ? { rejectUnauthorized: false } : undefined,
  max: 5,
});

// Tagged-template helper matching the `sql` API most managed-Postgres
// client libraries expose, built directly on `pg` so this works against
// any Postgres provider (Neon, Supabase, RDS, local) via DATABASE_URL.
export function sql(strings, ...values) {
  const text = strings.reduce(
    (acc, chunk, i) => acc + chunk + (i < values.length ? `$${i + 1}` : ''),
    ''
  );
  return pool.query(text, values);
}

let initialized = null;

// Creates tables on first use. The `initialized` promise is cached at
// module scope so warm serverless invocations (same container) skip the
// DDL round-trip after the first cold start.
export async function initDb() {
  if (!initialized) {
    initialized = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS class_groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS parents (
          id TEXT PRIMARY KEY,
          class_group_id TEXT NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          added_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS parents_class_group_id_idx ON parents(class_group_id)`;
      await sql`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          class_group_id TEXT NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          body TEXT,
          media_url TEXT,
          media_filename TEXT,
          recipient_count INTEGER NOT NULL,
          status TEXT NOT NULL,
          sent_by TEXT,
          sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          results JSONB
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS messages_class_group_id_idx ON messages(class_group_id)`;
    })();
  }
  return initialized;
}
