import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { Transaction, TxType, Goal } from '../types';
import type { Category } from '../types';
import { ensureUserDatabase as _ensureUserDatabase, getDb, closeUserDatabase } from './dbInstance';
import { enqueueSync } from '../services/sync/outbox';

const nowIso = () => new Date().toISOString();

type RecurringFrequency = 'monthly' | 'weekly' | 'yearly';

export type LocalRecurringRow = {
  id: string;
  type: TxType;
  description: string;
  amount: number;
  category: string;
  category_icon: string;
  category_color: string;
  payment_method: string;
  day_of_month: number;
  frequency: RecurringFrequency;
  active: number;
  last_confirmed: string | null;
  starts_on: string;
  updated_at: string;
};

export async function ensureUserDatabase(userId: string): Promise<SQLite.SQLiteDatabase> {
  const db = await _ensureUserDatabase(userId);
  await initSchema(db);
  await migrateSchema(db);
  return db;
}

export { getDb, closeUserDatabase };

async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      category_icon TEXT NOT NULL,
      category_color TEXT NOT NULL,
      category_id TEXT,
      date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      is_installment INTEGER NOT NULL DEFAULT 0,
      installment_info TEXT,
      is_fixed INTEGER NOT NULL DEFAULT 0,
      is_paid INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      family_id TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      type TEXT NOT NULL,
      family_id TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS recurring_rules (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      category_icon TEXT NOT NULL,
      category_color TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      day_of_month INTEGER NOT NULL,
      frequency TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      last_confirmed TEXT,
      starts_on TEXT NOT NULL DEFAULT (date('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS meta_kv (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date DESC);
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      target REAL NOT NULL,
      current REAL NOT NULL DEFAULT 0,
      deadline TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_recurring_day ON recurring_rules(day_of_month);
  `);
}

async function tableHasColumn(db: SQLite.SQLiteDatabase, table: string, column: string): Promise<boolean> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return cols.some(c => c.name === column);
}

/** Migrações incrementais (colunas de sync) — verifica antes de ALTER. */
async function migrateSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  const addCol = async (table: string, col: string, def: string) => {
    if (await tableHasColumn(db, table, col)) return;
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  };

  await addCol('transactions', 'category_id', 'TEXT');
  await addCol('transactions', 'family_id', 'TEXT');
  await addCol('transactions', 'updated_at', "TEXT DEFAULT (datetime('now'))");
  await addCol('transactions', 'deleted_at', 'TEXT');
  await addCol('categories', 'family_id', 'TEXT');
  await addCol('categories', 'updated_at', "TEXT DEFAULT (datetime('now'))");
  await addCol('categories', 'deleted_at', 'TEXT');
  await addCol('recurring_rules', 'category_id', 'TEXT');
  await addCol('recurring_rules', 'family_id', 'TEXT');
  await addCol('recurring_rules', 'deleted_at', 'TEXT');
  await addCol('recurring_rules', 'starts_on', "TEXT DEFAULT (date('now'))");

  // Garantir goals em DBs antigos (CREATE IF NOT EXISTS na init não roda se DB já existia)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      target REAL NOT NULL,
      current REAL NOT NULL DEFAULT 0,
      deadline TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sync_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await metaSetSchemaVersion(db, 2);
}

const SCHEMA_VERSION_KEY = 'db_schema_version';

async function metaSetSchemaVersion(db: SQLite.SQLiteDatabase, version: number): Promise<void> {
  await db.runAsync(
    `INSERT INTO meta_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [SCHEMA_VERSION_KEY, String(version)]
  );
}

export async function metaGet(key: string): Promise<string | null> {
  const db = getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta_kv WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function metaSet(key: string, value: string): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO meta_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}


function rowToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    type: row.type as TxType,
    amount: Number(row.amount),
    description: String(row.description),
    category: String(row.category),
    categoryIcon: String(row.category_icon),
    categoryColor: String(row.category_color),
    categoryId: row.category_id ? String(row.category_id) : undefined,
    date: String(row.date),
    paymentMethod: String(row.payment_method),
    isInstallment: Boolean(row.is_installment),
    installmentInfo: row.installment_info ? String(row.installment_info) : undefined,
    isFixed: Boolean(row.is_fixed),
    isPaid: Boolean(row.is_paid),
    notes: row.notes ? String(row.notes) : undefined,
  };
}

async function getRowForSync(table: 'transactions' | 'categories' | 'recurring_rules', id: string) {
  const db = getDb();
  return db.getFirstAsync<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
}

export async function listTransactions(): Promise<Transaction[]> {
  const db = getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM transactions ORDER BY date DESC, created_at DESC'
  );
  return rows.map(rowToTransaction);
}

export async function insertTransaction(data: Omit<Transaction, 'id'>): Promise<string> {
  const id = Crypto.randomUUID();
  const updated = nowIso();
  const db = getDb();
  await db.runAsync(
    `INSERT INTO transactions (
      id, type, amount, description, category, category_icon, category_color, category_id,
      date, payment_method, is_installment, installment_info, is_fixed, is_paid, notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.type,
      data.amount,
      data.description,
      data.category,
      data.categoryIcon,
      data.categoryColor,
      data.categoryId ?? null,
      data.date,
      data.paymentMethod,
      data.isInstallment ? 1 : 0,
      data.installmentInfo ?? null,
      data.isFixed ? 1 : 0,
      data.isPaid !== false ? 1 : 0,
      data.notes ?? null,
      updated,
    ]
  );
  const row = await getRowForSync('transactions', id);
  if (row) await enqueueSync('transaction', id, 'upsert', row);
  return id;
}

export async function deleteTransaction(id: string): Promise<void> {
  const row = await getRowForSync('transactions', id);
  const db = getDb();
  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  if (row) await enqueueSync('transaction', id, 'delete', row);
}

export async function updateTransaction(
  id: string,
  patch: Partial<Pick<Transaction, 'isPaid' | 'amount' | 'date' | 'description'>>
): Promise<void> {
  const db = getDb();
  await migrateSchema(db);
  const parts: string[] = [];
  const vals: (string | number)[] = [];
  if (patch.isPaid !== undefined) {
    parts.push('is_paid = ?');
    vals.push(patch.isPaid ? 1 : 0);
  }
  if (patch.amount !== undefined) {
    parts.push('amount = ?');
    vals.push(patch.amount);
  }
  if (patch.date !== undefined) {
    parts.push('date = ?');
    vals.push(patch.date);
  }
  if (patch.description !== undefined) {
    parts.push('description = ?');
    vals.push(patch.description);
  }
  if (parts.length === 0) return;
  parts.push('updated_at = ?');
  vals.push(nowIso());
  vals.push(id);
  await db.runAsync(`UPDATE transactions SET ${parts.join(', ')} WHERE id = ?`, vals);
  const row = await getRowForSync('transactions', id);
  if (row) await enqueueSync('transaction', id, 'upsert', row);
}

export async function deleteUnpaidRecurringTxsForRule(ruleId: string): Promise<void> {
  const note = `recurring_rule:${ruleId}`;
  const db = getDb();
  const rows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM transactions WHERE notes = ? AND is_fixed = 1 AND is_paid = 0`,
    [note]
  );
  for (const row of rows) {
    await deleteTransaction(row.id);
  }
}

export async function listCustomCategories(): Promise<Category[]> {
  const db = getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM categories ORDER BY created_at ASC'
  );
  return rows.map(r => ({
    id: String(r.id),
    name: String(r.name),
    icon: String(r.icon),
    color: String(r.color),
    type: r.type as Category['type'],
    isDefault: false,
  }));
}

export async function insertCategory(data: Omit<Category, 'id' | 'isDefault'>): Promise<string> {
  const id = Crypto.randomUUID();
  const updated = nowIso();
  const db = getDb();
  await db.runAsync(
    `INSERT INTO categories (id, name, icon, color, type, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.icon, data.color, data.type, updated]
  );
  const row = await getRowForSync('categories', id);
  if (row) await enqueueSync('category', id, 'upsert', row);
  return id;
}

export async function updateCategory(
  id: string,
  data: Partial<Omit<Category, 'id' | 'isDefault'>>
): Promise<void> {
  const db = getDb();
  const parts: string[] = [];
  const vals: (string | number)[] = [];
  if (data.name !== undefined) {
    parts.push('name = ?');
    vals.push(data.name);
  }
  if (data.icon !== undefined) {
    parts.push('icon = ?');
    vals.push(data.icon);
  }
  if (data.color !== undefined) {
    parts.push('color = ?');
    vals.push(data.color);
  }
  if (data.type !== undefined) {
    parts.push('type = ?');
    vals.push(data.type);
  }
  parts.push("updated_at = ?");
  vals.push(nowIso());
  vals.push(id);
  await db.runAsync(`UPDATE categories SET ${parts.join(', ')} WHERE id = ?`, vals);
  const row = await getRowForSync('categories', id);
  if (row) await enqueueSync('category', id, 'upsert', row);
}

export async function deleteCategory(id: string): Promise<void> {
  const row = await getRowForSync('categories', id);
  const db = getDb();
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  if (row) await enqueueSync('category', id, 'delete', row);
}

export async function listRecurringRows(): Promise<LocalRecurringRow[]> {
  const db = getDb();
  return db.getAllAsync<LocalRecurringRow>(
    'SELECT * FROM recurring_rules ORDER BY day_of_month ASC'
  );
}

export async function insertRecurringRow(input: {
  type: TxType;
  description: string;
  amount: number;
  category: string;
  categoryIcon: string;
  categoryColor: string;
  paymentMethod: string;
  dayOfMonth: number;
  frequency: RecurringFrequency;
  active: boolean;
  startsOn: string;
}): Promise<string> {
  const id = Crypto.randomUUID();
  const now = nowIso();
  const db = getDb();
  await db.runAsync(
    `INSERT INTO recurring_rules (
      id, type, description, amount, category, category_icon, category_color,
      payment_method, day_of_month, frequency, active, last_confirmed, starts_on, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    [
      id,
      input.type,
      input.description,
      input.amount,
      input.category,
      input.categoryIcon,
      input.categoryColor,
      input.paymentMethod,
      input.dayOfMonth,
      input.frequency,
      input.active ? 1 : 0,
      input.startsOn,
      now,
    ]
  );
  const row = await getRowForSync('recurring_rules', id);
  if (row) await enqueueSync('recurring', id, 'upsert', row);
  return id;
}

export async function updateRecurringRow(
  id: string,
  patch: Partial<{
    type: TxType;
    description: string;
    amount: number;
    category: string;
    categoryIcon: string;
    categoryColor: string;
    paymentMethod: string;
    dayOfMonth: number;
    frequency: RecurringFrequency;
    active: boolean;
    lastConfirmed: string | null;
    startsOn: string;
  }>
): Promise<void> {
  const db = getDb();
  const parts: string[] = [];
  const vals: (string | number | null)[] = [];
  if (patch.type !== undefined) {
    parts.push('type = ?');
    vals.push(patch.type);
  }
  if (patch.description !== undefined) {
    parts.push('description = ?');
    vals.push(patch.description);
  }
  if (patch.amount !== undefined) {
    parts.push('amount = ?');
    vals.push(patch.amount);
  }
  if (patch.category !== undefined) {
    parts.push('category = ?');
    vals.push(patch.category);
  }
  if (patch.categoryIcon !== undefined) {
    parts.push('category_icon = ?');
    vals.push(patch.categoryIcon);
  }
  if (patch.categoryColor !== undefined) {
    parts.push('category_color = ?');
    vals.push(patch.categoryColor);
  }
  if (patch.paymentMethod !== undefined) {
    parts.push('payment_method = ?');
    vals.push(patch.paymentMethod);
  }
  if (patch.dayOfMonth !== undefined) {
    parts.push('day_of_month = ?');
    vals.push(patch.dayOfMonth);
  }
  if (patch.frequency !== undefined) {
    parts.push('frequency = ?');
    vals.push(patch.frequency);
  }
  if (patch.active !== undefined) {
    parts.push('active = ?');
    vals.push(patch.active ? 1 : 0);
  }
  if (patch.lastConfirmed !== undefined) {
    parts.push('last_confirmed = ?');
    vals.push(patch.lastConfirmed);
  }
  if (patch.startsOn !== undefined) {
    parts.push('starts_on = ?');
    vals.push(patch.startsOn);
  }
  parts.push('updated_at = ?');
  vals.push(nowIso());
  vals.push(id);
  await db.runAsync(`UPDATE recurring_rules SET ${parts.join(', ')} WHERE id = ?`, vals);
  const row = await getRowForSync('recurring_rules', id);
  if (row) await enqueueSync('recurring', id, 'upsert', row);
}

function rowToGoal(row: Record<string, unknown>): Goal {
  return {
    id: String(row.id),
    name: String(row.name),
    icon: String(row.icon),
    color: String(row.color),
    target: Number(row.target),
    current: Number(row.current),
    deadline: row.deadline ? String(row.deadline) : undefined,
    completed: Boolean(row.completed),
  };
}

export async function listGoals(): Promise<Goal[]> {
  const db = getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM goals ORDER BY completed ASC, created_at ASC'
  );
  return rows.map(rowToGoal);
}

export async function insertGoal(data: Omit<Goal, 'id'>): Promise<string> {
  const id = Crypto.randomUUID();
  const updated = nowIso();
  const db = getDb();
  await db.runAsync(
    `INSERT INTO goals (id, name, icon, color, target, current, deadline, completed, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.icon,
      data.color,
      data.target,
      data.current,
      data.deadline ?? null,
      data.completed ? 1 : 0,
      updated,
    ]
  );
  return id;
}

export async function updateGoal(id: string, patch: Partial<Omit<Goal, 'id'>>): Promise<void> {
  const db = getDb();
  const parts: string[] = [];
  const vals: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    parts.push('name = ?');
    vals.push(patch.name);
  }
  if (patch.icon !== undefined) {
    parts.push('icon = ?');
    vals.push(patch.icon);
  }
  if (patch.color !== undefined) {
    parts.push('color = ?');
    vals.push(patch.color);
  }
  if (patch.target !== undefined) {
    parts.push('target = ?');
    vals.push(patch.target);
  }
  if (patch.current !== undefined) {
    parts.push('current = ?');
    vals.push(patch.current);
  }
  if (patch.deadline !== undefined) {
    parts.push('deadline = ?');
    vals.push(patch.deadline ?? null);
  }
  if (patch.completed !== undefined) {
    parts.push('completed = ?');
    vals.push(patch.completed ? 1 : 0);
  }
  if (!parts.length) return;
  parts.push('updated_at = ?');
  vals.push(nowIso());
  vals.push(id);
  await db.runAsync(`UPDATE goals SET ${parts.join(', ')} WHERE id = ?`, vals);
}

export async function deleteGoal(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
}

export async function deleteRecurringRow(id: string): Promise<void> {
  const row = await getRowForSync('recurring_rules', id);
  const db = getDb();
  await db.runAsync('DELETE FROM recurring_rules WHERE id = ?', [id]);
  if (row) await enqueueSync('recurring', id, 'delete', row);
}

/** Export bruto para snapshot (sem avatar). */
export async function exportTablesForSnapshot(): Promise<{
  transactions: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  recurring: Record<string, unknown>[];
  goals: Record<string, unknown>[];
}> {
  const db = getDb();
  const transactions = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM transactions');
  const categories = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM categories');
  const recurring = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM recurring_rules');
  const goals = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM goals');
  return { transactions, categories, recurring, goals };
}

export type SnapshotTablesV1 = {
  v: 1;
  exportedAt: string;
  transactions: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  recurring: Record<string, unknown>[];
  goals?: Record<string, unknown>[];
  avatarBase64?: string | null;
};

export function bindNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function bindStr(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

export function bindStrNull(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}

export function bindActive01(v: unknown): number {
  if (v === false || v === 0 || v === '0') return 0;
  if (v === true || v === 1 || v === '1') return 1;
  if (v === null || v === undefined) return 1;
  return Number(v) !== 0 ? 1 : 0;
}

export async function replaceAllDataFromSnapshot(payload: SnapshotTablesV1): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM transactions');
    await db.execAsync('DELETE FROM categories');
    await db.execAsync('DELETE FROM recurring_rules');
    for (const row of payload.transactions) {
      await db.runAsync(
        `INSERT INTO transactions (
          id, type, amount, description, category, category_icon, category_color,
          date, payment_method, is_installment, installment_info, is_fixed, is_paid, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`,
        [
          bindStr(row.id),
          bindStr(row.type),
          bindNum(row.amount),
          bindStr(row.description),
          bindStr(row.category),
          bindStr(row.category_icon),
          bindStr(row.category_color),
          bindStr(row.date),
          bindStr(row.payment_method),
          bindNum(row.is_installment, 0),
          bindStrNull(row.installment_info),
          bindNum(row.is_fixed, 0),
          bindNum(row.is_paid, 0),
          bindStrNull(row.notes),
          bindStrNull(row.created_at),
        ]
      );
    }
    for (const row of payload.categories) {
      await db.runAsync(
        `INSERT INTO categories (id, name, icon, color, type, created_at) VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`,
        [
          bindStr(row.id),
          bindStr(row.name),
          bindStr(row.icon),
          bindStr(row.color),
          bindStr(row.type),
          bindStrNull(row.created_at),
        ]
      );
    }
    for (const row of payload.recurring) {
      await db.runAsync(
        `INSERT INTO recurring_rules (
          id, type, description, amount, category, category_icon, category_color,
          payment_method, day_of_month, frequency, active, last_confirmed, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`,
        [
          bindStr(row.id),
          bindStr(row.type),
          bindStr(row.description),
          bindNum(row.amount),
          bindStr(row.category),
          bindStr(row.category_icon),
          bindStr(row.category_color),
          bindStr(row.payment_method),
          bindNum(row.day_of_month),
          bindStr(row.frequency),
          bindActive01(row.active),
          bindStrNull(row.last_confirmed),
          bindStrNull(row.updated_at),
        ]
      );
    }
    // Restaurar metas (campo opcional para compatibilidade com backups antigos)
    if (payload.goals && payload.goals.length > 0) {
      await db.execAsync('DELETE FROM goals');
      for (const row of payload.goals) {
        await db.runAsync(
          `INSERT INTO goals (id, name, icon, color, target, current, deadline, completed, updated_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`,
          [
            bindStr(row.id),
            bindStr(row.name),
            bindStr(row.icon),
            bindStr(row.color),
            bindNum(row.target),
            bindNum(row.current, 0),
            bindStrNull(row.deadline),
            bindNum(row.completed, 0),
            bindStrNull(row.updated_at) ?? nowIso(),
            bindStrNull(row.created_at),
          ]
        );
      }
    }
  });
}