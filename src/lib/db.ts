import * as SQLite from 'expo-sqlite';

export type ScanRecord = {
  id: number;
  photoUri: string;
  label: string;
  displayName: string;
  confidence: number;
  createdAt: number;
};

const db = SQLite.openDatabaseSync('cropdoc.db');

let readyPromise: Promise<void> | null = null;

export function initDb() {
  if (!readyPromise) {
    readyPromise = db.execAsync(`
      CREATE TABLE IF NOT EXISTS scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        photoUri TEXT NOT NULL,
        label TEXT NOT NULL,
        displayName TEXT NOT NULL,
        confidence REAL NOT NULL,
        createdAt INTEGER NOT NULL
      );
    `);
  }
  return readyPromise;
}

export async function saveScan(
  scan: Omit<ScanRecord, 'id' | 'createdAt'>
): Promise<number> {
  await initDb();
  const result = await db.runAsync(
    'INSERT INTO scans (photoUri, label, displayName, confidence, createdAt) VALUES (?, ?, ?, ?, ?)',
    [scan.photoUri, scan.label, scan.displayName, scan.confidence, Date.now()]
  );
  return result.lastInsertRowId;
}

export async function getScanHistory(): Promise<ScanRecord[]> {
  await initDb();
  return db.getAllAsync<ScanRecord>('SELECT * FROM scans ORDER BY createdAt DESC');
}

export async function clearScanHistory(): Promise<void> {
  await initDb();
  await db.execAsync('DELETE FROM scans');
}
