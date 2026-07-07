import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '../utils/logger';
import { logError } from '../services/sentry';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbUserId: string | null = null;

export async function ensureUserDatabase(userId: string): Promise<SQLite.SQLiteDatabase> {
  if (dbUserId === userId && dbInstance) {
    return dbInstance;
  }
  await closeUserDatabase();
  try {
    const db = await SQLite.openDatabaseAsync(`ascen_${userId}.db`);
    dbInstance = db;
    dbUserId = userId;
    return db;
  } catch (e) {
    const error = e instanceof Error ? e : new Error('Failed to open SQLite database');
    logError(error, { context: 'ensureUserDatabase', userId });
    throw error;
  }
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

/**
 * Deleta o arquivo SQLite local do usuário (LGPD Art. 18 VI — exclusão real).
 * Fecha a conexão ativa e remove o arquivo .db do FileSystem.
 * Idempotente.
 */
export async function deleteUserDatabase(userId: string): Promise<void> {
  await closeUserDatabase();
  try {
    const sqliteDir = `${FileSystem.documentDirectory}SQLite/`;
    const dbPath = `${sqliteDir}ascen_${userId}.db`;
    const info = await FileSystem.getInfoAsync(dbPath);
    if (info.exists) {
      await FileSystem.deleteAsync(dbPath, { idempotent: true });
    }
    // Arquivos auxiliares do SQLite (WAL, SHM) também devem ser removidos
    for (const suffix of ['-wal', '-shm', '-journal']) {
      const auxPath = `${sqliteDir}ascen_${userId}.db${suffix}`;
      try {
        const auxInfo = await FileSystem.getInfoAsync(auxPath);
        if (auxInfo.exists) {
          await FileSystem.deleteAsync(auxPath, { idempotent: true });
        }
      } catch {
        // Ignora arquivos auxiliares inexistentes
      }
    }
  } catch (e) {
    const error = e instanceof Error ? e : new Error('Failed to delete SQLite database');
    logError(error, { context: 'deleteUserDatabase', userId });
    logger.warn('Erro ao deletar arquivo SQLite:', error.message);
  }
}