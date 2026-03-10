import type { Lectura, Configuracion } from './database';

export interface Prediccion {
    dias_restantes: number | null;     // null = no hay suficientes datos
    fecha_recarga: Date | null;
    tasa_consumo_diaria: number | null; // litros/día
    confianza: 'alta' | 'media' | 'baja' | 'insuficiente' | 'perfil';
    mensaje: string;
}

// ── REGRESIÓN LINEAL (implementada desde cero) ──────────

interface PuntoDato {
    x: number; // días desde la primera lectura
    y: number; // litros_restantes
}

// ... (regresionLineal y calcularR2 se mantienen iguales, pero conceptualmente x es litros) ...

// ── FUNCIÓN PRINCIPAL DE PREDICCIÓN ─────────────────────

export function predecirConsumo(lecturas: Lectura[], config: Configuracion): Prediccion {
    // Ordenar por fecha ascendente
    const ordenadas = [...lecturas].sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );

    // ESCENARIO A: No hay suficientes datos (Regresión no posible)
    // Usamos el perfil del usuario para dar una estimación inicial
    if (ordenadas.length < 2) {
        let tasaEstimada = 0.8;

        if (config.tipo_uso === 'negocio') {
            // Cálculo para Negocios (litros por hora aproximados)
            const consumoQuemadorHora = 0.15; // 150 gramos/litros aprox por hora por quemador
            const consumoFreidoraHora = 0.40; // 400 gramos/litros aprox por hora de freidora
            const consumoPlanchaHora = config.tiene_plancha ? 0.30 : 0;
            const consumoHornoHora = config.tiene_horno ? 0.50 : 0;

            const consumoTotalPorHora =
                (config.num_quemadores_comerciales * consumoQuemadorHora) +
                (config.num_freidoras * consumoFreidoraHora) +
                consumoPlanchaHora + consumoHornoHora;

            // Ajuste por días a la semana
            const factorDias = config.dias_operacion_semana / 7;
            tasaEstimada = (consumoTotalPorHora * config.horas_operacion_dia) * factorDias;

            if (tasaEstimada <= 0) tasaEstimada = 2.0; // Default mínimo para negocios
        } else {
            // Cálculo para Casa
            // Consumo por estufa basado en minutos reportados (ej. 60 min = 1 hora)
            const horasCocina = (config.minutos_cocina_dia || 60) / 60;
            const consumoCocina = horasCocina * 0.15 * config.veces_cocina_dia;

            // Consumo por baño
            const factorBaño = config.tiempo_baño_min_promedio / 15;
            const consumoBaño = config.num_personas_baño * (0.4 * factorBaño);

            tasaEstimada = consumoCocina + consumoBaño;

            // Ajuste con el historial reportado si existe para casas
            if (config.carga_habitual_litros > 0 && config.frecuencia_carga_dias > 0) {
                const tasaReportada = config.carga_habitual_litros / config.frecuencia_carga_dias;
                tasaEstimada = tasaReportada; // LEY
            }

            if (tasaEstimada <= 0) tasaEstimada = 0.8;
        }

        const litrosActuales = ordenadas.length === 1
            ? ordenadas[0].kg_restantes // kg_restantes en DB ahora actúan como litros
            : config.capacidad_litros;

        const fechaBase = ordenadas.length === 1 ? new Date(ordenadas[0].fecha) : new Date();

        const diasTotalesDesdeLectura = Math.round(litrosActuales / tasaEstimada);
        const fechaRecarga = new Date(fechaBase);
        fechaRecarga.setDate(fechaRecarga.getDate() + diasTotalesDesdeLectura);

        const hoy = new Date();
        const diasTranscurridos = ordenadas.length === 1 ? (hoy.getTime() - fechaBase.getTime()) / (1000 * 60 * 60 * 24) : 0;
        const litrosActualesEstimados = Math.max(0, litrosActuales - (diasTranscurridos * tasaEstimada));
        const diasRestantes = Math.round(litrosActualesEstimados / tasaEstimada);

        return {
            dias_restantes: diasRestantes,
            fecha_recarga: fechaRecarga,
            tasa_consumo_diaria: Math.round(tasaEstimada * 100) / 100,
            confianza: 'perfil',
            mensaje: ordenadas.length === 0
                ? 'Basado en tu perfil, estimamos tu consumo inicial. (Tip: Toma foto a tu tanque al recargar).'
                : 'Estimación basada en tu perfil. Registra más niveles para mejorar la precisión y no olvides la foto de tu tanque al recargar.',
        };
    }

    // ESCENARIO B: Regresión lineal con datos reales
    // FILTRO AUTÓNOMO: Solo usar lecturas desde la última "recarga" detectada
    // Se considera recarga si el nivel sube más de un 10%
    let lecturasRecientes = [ordenadas[ordenadas.length - 1]];
    for (let i = ordenadas.length - 2; i >= 0; i--) {
        const actual = ordenadas[i + 1].nivel_porcentaje;
        const anterior = ordenadas[i].nivel_porcentaje;
        if (actual > anterior + 10 || ordenadas[i + 1].es_carga) break; // Detectamos recarga
        lecturasRecientes.unshift(ordenadas[i]);
    }

    // Si solo hay una lectura tras la recarga, volvemos a estimación por perfil
    if (lecturasRecientes.length < 2) {
        let tasaEstimada = 0.8;
        if (config.tipo_uso === 'negocio') {
            const consumoTotalPorHora =
                (config.num_quemadores_comerciales * 0.15) +
                (config.num_freidoras * 0.40) +
                (config.tiene_plancha ? 0.30 : 0) +
                (config.tiene_horno ? 0.50 : 0);
            const factorDias = config.dias_operacion_semana / 7;
            tasaEstimada = (consumoTotalPorHora * config.horas_operacion_dia) * factorDias;
            if (tasaEstimada <= 0) tasaEstimada = 2.0;
        } else {
            const horasCocina = (config.minutos_cocina_dia || 60) / 60;
            const consumoCocina = horasCocina * 0.15 * config.veces_cocina_dia;
            const factorBaño = config.tiempo_baño_min_promedio / 15;
            const consumoBaño = config.num_personas_baño * (0.4 * factorBaño);
            tasaEstimada = consumoCocina + consumoBaño;

            if (config.carga_habitual_litros > 0 && config.frecuencia_carga_dias > 0) {
                tasaEstimada = config.carga_habitual_litros / config.frecuencia_carga_dias;
            }
            if (tasaEstimada <= 0) tasaEstimada = 0.8;
        }

        const ultimaLectura = ordenadas[ordenadas.length - 1];
        const litrosActuales = ultimaLectura.kg_restantes;

        const diasTotalesDesdeLectura = Math.round(litrosActuales / tasaEstimada);
        const fechaRecarga = new Date(ultimaLectura.fecha);
        fechaRecarga.setDate(fechaRecarga.getDate() + diasTotalesDesdeLectura);

        const hoy = new Date();
        const diasTranscurridos = (hoy.getTime() - new Date(ultimaLectura.fecha).getTime()) / (1000 * 60 * 60 * 24);
        const litrosActualesEstimados = Math.max(0, litrosActuales - (diasTranscurridos * tasaEstimada));
        const diasRestantes = Math.round(litrosActualesEstimados / tasaEstimada);

        return {
            dias_restantes: diasRestantes,
            fecha_recarga: fechaRecarga,
            tasa_consumo_diaria: Math.round(tasaEstimada * 100) / 100,
            confianza: 'perfil',
            mensaje: 'Nueva recarga detectada. Estimando según tu perfil hasta tener más lecturas. (¡Toma foto a tu tanque para verificar!)'
        };
    }

    // CALCULAR TASA ESTIMADA DEL PERFIL (Para comparar anomalías)
    let tasaPerfil = 0.8;
    if (config.tipo_uso === 'negocio') {
        const cTotalHora = (config.num_quemadores_comerciales * 0.15) + (config.num_freidoras * 0.40) +
            (config.tiene_plancha ? 0.30 : 0) + (config.tiene_horno ? 0.50 : 0);
        tasaPerfil = Math.max(2.0, (cTotalHora * config.horas_operacion_dia) * (config.dias_operacion_semana / 7));
    } else {
        const hCocina = (config.minutos_cocina_dia || 60) / 60;
        const cCocina = hCocina * 0.15 * config.veces_cocina_dia;
        const cBaño = config.num_personas_baño * (0.4 * (config.tiempo_baño_min_promedio / 15));
        tasaPerfil = Math.max(0.8, cCocina + cBaño);
    }

    const t0 = new Date(lecturasRecientes[0].fecha).getTime();
    const puntos: PuntoDato[] = lecturasRecientes.map((l) => ({
        x: (new Date(l.fecha).getTime() - t0) / (1000 * 60 * 60 * 24), // días
        y: l.kg_restantes,
    }));

    const n = puntos.length;
    // REGRESIÓN LINEAL PONDERADA (Damos más peso a los datos más recientes)
    // El punto más antiguo tendrá peso ~1, el más reciente peso mayor (ej. exponencial o lineal)
    let sumW = 0, sumWX = 0, sumWY = 0, sumWXY = 0, sumWX2 = 0;

    // Encontramos el día máximo (xMax) para aplicar el mayor peso ahí
    const xMax = puntos[puntos.length - 1].x;

    for (const p of puntos) {
        // Peso: 1 base + (qué tan cerca está del final). 
        // Si p.x es 0 (más antiguo), peso = 1. Si p.x == xMax (hoy), peso = 2 o más.
        const w = xMax === 0 ? 1 : 1 + (p.x / xMax);

        sumW += w;
        sumWX += w * p.x;
        sumWY += w * p.y;
        sumWXY += w * p.x * p.y;
        sumWX2 += w * p.x * p.x;
    }

    const denominador = sumW * sumWX2 - sumWX * sumWX;
    if (denominador === 0) return {
        dias_restantes: null, fecha_recarga: null, tasa_consumo_diaria: null,
        confianza: 'insuficiente', mensaje: 'Datos insuficientes para calcular consumo.'
    };

    const pendiente = (sumW * sumWXY - sumWX * sumWY) / denominador;
    const intercepto = (sumWY - pendiente * sumWX) / sumW;
    const tasaConsumo = Math.abs(pendiente);

    // DETECCIÓN DE ANOMALÍAS / FUGAS
    let hayFuga = false;
    // Si la tasa de consumo es inexplicablemente alta (por ejemplo, > 250% del perfil promedio)
    if (tasaConsumo > tasaPerfil * 2.5 && tasaConsumo > 3) {
        hayFuga = true;
    }

    const ultimaLectura = ordenadas[ordenadas.length - 1];
    const litrosActuales = ultimaLectura.kg_restantes;

    // Estimate current level based on time elapsed to ensure days decrease visually
    const fechaBase = new Date(ultimaLectura.fecha);
    const hoy = new Date();
    const diasTranscurridos = (hoy.getTime() - fechaBase.getTime()) / (1000 * 60 * 60 * 24);
    const litrosActualesEstimados = Math.max(0, litrosActuales - (diasTranscurridos * (tasaConsumo || 0.001)));

    // Total duration from the time of the valid reading
    const diasTotalesDesdeLectura = Math.round(litrosActuales / (tasaConsumo || 0.001));

    const fechaRecarga = new Date(ultimaLectura.fecha);
    fechaRecarga.setDate(fechaRecarga.getDate() + diasTotalesDesdeLectura);

    // Days remaining calculated from the estimated updated remaining liters today
    const diasRestantes = Math.round(litrosActualesEstimados / (tasaConsumo || 0.001));

    const yMedia = puntos.reduce((s, p) => s + p.y, 0) / n;
    let ssTot = 0, ssRes = 0;
    for (const p of puntos) {
        const w = xMax === 0 ? 1 : 1 + (p.x / xMax);
        const yPred = pendiente * p.x + intercepto;
        ssTot += w * Math.pow(p.y - yMedia, 2);
        ssRes += w * Math.pow(p.y - yPred, 2);
    }
    const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

    let confianza: Prediccion['confianza'];
    if (n >= 5 && r2 >= 0.85) confianza = 'alta';
    else if (n >= 3 || r2 >= 0.6) confianza = 'media';
    else confianza = 'baja';

    let mensajeFinal = `Tienes gas para aproximadamente ${diasRestantes} días.`;
    if (hayFuga) {
        mensajeFinal = `⚠️ ALERTA: Consumo inusualmente alto detectado (${Math.round(tasaConsumo)} L/día). Asegúrate de que no haya fugas en tu instalación.`;
        confianza = 'baja'; // Reducimos confianza porque es anómalo
    }

    return {
        dias_restantes: diasRestantes,
        fecha_recarga: fechaRecarga,
        tasa_consumo_diaria: Math.round(tasaConsumo * 100) / 100,
        confianza,
        mensaje: mensajeFinal
    };
}

/**
 * Estima el nivel actual (litros) basado en la última lectura y el tiempo transcurrido.
 * Esto permite que el reloj "baje solo" poco a poco.
 */
export function estimarNivelActual(ultimaLectura: Lectura, tasaDiaria: number): number {
    const fechaLectura = new Date(ultimaLectura.fecha).getTime();
    const ahora = new Date().getTime();
    const diasTranscurridos = (ahora - fechaLectura) / (1000 * 60 * 60 * 24);

    const consumoEstimado = diasTranscurridos * tasaDiaria;
    const nivelEstimado = Math.max(0, ultimaLectura.kg_restantes - consumoEstimado);

    return nivelEstimado;
}

// ── FUNCIÓN AUXILIAR: calcular litros desde porcentaje ──────

export function porcentajeALitros(porcentaje: number, capacidad_litros: number): number {
    return Math.round((porcentaje / 100) * capacidad_litros * 100) / 100;
}

export function litrosAPorcentaje(litros: number, capacidad_litros: number): number {
    return Math.round((litros / capacidad_litros) * 100);
}

// ── COLOR DEL GAUGE según nivel ─────────────────────────

export function colorNivel(porcentaje: number): string {
    if (porcentaje > 50) return '#4ADE80';  // verde
    if (porcentaje > 20) return '#FACC15';  // amarillo
    return '#F87171';                        // rojo
}

function regresionLineal(datos: PuntoDato[]): { pendiente: number; intercepto: number } | null {
    const n = datos.length;
    if (n < 2) return null;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (const p of datos) {
        sumX += p.x; sumY += p.y; sumXY += p.x * p.y; sumX2 += p.x * p.x;
    }
    const denominador = n * sumX2 - sumX * sumX;
    if (denominador === 0) return null;
    const pendiente = (n * sumXY - sumX * sumY) / denominador;
    const intercepto = (sumY - pendiente * sumX) / n;
    return { pendiente, intercepto };
}

// Helpers para recargas
export const calcularNivelCarga = (
    litrosCargados: number,
    capacidadTotal: number,
    nivelAnteriorPorcentaje: number
): number => {
    const porcentajeCargado = (litrosCargados / capacidadTotal) * 100;
    const nuevoNivel = nivelAnteriorPorcentaje + porcentajeCargado;
    return Math.min(Math.round(nuevoNivel), 100);
};

export const dineroALitros = (monto: number, precioLitro: number): number => {
    if (!precioLitro || precioLitro <= 0) return 0;
    return monto / precioLitro;
};
