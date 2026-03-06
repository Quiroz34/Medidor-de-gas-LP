/**
 * Motor de IA — Implementado en TypeScript puro (sin librerías externas).
 * Usa Regresión Lineal para estimar la tasa de consumo diario y predecir
 * cuántos días le queda gas al usuario.
 */

import type { Lectura } from './database';

export interface Prediccion {
    dias_restantes: number | null;     // null = no hay suficientes datos
    fecha_recarga: Date | null;
    tasa_consumo_diaria: number | null; // kg/día
    confianza: 'alta' | 'media' | 'baja' | 'insuficiente';
    mensaje: string;
}

// ── REGRESIÓN LINEAL (implementada desde cero) ──────────

interface PuntoDato {
    x: number; // días desde la primera lectura
    y: number; // kg_restantes
}

function regresionLineal(datos: PuntoDato[]): { pendiente: number; intercepto: number } | null {
    const n = datos.length;
    if (n < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (const p of datos) {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumX2 += p.x * p.x;
    }

    const denominador = n * sumX2 - sumX * sumX;
    if (denominador === 0) return null;

    const pendiente = (n * sumXY - sumX * sumY) / denominador;
    const intercepto = (sumY - pendiente * sumX) / n;

    return { pendiente, intercepto };
}

function calcularR2(datos: PuntoDato[], pendiente: number, intercepto: number): number {
    const yMedia = datos.reduce((s, p) => s + p.y, 0) / datos.length;
    let ssTot = 0, ssRes = 0;

    for (const p of datos) {
        const yPred = pendiente * p.x + intercepto;
        ssTot += Math.pow(p.y - yMedia, 2);
        ssRes += Math.pow(p.y - yPred, 2);
    }

    if (ssTot === 0) return 1;
    return 1 - ssRes / ssTot;
}

// ── FUNCIÓN PRINCIPAL DE PREDICCIÓN ─────────────────────

export function predecirConsumo(lecturas: Lectura[]): Prediccion {
    // Ordenar por fecha ascendente
    const ordenadas = [...lecturas].sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );

    if (ordenadas.length === 0) {
        return {
            dias_restantes: null,
            fecha_recarga: null,
            tasa_consumo_diaria: null,
            confianza: 'insuficiente',
            mensaje: 'Registra tu primer nivel de tanque para comenzar.',
        };
    }

    if (ordenadas.length === 1) {
        return {
            dias_restantes: null,
            fecha_recarga: null,
            tasa_consumo_diaria: null,
            confianza: 'insuficiente',
            mensaje: 'Necesitas al menos 2 lecturas para activar la IA. Registra otra mañana.',
        };
    }

    const t0 = new Date(ordenadas[0].fecha).getTime();
    const puntos: PuntoDato[] = ordenadas.map((l) => ({
        x: (new Date(l.fecha).getTime() - t0) / (1000 * 60 * 60 * 24), // días
        y: l.kg_restantes,
    }));

    const regresion = regresionLineal(puntos);
    if (!regresion) {
        return {
            dias_restantes: null,
            fecha_recarga: null,
            tasa_consumo_diaria: null,
            confianza: 'insuficiente',
            mensaje: 'No se pudo calcular el consumo con los datos actuales.',
        };
    }

    const { pendiente, intercepto } = regresion;
    const tasaConsumo = Math.abs(pendiente); // kg/día (pendiente negativa = consumo)

    if (tasaConsumo < 0.001) {
        return {
            dias_restantes: null,
            fecha_recarga: null,
            tasa_consumo_diaria: 0,
            confianza: 'baja',
            mensaje: 'No se detecta consumo. Verifica las lecturas registradas.',
        };
    }

    // Predecir días hasta llegar a 0 kg desde ahora
    const ultimaLectura = ordenadas[ordenadas.length - 1];
    const kgActuales = ultimaLectura.kg_restantes;
    const diasRestantes = Math.round(kgActuales / tasaConsumo);

    const fechaRecarga = new Date(ultimaLectura.fecha);
    fechaRecarga.setDate(fechaRecarga.getDate() + diasRestantes);

    // Calcular confianza usando R²
    const r2 = calcularR2(puntos, pendiente, intercepto);
    let confianza: Prediccion['confianza'];
    if (ordenadas.length >= 5 && r2 >= 0.85) {
        confianza = 'alta';
    } else if (ordenadas.length >= 3 || r2 >= 0.6) {
        confianza = 'media';
    } else {
        confianza = 'baja';
    }

    let mensaje = '';
    if (diasRestantes <= 0) {
        mensaje = '⚠️ ¡Tu tanque está casi vacío! Recarga pronto.';
    } else if (diasRestantes <= 3) {
        mensaje = `⚠️ Solo quedan ${diasRestantes} días de gas. ¡Recarga pronto!`;
    } else if (diasRestantes <= 7) {
        mensaje = `Quedan aprox. ${diasRestantes} días. Considera agendar tu recarga.`;
    } else {
        mensaje = `Tienes gas para aproximadamente ${diasRestantes} días.`;
    }

    return {
        dias_restantes: Math.max(0, diasRestantes),
        fecha_recarga: fechaRecarga,
        tasa_consumo_diaria: Math.round(tasaConsumo * 100) / 100,
        confianza,
        mensaje,
    };
}

// ── FUNCIÓN AUXILIAR: calcular kg desde porcentaje ──────

export function porcentajeAKg(porcentaje: number, capacidad_kg: number): number {
    return Math.round((porcentaje / 100) * capacidad_kg * 100) / 100;
}

export function kgAPorcentaje(kg: number, capacidad_kg: number): number {
    return Math.round((kg / capacidad_kg) * 100);
}

// ── COLOR DEL GAUGE según nivel ─────────────────────────

export function colorNivel(porcentaje: number): string {
    if (porcentaje > 50) return '#4ADE80';  // verde
    if (porcentaje > 20) return '#FACC15';  // amarillo
    return '#F87171';                        // rojo
}
