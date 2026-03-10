import * as SQLite from 'expo-sqlite';

export interface Lectura {
    id?: number;
    fecha: string; // ISO date string
    nivel_porcentaje: number; // 0-100
    kg_restantes: number;
    notas?: string;
    litros_cargados?: number;
    monto_dinero?: number;
    precio_litro?: number;
    es_carga?: boolean;
}

export interface Configuracion {
    capacidad_litros: number;
    num_personas: number;
    nombre_usuario: string;
    alerta_dias: number;
    onboarding_completo: boolean;
    // Nuevos campos de hábitos (General)
    carga_habitual_litros: number;
    frecuencia_carga_dias: number;
    // Tipo de USO
    tipo_uso: 'casa' | 'negocio'; // Nuevo campo base
    // Perfil Casa
    veces_cocina_dia: number;
    minutos_cocina_dia: number; // Nuevo: tiempo total de uso estufa
    num_personas_baño: number;
    tiempo_baño_min_promedio: number;
    // Perfil Negocio/Restaurante
    tipo_negocio: 'restaurante_grande' | 'restaurante_pequeno' | 'local_grande' | 'local_pequeno' | '';
    num_quemadores_comerciales: number;
    num_freidoras: number;
    tiene_plancha: boolean;
    tiene_horno: boolean;
    horas_operacion_dia: number;
    dias_operacion_semana: number;
    // Precio por defecto
    precio_litro_actual?: number;
}

const DEFAULT_CONFIG: Configuracion = {
    capacidad_litros: 100,
    num_personas: 3,
    nombre_usuario: '',
    alerta_dias: 3,
    onboarding_completo: false,
    carga_habitual_litros: 0,
    frecuencia_carga_dias: 30,
    tipo_uso: 'casa',
    veces_cocina_dia: 2,
    minutos_cocina_dia: 60,
    num_personas_baño: 3,
    tiempo_baño_min_promedio: 15,
    tipo_negocio: '',
    num_quemadores_comerciales: 0,
    num_freidoras: 0,
    tiene_plancha: false,
    tiene_horno: false,
    horas_operacion_dia: 0,
    dias_operacion_semana: 6,
    precio_litro_actual: undefined,
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
      capacidad_litros REAL NOT NULL DEFAULT 30,
      num_personas INTEGER NOT NULL DEFAULT 3,
      nombre_usuario TEXT NOT NULL DEFAULT '',
      alerta_dias INTEGER NOT NULL DEFAULT 3,
      onboarding_completo INTEGER NOT NULL DEFAULT 0,
      carga_habitual_litros REAL DEFAULT 0,
      frecuencia_carga_dias INTEGER DEFAULT 30,
      veces_cocina_dia INTEGER DEFAULT 2,
      num_personas_baño INTEGER DEFAULT 3,
      tiempo_baño_min_promedio INTEGER DEFAULT 15,
      tipo_uso TEXT DEFAULT 'casa',
      minutos_cocina_dia INTEGER DEFAULT 60,
      tipo_negocio TEXT DEFAULT '',
      num_quemadores_comerciales INTEGER DEFAULT 0,
      num_freidoras INTEGER DEFAULT 0,
      tiene_plancha INTEGER DEFAULT 0,
      tiene_horno INTEGER DEFAULT 0,
      horas_operacion_dia REAL DEFAULT 0,
      dias_operacion_semana INTEGER DEFAULT 6
    );

    INSERT OR IGNORE INTO configuracion (id, capacidad_litros, num_personas, nombre_usuario, alerta_dias, onboarding_completo)
    VALUES (1, 30, 3, '', 3, 0);
  `);

    // Migración simple: verificar si existen las nuevas columnas
    try {
        await database.execAsync(`
            ALTER TABLE configuracion ADD COLUMN carga_habitual_litros REAL DEFAULT 0;
            ALTER TABLE configuracion ADD COLUMN frecuencia_carga_dias INTEGER DEFAULT 30;
            ALTER TABLE configuracion ADD COLUMN veces_cocina_dia INTEGER DEFAULT 2;
            ALTER TABLE configuracion ADD COLUMN num_personas_baño INTEGER DEFAULT 3;
            ALTER TABLE configuracion ADD COLUMN tiempo_baño_min_promedio INTEGER DEFAULT 15;
            ALTER TABLE configuracion ADD COLUMN tipo_uso TEXT DEFAULT 'casa';
            ALTER TABLE configuracion ADD COLUMN minutos_cocina_dia INTEGER DEFAULT 60;
            ALTER TABLE configuracion ADD COLUMN tipo_negocio TEXT DEFAULT '';
            ALTER TABLE configuracion ADD COLUMN num_quemadores_comerciales INTEGER DEFAULT 0;
            ALTER TABLE configuracion ADD COLUMN num_freidoras INTEGER DEFAULT 0;
            ALTER TABLE configuracion ADD COLUMN tiene_plancha INTEGER DEFAULT 0;
            ALTER TABLE configuracion ADD COLUMN tiene_horno INTEGER DEFAULT 0;
            ALTER TABLE configuracion ADD COLUMN horas_operacion_dia REAL DEFAULT 0;
            ALTER TABLE configuracion ADD COLUMN dias_operacion_semana INTEGER DEFAULT 6;
        `);
    } catch (e) {
        // Las columnas ya existen o error ignorable
    }

    // Migración para Nueva Carga
    try {
        await database.execAsync(`
            ALTER TABLE lecturas ADD COLUMN es_carga INTEGER DEFAULT 0;
            ALTER TABLE lecturas ADD COLUMN monto_dinero REAL;
            ALTER TABLE lecturas ADD COLUMN precio_litro REAL;
            ALTER TABLE lecturas ADD COLUMN litros_cargados REAL;
            ALTER TABLE configuracion ADD COLUMN precio_litro_actual REAL;
        `).catch(() => { }); // Ignorar si ya existen
    } catch (e) {
        // Las columnas ya existen o error ignorable
    }
}

// ── LECTURAS ────────────────────────────────────────────

export async function insertarLectura(lectura: Omit<Lectura, 'id'>): Promise<number> {
    const database = await getDb();
    const query = `
        INSERT INTO lecturas (fecha, nivel_porcentaje, kg_restantes, notas, es_carga, monto_dinero, precio_litro, litros_cargados)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await database.runAsync(query, [
        lectura.fecha,
        lectura.nivel_porcentaje,
        lectura.kg_restantes,
        lectura.notas || null,
        lectura.es_carga ? 1 : 0,
        lectura.monto_dinero || null,
        lectura.precio_litro || null,
        lectura.litros_cargados || null
    ]);
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
        capacidad_litros: number;
        num_personas: number;
        nombre_usuario: string;
        alerta_dias: number;
        onboarding_completo: number;
        carga_habitual_litros: number;
        frecuencia_carga_dias: number;
        tipo_uso: string;
        veces_cocina_dia: number;
        minutos_cocina_dia: number;
        num_personas_baño: number;
        tiempo_baño_min_promedio: number;
        tipo_negocio: string;
        num_quemadores_comerciales: number;
        num_freidoras: number;
        tiene_plancha: number;
        tiene_horno: number;
        horas_operacion_dia: number;
        dias_operacion_semana: number;
    }>(`SELECT * FROM configuracion WHERE id = 1`);

    if (!row) return DEFAULT_CONFIG;

    return {
        capacidad_litros: row.capacidad_litros,
        num_personas: row.num_personas,
        nombre_usuario: row.nombre_usuario,
        alerta_dias: row.alerta_dias,
        onboarding_completo: row.onboarding_completo === 1,
        carga_habitual_litros: row.carga_habitual_litros || 0,
        frecuencia_carga_dias: row.frecuencia_carga_dias || 30,
        tipo_uso: (row.tipo_uso as 'casa' | 'negocio') || 'casa',
        veces_cocina_dia: row.veces_cocina_dia || 2,
        minutos_cocina_dia: row.minutos_cocina_dia || 60,
        num_personas_baño: row.num_personas_baño || 0,
        tiempo_baño_min_promedio: row.tiempo_baño_min_promedio || 0,
        tipo_negocio: (row.tipo_negocio as 'restaurante_grande' | 'restaurante_pequeno' | 'local_grande' | 'local_pequeno' | '') || '',
        num_quemadores_comerciales: row.num_quemadores_comerciales || 0,
        num_freidoras: row.num_freidoras || 0,
        tiene_plancha: row.tiene_plancha === 1,
        tiene_horno: row.tiene_horno === 1,
        horas_operacion_dia: row.horas_operacion_dia || 0,
        dias_operacion_semana: row.dias_operacion_semana || 6,
    };
}

export async function actualizarConfiguracion(config: Partial<Configuracion>): Promise<void> {
    const database = await getDb();
    const current = await obtenerConfiguracion();
    const merged = { ...current, ...config };

    await database.runAsync(
        `UPDATE configuracion SET
      capacidad_litros = ?,
      num_personas = ?,
      nombre_usuario = ?,
      alerta_dias = ?,
      onboarding_completo = ?,
      carga_habitual_litros = ?,
      frecuencia_carga_dias = ?,
      tipo_uso = ?,
      veces_cocina_dia = ?,
      minutos_cocina_dia = ?,
      num_personas_baño = ?,
      tiempo_baño_min_promedio = ?,
      tipo_negocio = ?,
      num_quemadores_comerciales = ?,
      num_freidoras = ?,
      tiene_plancha = ?,
      tiene_horno = ?,
      horas_operacion_dia = ?,
      dias_operacion_semana = ?
    WHERE id = 1`,
        merged.capacidad_litros,
        merged.num_personas,
        merged.nombre_usuario,
        merged.alerta_dias,
        merged.onboarding_completo ? 1 : 0,
        merged.carga_habitual_litros,
        merged.frecuencia_carga_dias,
        merged.tipo_uso,
        merged.veces_cocina_dia,
        merged.minutos_cocina_dia,
        merged.num_personas_baño,
        merged.tiempo_baño_min_promedio,
        merged.tipo_negocio,
        merged.num_quemadores_comerciales,
        merged.num_freidoras,
        merged.tiene_plancha ? 1 : 0,
        merged.tiene_horno ? 1 : 0,
        merged.horas_operacion_dia,
        merged.dias_operacion_semana
    );
}
