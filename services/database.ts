import * as SQLite from 'expo-sqlite';

export interface Lectura {
    id?: number;
    fecha: string; // ISO date string
    nivel_porcentaje: number; // 0-100
    kg_restantes: number;
    notas?: string;
}

export interface Configuracion {
    capacidad_kg: number;
    num_personas: number;
    nombre_usuario: string;
    alerta_dias: number; // cuántos días antes avisar
    onboarding_completo: boolean;
}

const DEFAULT_CONFIG: Configuracion = {
    capacidad_kg: 30,
    num_personas: 3,
    nombre_usuario: '',
    alerta_dias: 3,
    onboarding_completo: false,
};

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!db) {
        db = await SQLite.openDatabaseAsync('gaslp.db');
    }
    return db;
}

export async function initDatabase(): Promise<void> {
    const database = await getDb();

    await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS lecturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      nivel_porcentaje REAL NOT NULL,
      kg_restantes REAL NOT NULL,
      notas TEXT
    );

    CREATE TABLE IF NOT EXISTS configuracion (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      capacidad_kg REAL NOT NULL DEFAULT 30,
      num_personas INTEGER NOT NULL DEFAULT 3,
      nombre_usuario TEXT NOT NULL DEFAULT '',
      alerta_dias INTEGER NOT NULL DEFAULT 3,
      onboarding_completo INTEGER NOT NULL DEFAULT 0
    );

    INSERT OR IGNORE INTO configuracion (id, capacidad_kg, num_personas, nombre_usuario, alerta_dias, onboarding_completo)
    VALUES (1, 30, 3, '', 3, 0);
  `);
}

// ── LECTURAS ────────────────────────────────────────────

export async function insertarLectura(lectura: Omit<Lectura, 'id'>): Promise<number> {
    const database = await getDb();
    const result = await database.runAsync(
        `INSERT INTO lecturas (fecha, nivel_porcentaje, kg_restantes, notas) VALUES (?, ?, ?, ?)`,
        lectura.fecha,
        lectura.nivel_porcentaje,
        lectura.kg_restantes,
        lectura.notas ?? null,
    );
    return result.lastInsertRowId;
}

export async function obtenerLecturas(): Promise<Lectura[]> {
    const database = await getDb();
    const rows = await database.getAllAsync<Lectura>(
        `SELECT * FROM lecturas ORDER BY fecha DESC`,
    );
    return rows;
}

export async function obtenerUltimasLecturas(limite: number = 10): Promise<Lectura[]> {
    const database = await getDb();
    const rows = await database.getAllAsync<Lectura>(
        `SELECT * FROM lecturas ORDER BY fecha DESC LIMIT ?`,
        limite,
    );
    return rows;
}

export async function eliminarLectura(id: number): Promise<void> {
    const database = await getDb();
    await database.runAsync(`DELETE FROM lecturas WHERE id = ?`, id);
}

export async function eliminarTodasLecturas(): Promise<void> {
    const database = await getDb();
    await database.runAsync(`DELETE FROM lecturas`);
}

// ── CONFIGURACIÓN ───────────────────────────────────────

export async function obtenerConfiguracion(): Promise<Configuracion> {
    const database = await getDb();
    const row = await database.getFirstAsync<{
        capacidad_kg: number;
        num_personas: number;
        nombre_usuario: string;
        alerta_dias: number;
        onboarding_completo: number;
    }>(`SELECT * FROM configuracion WHERE id = 1`);

    if (!row) return DEFAULT_CONFIG;

    return {
        capacidad_kg: row.capacidad_kg,
        num_personas: row.num_personas,
        nombre_usuario: row.nombre_usuario,
        alerta_dias: row.alerta_dias,
        onboarding_completo: row.onboarding_completo === 1,
    };
}

export async function actualizarConfiguracion(config: Partial<Configuracion>): Promise<void> {
    const database = await getDb();
    const current = await obtenerConfiguracion();
    const merged = { ...current, ...config };

    await database.runAsync(
        `UPDATE configuracion SET
      capacidad_kg = ?,
      num_personas = ?,
      nombre_usuario = ?,
      alerta_dias = ?,
      onboarding_completo = ?
    WHERE id = 1`,
        merged.capacidad_kg,
        merged.num_personas,
        merged.nombre_usuario,
        merged.alerta_dias,
        merged.onboarding_completo ? 1 : 0,
    );
}
