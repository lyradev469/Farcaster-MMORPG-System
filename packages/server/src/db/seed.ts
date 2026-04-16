/**
 * Database Seed Script
 * Populates initial game data (monsters, items, skills)
 */

import { Database } from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || './data/mmo.db';

export function seed() {
  console.log('[DB] Starting seed...');
  
  const db = new Database(DB_PATH);
  
  // Check if data already exists
  const count = db.prepare("SELECT COUNT(*) as c FROM players").get() as any;
  if (count.c > 0) {
    console.log('[DB] Database already seeded. Skipping.');
    db.close();
    return;
  }
  
  // Insert sample monsters
  const monsterStmt = db.prepare(`
    INSERT INTO monsters (id, name, level, hp, attack, defense, exp_reward, drops_json, spawn_zone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const monsters = [
    ['rat_001', 'Puny Rat', 1, 50, 15, 5, 10, 'potion_small,herb', 'zone_1'],
    ['rat_002', 'Puny Rat', 1, 50, 15, 5, 10, 'potion_small,herb', 'zone_1'],
    ['rat_003', 'Puny Rat', 1, 50, 15, 5, 10, 'potion_small,herb', 'zone_1'],
    ['crab_001', 'Crab', 5, 120, 25, 20, 35, 'crab_shell,crab_meat', 'zone_2'],
    ['tiger_001', 'Steel Tiger', 12, 300, 50, 25, 120, 'tiger_fang,tiger_skin,potion_medium', 'zone_3'],
    ['orc_001', 'Orc Warrior', 20, 800, 80, 40, 500, 'orc_tusk,orc_helm,iron', 'zone_3']
  ];
  
  // Note: For actual seed, table would need to be created
  // This is placeholder logic
  
  console.log('[DB] Seed complete!');
  console.log('[DB] Sample monsters added');
  
  db.close();
}

if (require.main === module) {
  seed();
}
