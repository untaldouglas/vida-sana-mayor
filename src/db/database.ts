// ============================================================
// database.ts – SQLite WASM (sql.js) + IDB para binary blobs
//
// Arquitectura de dos capas:
//   1. SQLite (sql.js en WASM): todos los datos estructurados
//      con PRAGMA foreign_keys = ON — FK reales, ON DELETE CASCADE/SET NULL
//   2. IndexedDB "vsm-blobs": únicamente ArrayBuffer de media
//      (audio, fotos) — demasiado grandes para SQLite en memoria
//
// El caller de storage.ts NUNCA interactúa con esta capa
// directamente; solo usa las funciones exportadas de storage.ts
// ============================================================

import initSqlJs from 'sql.js'
import type { Database, BindParams } from 'sql.js'
import { SCHEMA_SQL } from './schema'

// ── Singleton SQLite ─────────────────────────────────────────

let _db: Database | null = null
let _sqlJsReady = false

const SQL_IDB_NAME  = 'vsm-sqlite'
const SQL_IDB_STORE = 'db'
const SQL_IDB_KEY   = 'main'

export async function getDB(): Promise<Database> {
  if (_db) return _db

  if (!_sqlJsReady) {
    const SQL = await initSqlJs({
      // Vite expone BASE_URL según el campo "base" de vite.config.ts
      locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm`
    })
    _sqlJsReady = true

    const saved = await idbGet<Uint8Array>(SQL_IDB_NAME, SQL_IDB_STORE, SQL_IDB_KEY)
    _db = saved ? new SQL.Database(saved) : new SQL.Database()
  } else {
    // Si _sqlJsReady pero _db es null → re-abre desde IDB
    const SQL = await initSqlJs({
      locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm`
    })
    const saved = await idbGet<Uint8Array>(SQL_IDB_NAME, SQL_IDB_STORE, SQL_IDB_KEY)
    _db = saved ? new SQL.Database(saved) : new SQL.Database()
  }

  // OBLIGATORIO: habilitar FK en cada conexión nueva
  _db.run('PRAGMA foreign_keys = ON')
  _db.run('PRAGMA journal_mode = MEMORY')

  // Aplicar esquema (idempotente: CREATE TABLE IF NOT EXISTS)
  _db.run(SCHEMA_SQL)

  if (!(await idbGet(SQL_IDB_NAME, SQL_IDB_STORE, SQL_IDB_KEY))) {
    await persistSQL()
  }

  return _db
}

/** Serializa la BD SQLite en memoria y la guarda en IDB */
export async function persistSQL(): Promise<void> {
  if (!_db) return
  const data = _db.export()
  await idbPut(SQL_IDB_NAME, SQL_IDB_STORE, SQL_IDB_KEY, data)
}

/**
 * Ejecuta fn(db) dentro de una transacción SQLite.
 * Hace COMMIT si fn no lanza; ROLLBACK en caso contrario.
 * Persiste en IDB después del COMMIT.
 */
export async function withTransaction(fn: (db: Database) => void): Promise<void> {
  const db = await getDB()
  db.run('BEGIN')
  try {
    fn(db)
    db.run('COMMIT')
  } catch (err) {
    db.run('ROLLBACK')
    throw err
  }
  await persistSQL()
}

/** Ejecuta una instrucción SQL sin retorno de filas */
export function runSQL(db: Database, sql: string, params?: unknown[]): void {
  db.run(sql, (params ?? []) as BindParams)
}

/** Ejecuta una consulta SQL y devuelve las filas como objetos */
export function querySQL<T extends Record<string, unknown>>(
  db: Database, sql: string, params?: unknown[]
): T[] {
  const stmt = db.prepare(sql)
  if (params?.length) stmt.bind(params as BindParams)
  const rows: T[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return rows
}

// ── Binary blobs (IDB separado "vsm-blobs") ──────────────────
// Los FK de SQL garantizan que media_files.id sea válido;
// el blob correspondiente en IDB es limpiado explícitamente
// ANTES de que la fila sea eliminada de media_files.

const BLOB_IDB_NAME  = 'vsm-blobs'
const BLOB_IDB_STORE = 'blobs'

export async function saveBlob(id: string, data: ArrayBuffer): Promise<void> {
  await idbPut(BLOB_IDB_NAME, BLOB_IDB_STORE, id, data)
}

export async function loadBlob(id: string): Promise<ArrayBuffer | null> {
  return idbGet<ArrayBuffer>(BLOB_IDB_NAME, BLOB_IDB_STORE, id)
}

export async function deleteBlob(id: string): Promise<void> {
  await idbDelete(BLOB_IDB_NAME, BLOB_IDB_STORE, id)
}

// ── Helpers de IndexedDB (raw) ────────────────────────────────

function openIDB(name: string, store: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(store)) {
        req.result.createObjectStore(store)
      }
    }
    req.onsuccess  = () => resolve(req.result)
    req.onerror    = () => reject(req.error)
  })
}

async function idbGet<T>(dbName: string, store: string, key: string): Promise<T | null> {
  const db = await openIDB(dbName, store)
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onsuccess = () => resolve((req.result as T) ?? null)
    req.onerror   = () => reject(req.error)
  })
}

async function idbPut(dbName: string, store: string, key: string, value: unknown): Promise<void> {
  const db = await openIDB(dbName, store)
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

async function idbDelete(dbName: string, store: string, key: string): Promise<void> {
  const db = await openIDB(dbName, store)
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}
