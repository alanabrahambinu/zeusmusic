
import Database from 'better-sqlite3';
const db = new Database('premium.db');

db.prepare(`
CREATE TABLE IF NOT EXISTS premium (
  userId TEXT PRIMARY KEY
)
`).run();

export function addPremium(userId) {
  db.prepare('INSERT OR IGNORE INTO premium (userId) VALUES (?)').run(userId);
}

export function isPremium(userId) {
  const row = db.prepare('SELECT * FROM premium WHERE userId = ?').get(userId);
  return !!row;
}
