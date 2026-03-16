import { Configuracion, actualizarConfiguracion } from './database';

// Gas LP: densidad promedio ≈ 0.51 kg/L (conversión de precio por kg → precio por litro)
const KG_A_LITRO = 0.51;

// Actualizar precio máximo cada 7 días (la CRE publica precios semanalmente)
const DIAS_CACHE = 7;

// Factores regionales relativos al promedio nacional.
// Se aplican sobre el precio nacional calculado desde la API.
const FACTORES_REGIONALES: [string[], number][] = [
    [['coahuila'], 0.88],
    [['veracruz', 'boca del río'], 0.97],
    [['puebla'], 0.98],
    [['toluca', 'ciudad de méxico', 'cdmx', 'estado de méxico', 'edomex'], 1.00],
    [['tijuana', 'mexicali', 'baja california'], 1.00],
    [['baja california sur'], 1.18],
];

// Precios de respaldo por región (usados si la API falla)
const PRECIOS_RESPALDO: [string[], number][] = [
    [['coahuila'], 8.97],
    [['veracruz', 'boca del río'], 9.89],
    [['puebla'], 10.01],
    [['toluca', 'ciudad de méxico', 'cdmx', 'estado de méxico', 'edomex'], 10.23],
    [['tijuana', 'mexicali'], 10.25],
    [['baja california sur'], 12.03],
];

function getFactorRegional(config: Configuracion): number {
    const region = `${config.estado} ${config.municipio}`.toLowerCase();
    for (const [claves, factor] of FACTORES_REGIONALES) {
        if (claves.some(c => region.includes(c))) return factor;
    }
    return 1.0;
}

function getPrecioRespaldo(config: Configuracion): number {
    const region = `${config.estado} ${config.municipio}`.toLowerCase();
    for (const [claves, precio] of PRECIOS_RESPALDO) {
        if (claves.some(c => region.includes(c))) return precio;
    }
    return 10.23; // Promedio nacional de respaldo
}

/**
 * Descarga el CSV de precios del Gas LP desde la API de la CNE (datos.gob.mx)
 * y calcula el precio promedio nacional de la última semana en MXN/litro.
 * Patrón de URL: lp_dis_pre_MMAAAA.csv (actualización mensual)
 */
async function fetchPrecioNacionalDesdeAPI(): Promise<number> {
    const ahora = new Date();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const anio = ahora.getFullYear();
    const url = `https://repodatos.atdt.gob.mx/api_update/cne/gas_licuado_de_petroleo/lp_dis_pre_${mes}${anio}.csv`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        const lines = text.trim().split('\n');
        if (lines.length < 2) throw new Error('CSV vacío o sin datos');

        // Filtrar precios de los últimos 7 días
        const semanaAtras = new Date();
        semanaAtras.setDate(semanaAtras.getDate() - 7);

        const precios: number[] = [];
        for (const line of lines.slice(1)) { // omitir encabezado
            const parts = line.trim().split(',');
            if (parts.length >= 3) {
                const fecha = new Date(parts[0]);
                const precio = parseFloat(parts[2]);
                // Precios válidos: entre 5 y 100 MXN/kg
                if (!isNaN(fecha.getTime()) && fecha >= semanaAtras && precio > 5 && precio < 100) {
                    precios.push(precio);
                }
            }
        }

        if (precios.length === 0) throw new Error('Sin precios recientes en el CSV');

        const promedio = precios.reduce((a, b) => a + b, 0) / precios.length;
        // Convertir de MXN/kg a MXN/litro
        return Math.round(promedio * KG_A_LITRO * 100) / 100;

    } catch (e) {
        clearTimeout(timeoutId);
        throw e;
    }
}

/**
 * Obtiene el precio actual del Gas LP para la región del usuario.
 * Primero intenta la API oficial (CRE/CNE), si falla usa precios de respaldo.
 */
export async function fetchCurrentGasPrice(config: Configuracion): Promise<number | null> {
    if (config.pais !== 'México') return null;

    try {
        const precioNacional = await fetchPrecioNacionalDesdeAPI();
        const factor = getFactorRegional(config);
        return Math.round(precioNacional * factor * 100) / 100;
    } catch (error) {
        console.warn('API de precios no disponible, usando precio de respaldo:', error);
        return getPrecioRespaldo(config);
    }
}

/**
 * Intenta obtener el precio SOLO desde la API (sin fallback).
 * Retorna null si no hay internet o la API no está disponible.
 * Usar cuando se necesita saber si el precio es real o no.
 */
export async function fetchGasPriceOnline(config: Configuracion): Promise<number | null> {
    if (config.pais !== 'México') return null;
    try {
        const precioNacional = await fetchPrecioNacionalDesdeAPI();
        const factor = getFactorRegional(config);
        return Math.round(precioNacional * factor * 100) / 100;
    } catch {
        return null; // Sin internet o API no disponible
    }
}

/**
 * Sincroniza el precio del gas si han pasado más de 7 días desde la última actualización.
 * Se llama automáticamente al iniciar la app.
 */
export async function syncGasPrice(config: Configuracion): Promise<void> {
    if (!config.actualizar_precio_auto) return;

    // Verificar si el precio está vigente (menos de 7 días)
    if (config.precio_ultima_actualizacion) {
        const ultima = new Date(config.precio_ultima_actualizacion);
        const diasTranscurridos = (Date.now() - ultima.getTime()) / (1000 * 60 * 60 * 24);
        if (diasTranscurridos < DIAS_CACHE) return; // Precio vigente, no actualizar
    }

    const nuevoPrecio = await fetchCurrentGasPrice(config);
    if (nuevoPrecio) {
        await actualizarConfiguracion({
            precio_litro_actual: nuevoPrecio,
            precio_ultima_actualizacion: new Date().toISOString(),
        });
    }
}
