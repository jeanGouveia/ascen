import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbUserId: string | null = null;

export async function ensureUserDatabase(userId: string): Promise<SQLite.SQLiteDatabase> {
  if (dbUserId === userId && dbInstance) {
    return dbInstance;
  }
  await closeUserDatabase();
  const db = await SQLite.openDatabaseAsync(`ascen_${userId}.db`);
  dbInstance = db;
  dbUserId = userId;
  return db;
}

export async function closeUserDatabase(): Promise<void> {
  if (dbInstance) {
    try {
      await dbInstance.closeAsync();
    } catch {
      /* ignore */
    }
  }
  dbInstance = null;
  dbUserId = null;
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) throw new Error('Banco local não inicializado.');
  return dbInstance;
}
