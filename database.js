import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { config } from './config.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db;

async function initDB() {
  db = await open({
    filename: join(__dirname, config.dbPath),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS premium (
      userId TEXT PRIMARY KEY
    )
  `);
  
  console.log('✅ Database initialized');
}

initDB().catch(console.error);

export async function addPremium(userId) {
  if (!db) await initDB();
  await db.run('INSERT OR IGNORE INTO premium (userId) VALUES (?)', userId);
}

export async function isPremium(userId) {
  if (!db) await initDB();
  const row = await db.get('SELECT * FROM premium WHERE userId = ?', userId);
  return !!row;
}
