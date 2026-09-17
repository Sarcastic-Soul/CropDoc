import * as SQLite from 'expo-sqlite';

export type ScanRecord = {
  id: number;
  photoUri: string;
  label: string;
  displayName: string;
  confidence: number;
  createdAt: number;
  secondOpinion: string | null;
  plotTag: string | null;
  batchId: string | null;
};

const db = SQLite.openDatabaseSync('cropdoc.db');

let readyPromise: Promise<void> | null = null;

export function initDb() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS scans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          photoUri TEXT NOT NULL,
          label TEXT NOT NULL,
          displayName TEXT NOT NULL,
          confidence REAL NOT NULL,
          createdAt INTEGER NOT NULL
        );
      `);
      // Added after the initial release — check before altering so upgrades
      // from an existing on-device db don't fail on a duplicate column.
      const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(scans)');
      if (!columns.some((c) => c.name === 'secondOpinion')) {
        await db.execAsync('ALTER TABLE scans ADD COLUMN secondOpinion TEXT');
      }
      if (!columns.some((c) => c.name === 'plotTag')) {
        await db.execAsync('ALTER TABLE scans ADD COLUMN plotTag TEXT');
      }
      if (!columns.some((c) => c.name === 'batchId')) {
        await db.execAsync('ALTER TABLE scans ADD COLUMN batchId TEXT');
      }
    })();
  }
  return readyPromise;
}

export async function saveScan(
  scan: Omit<ScanRecord, 'id' | 'createdAt' | 'secondOpinion' | 'plotTag' | 'batchId'> & {
    plotTag?: string | null;
    batchId?: string | null;
  }
): Promise<number> {
  await initDb();
  const result = await db.runAsync(
    'INSERT INTO scans (photoUri, label, displayName, confidence, createdAt, plotTag, batchId) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      scan.photoUri,
      scan.label,
      scan.displayName,
      scan.confidence,
      Date.now(),
      scan.plotTag ?? null,
      scan.batchId ?? null,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateScanSecondOpinion(id: number, secondOpinion: string): Promise<void> {
  await initDb();
  await db.runAsync('UPDATE scans SET secondOpinion = ? WHERE id = ?', [secondOpinion, id]);
}

export async function updateScanPlotTag(id: number, plotTag: string | null): Promise<void> {
  await initDb();
  await db.runAsync('UPDATE scans SET plotTag = ? WHERE id = ?', [plotTag, id]);
}

export type ScanHistoryQuery = {
  limit: number;
  offset: number;
  startDate?: number;
  endDate?: number;
  plotTag?: string;
};

export async function getScanHistoryPage({
  limit,
  offset,
  startDate,
  endDate,
  plotTag,
}: ScanHistoryQuery): Promise<ScanRecord[]> {
  await initDb();
  const conditions: string[] = [];
  const args: (number | string)[] = [];
  if (startDate !== undefined) {
    conditions.push('createdAt >= ?');
    args.push(startDate);
  }
  if (endDate !== undefined) {
    conditions.push('createdAt <= ?');
    args.push(endDate);
  }
  if (plotTag !== undefined) {
    conditions.push('plotTag = ?');
    args.push(plotTag);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.getAllAsync<ScanRecord>(
    `SELECT * FROM scans ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
    [...args, limit, offset]
  );
}

export async function getPlotTags(): Promise<string[]> {
  await initDb();
  const rows = await db.getAllAsync<{ plotTag: string }>(
    "SELECT DISTINCT plotTag FROM scans WHERE plotTag IS NOT NULL AND plotTag != '' ORDER BY plotTag COLLATE NOCASE"
  );
  return rows.map((row) => row.plotTag);
}

export async function getScansByPlotTag(plotTag: string): Promise<ScanRecord[]> {
  await initDb();
  return db.getAllAsync<ScanRecord>('SELECT * FROM scans WHERE plotTag = ? ORDER BY createdAt ASC', [plotTag]);
}

export async function getScansByBatchId(batchId: string): Promise<ScanRecord[]> {
  await initDb();
  return db.getAllAsync<ScanRecord>('SELECT * FROM scans WHERE batchId = ? ORDER BY id ASC', [batchId]);
}

export async function getScanById(id: number): Promise<ScanRecord | null> {
  await initDb();
  const record = await db.getFirstAsync<ScanRecord>('SELECT * FROM scans WHERE id = ?', [id]);
  return record ?? null;
}

export async function clearScanHistory(): Promise<void> {
  await initDb();
  await db.execAsync('DELETE FROM scans');
}
