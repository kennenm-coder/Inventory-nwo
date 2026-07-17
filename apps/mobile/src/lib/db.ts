import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync("scanvault.db");
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sheet_id TEXT NOT NULL,
        row_id TEXT,
        action TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS cached_rows (
        id TEXT PRIMARY KEY,
        sheet_id TEXT NOT NULL,
        barcode TEXT,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS cached_sheets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }
  return db;
}

export async function cacheSheetsLocally(sheets: unknown[]) {
  const database = await getDb();
  for (const sheet of sheets as Array<{ id: string; name: string }>) {
    await database.runAsync(
      "INSERT OR REPLACE INTO cached_sheets (id, name, data, updated_at) VALUES (?, ?, ?, datetime('now'))",
      [sheet.id, sheet.name, JSON.stringify(sheet)],
    );
  }
}

export async function getCachedSheets(): Promise<unknown[]> {
  const database = await getDb();
  const results = await database.getAllAsync("SELECT data FROM cached_sheets ORDER BY name");
  return (results as Array<{ data: string }>).map((r) => JSON.parse(r.data));
}

export async function cacheRowsLocally(sheetId: string, rows: unknown[]) {
  const database = await getDb();
  for (const row of rows as Array<{ id: string; barcode?: string }>) {
    await database.runAsync(
      "INSERT OR REPLACE INTO cached_rows (id, sheet_id, barcode, data, updated_at) VALUES (?, ?, ?, ?, datetime('now'))",
      [row.id, sheetId, (row as Record<string, unknown>).barcode as string || null, JSON.stringify(row)],
    );
  }
}

export async function getCachedRows(sheetId: string): Promise<unknown[]> {
  const database = await getDb();
  const results = await database.getAllAsync(
    "SELECT data FROM cached_rows WHERE sheet_id = ? ORDER BY updated_at DESC",
    [sheetId],
  );
  return (results as Array<{ data: string }>).map((r) => JSON.parse(r.data));
}

export async function addPendingChange(sheetId: string, rowId: string | null, action: string, data: unknown) {
  const database = await getDb();
  await database.runAsync(
    "INSERT INTO pending_changes (sheet_id, row_id, action, data) VALUES (?, ?, ?, ?)",
    [sheetId, rowId, action, JSON.stringify(data)],
  );
}

export async function getPendingChanges(): Promise<Array<{ id: number; sheet_id: string; row_id: string | null; action: string; data: string }>> {
  const database = await getDb();
  const results = await database.getAllAsync("SELECT * FROM pending_changes ORDER BY id ASC");
  return results as Array<{ id: number; sheet_id: string; row_id: string | null; action: string; data: string }>;
}

export async function removePendingChange(id: number) {
  const database = await getDb();
  await database.runAsync("DELETE FROM pending_changes WHERE id = ?", [id]);
}

export async function getPendingCount(): Promise<number> {
  const database = await getDb();
  const result = await database.getFirstAsync("SELECT COUNT(*) as count FROM pending_changes");
  return (result as { count: number })?.count || 0;
}
