/**
 * Database Migration Script
 * Creates all tables and indexes for the MMORPG system
 */

import { Database } from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

const DB_PATH = process.env.DB_PATH || './data/mmo.db';

export function migrate() {
  console.log('[DB] Starting migration...');
  
  const db = new Database(DB_PATH);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Read schema
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  
  // Execute schema
  db.exec(schema);
  
  console.log('[DB] Migration complete!');
  console.log('[DB] Database file:', DB_PATH);
  
  // Verify tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('[DB] Tables created:', (tables as any[]).map(t => t.name));
  
  db.close();
}

if (require.main === module) {
  migrate();
}
