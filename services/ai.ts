import type { Lectura, Configuracion, EventoExtra, FactorUsuario } from './database';

export interface Prediccion {
    dias_restantes: number | null;
    fecha_recarga: Date | null;
    tasa_consumo_diaria: number | null;
    confianza: 'alta' | 'media' | 'baja' | 'insuficiente' | 'perfil';
    mensaje: string;
    alertas?: string[];
    costo_estimado?: number | null;   // NUEVO: costo estimado próxima recarga
}

// ── FACTORES ESTACIONALES POR ZONA CLIMÁTICA ────────────────────────────────
// Cada zona tiene sus propios multiplicadores por mes (1.0 = consumo base)
const FACTORES_POR_ZONA: Record<'norte' | 'centro' | 'sur', Record<number, number>> = {
    norte: {
        0: 1.55, // Enero — inviernos muy fríos (Monterrey, Chihuahua, etc.)
        1: 1.50,
        2: 1.20,
        3: 1.00,
        4: 0.90,
        5: 0.85,
        6: 0.85,
        7: 0.88,
        8: 0.95,
        9: 1.10,
        10: 1.40,
        11: 1.60,
    },
    centro: {
        0: 1.25, // Enero (CDMX, Guadalajara, Puebla)
        1: 1.20,
        2: 1.05,
        3: 0.95,
        4: 0.90,
        5: 0.85,
        6: 0.85,
        7: 0.90,
        8: 0.95,
        9: 1.10,
        10: 1.25,
        11: 1.35,
    },
    sur: {
        0: 1.05, // Enero — climas cálidos todo el año (Cancún, Mérida, Oaxaca)
        1: 1.05,
        2: 1.00,
        3: 0.98,
        4: 0.95,
        5: 0.95,
        6: 0.95,
        7: 0.95,
        8: 0.98,
        9: 1.00,
        10: 1.05,
        11: 1.10,
    },
};

// ── ALERTA DINÁMICA DE DÍA DE RECARGA ───────────────────────────────────────
const DIAS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function getAlertaDiaRecarga(fechaRecarga: Date, diasRestantes: number): string | null {
    if (diasRestantes <= 0 || diasRestantes > 20) return null; // Solo avisamos si es relevante
    const diaRecarga = fechaRecarga.getDay(); // 0=dom ... 6=sáb

    // Calcular fecha sugerida (2 días antes)
    const fechaSugerida = new Date(fechaRecarga);
    fechaSugerida.setDate(fechaSugerida.getDate() - 2);
    const diaSugerido = DIAS_ES[fechaSugerida.getDay()];
    const fechaFmt = `${fechaRecarga.getDate()}/${fechaRecarga.getMonth() + 1}`;

    // Si se termina en fin de semana, el mensaje es más urgente
    const esFinDeSemana = diaRecarga === 0 || diaRecarga === 6;

    if (esFinDeSemana) {
        return `📅 Tu gas se terminará el ${DIAS_ES[diaRecarga]} ${fechaFmt}. Los gaseros suelen no trabajar ese día — recarga el ${diaSugerido}.`;
    } else {
        return `📅 Tu gas se terminará el ${DIAS_ES[diaRecarga]} ${fechaFmt}. Te sugerimos recargar el ${diaSugerido} para no quedarte sin gas.`;
    }
}

interface PuntoDato {
    x: number; // días desde la primera lectura
    y: number; // litros_restantes
}

// ── TASA HISTÓRICA MULTI-CICLO ───────────────────────────────────────────────
/**
 * Extrae todos los ciclos de consumo del historial completo y calcula
 * un promedio ponderado. Los ciclos más recientes tienen más peso.
 * Retorna null si no hay suficientes datos históricos.
 */
function calcularTasaHistorica(todasLasLecturas: Lectura[]): number | null {
    if (todasLasLecturas.length < 4) return null;

    const ordenadas = [...todasLasLecturas].sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    // Encontrar límites de ciclos (recargas detectadas)
    const iniciosCiclos: number[] = [0];
    for (let i = 1; i < ordenadas.length; i++) {
        const anterior = ordenadas[i - 1].nivel_porcentaje;
        const actual = ordenadas[i].nivel_porcentaje;
        if (actual > anterior + 10 || ordenadas[i].es_carga) {
            iniciosCiclos.push(i);
        }
    }

    if (iniciosCiclos.length < 2) return null; // Solo 1 ciclo, no hay histórico

    // Calcular la tasa de cada ciclo completo (no el actual para no distorsionar)
    const tasasPorCiclo: number[] = [];
    for (let c = 0; c < iniciosCiclos.length - 1; c++) {
        const desde = iniciosCiclos[c];
        const hasta = iniciosCiclos[c + 1];
        const segmento = ordenadas.slice(desde, hasta);
        if (segmento.length < 2) continue;

        const primeraFecha = new Date(segmento[0].fecha).getTime();
        const ultimaFecha = new Date(segmento[segmento.length - 1].fecha).getTime();
        const dias = (ultimaFecha - primeraFecha) / (1000 * 60 * 60 * 24);
        const litrosConsumidos = segmento[0].kg_restantes - segmento[segmento.length - 1].kg_restantes;

        if (dias > 1 && litrosConsumidos > 0) {
            tasasPorCiclo.push(litrosConsumidos / dias);
        }
    }

    if (tasasPorCiclo.length === 0) return null;

    // Promedio ponderado: ciclos más recientes tienen más peso
    let sumaPonderada = 0;
    let sumaPesos = 0;
    for (let i = 0; i < tasasPorCiclo.length; i++) {
        const peso = i + 1; // peso crece con el índice (más reciente = mayor peso)
        sumaPonderada += tasasPorCiclo[i] * peso;
        sumaPesos += peso;
    }

    return sumaPonderada / sumaPesos;
}

// ── TASA DEL PERFIL DEL USUARIO ──────────────────────────────────────────────
export function calcularTasaPerfil(config: Configuracion): number {
    if (config.tipo_uso === 'negocio') {
        const consumoTotalPorHora =
            (config.num_quemadores_comerciales * 0.15) +
            (config.num_freidoras * 0.40) +
            (config.tiene_plancha ? 0.30 : 0) +
            (config.tiene_horno ? 0.50 : 0);
        const factorDias = config.dias_operacion_semana / 7;
        const tasa = (consumoTotalPorHora * config.horas_operacion_dia) * factorDias;
        return Math.max(2.0, tasa);
    }

    // Casa
    const horasCocina = (config.minutos_cocina_dia || 60) / 60;
    const consumoCocina = horasCocina * 0.15 * (config.veces_cocina_dia || 2);

    // Regadera + calentador de agua
    const factorBaño = (config.tiempo_baño_min_promedio || 15) / 15;
    const consumoRegadera = (config.num_personas_baño || 0) * (0.15 * factorBaño); // Solo el agua fría que calienta

    // Boiler (calentador de agua) — es el mayor consumidor
    const consumoBoiler = config.tiene_boiler
        ? (config.num_personas_boiler || config.num_personas || 3) * 0.35
        : 0;

    const consumoSecadora = config.tiene_secadora ? 0.4 : 0;
    const consumoCalefaccion = config.tiene_calefaccion ? 1.0 : 0;

    let tasa = consumoCocina + consumoRegadera + consumoBoiler + consumoSecadora + consumoCalefaccion;

    // Si el usuario reportó sus propias estadísticas de carga, es más confiable
    if (config.carga_habitual_litros > 0 && config.frecuencia_carga_dias > 0) {
        tasa = config.carga_habitual_litros / config.frecuencia_carga_dias;
    }

    return Math.max(0.5, tasa);
}

// ── FACTOR ESTACIONAL ─────────────────────────────────────────────────────────
function getFactorEstacional(
    mes: number,
    zona: 'norte' | 'centro' | 'sur',
    factoresPersonalizados: FactorUsuario[]
): number {
    // Si el usuario ya tiene un factor real aprendido para este mes, lo usamos
    const personalizado = factoresPersonalizados.find(f => f.mes === mes);
    if (personalizado && personalizado.num_muestras >= 2) {
        // Mezcla: 60% factor aprendido del usuario + 40% factor genérico por zona
        const generico = FACTORES_POR_ZONA[zona][mes] ?? 1.0;
        return personalizado.factor_real * 0.6 + generico * 0.4;
    }
    return FACTORES_POR_ZONA[zona][mes] ?? 1.0;
}

// ── FUNCIÓN PRINCIPAL DE PREDICCIÓN ─────────────────────────────────────────

export function predecirConsumo(
    lecturas: Lectura[],
    config: Configuracion,
    eventosExtra: EventoExtra[] = [],
    factoresUsuario: FactorUsuario[] = []
): Prediccion {
    const ordenadas = [...lecturas].sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );

    const mesActual = new Date().getMonth();
    const zona = config.zona_climatica || 'centro';
    const factorEstacional = getFactorEstacional(mesActual, zona, factoresUsuario);
    const tasaHistorica = calcularTasaHistorica(ordenadas);

    // ESCENARIO A: Sin datos suficientes → estimación por perfil
    if (ordenadas.length < 2) {
        let tasaEstimada = calcularTasaPerfil(config) * factorEstacional;

        const litrosActuales = ordenadas.length === 1
            ? ordenadas[0].kg_restantes
            : config.capacidad_litros;
        const fechaBase = ordenadas.length === 1 ? new Date(ordenadas[0].fecha) : new Date();
        const hoy = new Date();
        const diasTranscurridos = ordenadas.length === 1
            ? (hoy.getTime() - fechaBase.getTime()) / (1000 * 60 * 60 * 24)
            : 0;
        const litrosEstimadosHoy = Math.max(0, litrosActuales - diasTranscurridos * tasaEstimada);
        const diasRestantes = Math.round(litrosEstimadosHoy / tasaEstimada);
        const fechaRecarga = new Date();
        fechaRecarga.setDate(fechaRecarga.getDate() + diasRestantes);

        const alertas: string[] = [];
        const alertaDia = getAlertaDiaRecarga(fechaRecarga, diasRestantes);
        if (alertaDia) alertas.push(alertaDia);
        if (factorEstacional > 1.1) alertas.push(`❄️ Temporada de mayor consumo en tu zona (${zona}): prevé recargar un poco antes.`);

        const costoEstimado = config.precio_litro_actual && litrosEstimadosHoy > 0
            ? Math.round(litrosEstimadosHoy * config.precio_litro_actual)
            : null;

        return {
            dias_restantes: ordenadas.length === 0 ? 0 : diasRestantes,
            fecha_recarga: ordenadas.length === 0 ? null : fechaRecarga,
            tasa_consumo_diaria: ordenadas.length === 0 ? 0 : Math.round(tasaEstimada * 100) / 100,
            confianza: 'perfil',
            costo_estimado: costoEstimado,
            mensaje: ordenadas.length === 0
                ? '¡Bienvenido! Registra tu primer nivel de gas para que la IA comience a aprender de tus hábitos.'
                : 'Estimación basada en tu perfil. Registra más niveles para mejorar la precisión.',
            alertas: ordenadas.length === 0 ? undefined : (alertas.length > 0 ? alertas : undefined),
        };
    }

    // ESCENARIO B: Separar ciclo actual desde la última recarga
    let lecturasRecientes = [ordenadas[ordenadas.length - 1]];
    for (let i = ordenadas.length - 2; i >= 0; i--) {
        const actual = ordenadas[i + 1].nivel_porcentaje;
        const anterior = ordenadas[i].nivel_porcentaje;
        if (actual > anterior + 10 || ordenadas[i + 1].es_carga) break;
        lecturasRecientes.unshift(ordenadas[i]);
    }

    // Si solo hay 1 lectura en el ciclo actual, mezclar perfil + histórico
    if (lecturasRecientes.length < 2) {
        const tasaPerfil = calcularTasaPerfil(config);
        let tasaBase = tasaPerfil;

        // Usar histórico si existe (70% histórico, 30% perfil)
        if (tasaHistorica !== null) {
            tasaBase = tasaHistorica * 0.7 + tasaPerfil * 0.3;
        }
        const tasaEstimada = tasaBase * factorEstacional;

        const ultimaLectura = ordenadas[ordenadas.length - 1];
        const litrosActuales = ultimaLectura.kg_restantes;
        const hoy = new Date();
        const diasTranscurridos = (hoy.getTime() - new Date(ultimaLectura.fecha).getTime()) / (1000 * 60 * 60 * 24);
        const litrosEstimadosHoy = Math.max(0, litrosActuales - diasTranscurridos * tasaEstimada);
        const diasRestantes = Math.round(litrosEstimadosHoy / tasaEstimada);
        const fechaRecarga = new Date();
        fechaRecarga.setDate(fechaRecarga.getDate() + diasRestantes);

        const alertas: string[] = [];
        const alertaDia = getAlertaDiaRecarga(fechaRecarga, diasRestantes);
        if (alertaDia) alertas.push(alertaDia);
        if (factorEstacional > 1.1) alertas.push(`❄️ Temporada de mayor consumo en tu zona (${zona}).`);

        const costoEstimado = config.precio_litro_actual && litrosEstimadosHoy > 0
            ? Math.round(litrosEstimadosHoy * config.precio_litro_actual)
            : null;

        return {
            dias_restantes: diasRestantes,
            fecha_recarga: fechaRecarga,
            tasa_consumo_diaria: Math.round(tasaEstimada * 100) / 100,
            confianza: tasaHistorica !== null ? 'media' : 'perfil',
            costo_estimado: costoEstimado,
            mensaje: tasaHistorica !== null
                ? 'Nueva recarga detectada. Usando promedio de tus ciclos anteriores para estimar.'
                : 'Nueva recarga detectada. Estimando según tu perfil hasta tener más lecturas.',
            alertas: alertas.length > 0 ? alertas : undefined,
        };
    }

    // ESCENARIO C: Regresión lineal ponderada sobre el ciclo actual
    const tasaPerfil = calcularTasaPerfil(config);

    const t0 = new Date(lecturasRecientes[0].fecha).getTime();
    const puntos: PuntoDato[] = lecturasRecientes.map((l) => ({
        x: (new Date(l.fecha).getTime() - t0) / (1000 * 60 * 60 * 24),
        y: l.kg_restantes,
    }));

    const n = puntos.length;
    let sumW = 0, sumWX = 0, sumWY = 0, sumWXY = 0, sumWX2 = 0;
    const xMax = puntos[puntos.length - 1].x;

    for (const p of puntos) {
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
    let tasaRegresion = Math.abs(pendiente);

    // ── MEZCLA MULTI-CICLO ────────────────────────────────────────────────────
    // Combinar regresión actual con histórico y perfil para mayor estabilidad
    let tasaFinal = tasaRegresion;
    if (tasaHistorica !== null) {
        // Con histórico: 60% ciclo actual + 30% histórico + 10% perfil
        tasaFinal = tasaRegresion * 0.60 + tasaHistorica * 0.30 + tasaPerfil * 0.10;
    } else {
        // Sin histórico: 80% regresión + 20% perfil
        tasaFinal = tasaRegresion * 0.80 + tasaPerfil * 0.20;
    }

    // Aplicar factor estacional al resultado final
    tasaFinal = tasaFinal * factorEstacional;

    // DETECCIÓN DE ANOMALÍAS / FUGAS
    let hayFuga = false;
    if (tasaRegresion > tasaPerfil * 2.5 && tasaRegresion > 3) {
        const hayEventoReciente = eventosExtra.some(e => {
            const diff = new Date().getTime() - new Date(e.fecha).getTime();
            return diff > 0 && diff < (1000 * 60 * 60 * 24 * 3);
        });
        if (!hayEventoReciente) hayFuga = true;
    }

    const ultimaLectura = ordenadas[ordenadas.length - 1];
    const hoy = new Date();
    const diasTranscurridos = (hoy.getTime() - new Date(ultimaLectura.fecha).getTime()) / (1000 * 60 * 60 * 24);
    const litrosActualesEstimados = Math.max(0, ultimaLectura.kg_restantes - diasTranscurridos * tasaFinal);
    const diasRestantes = Math.round(litrosActualesEstimados / (tasaFinal || 0.001));
    const fechaRecarga = new Date();
    fechaRecarga.setDate(fechaRecarga.getDate() + diasRestantes);

    // R² para nivel de confianza
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

    // Alertas inteligentes
    const alertas: string[] = [];
    const alertaDia = getAlertaDiaRecarga(fechaRecarga, diasRestantes);
    if (alertaDia) alertas.push(alertaDia);
    if (factorEstacional > 1.1) alertas.push(`❄️ Temporada de mayor consumo en tu zona: prevé recargar un poco antes de lo habitual.`);
    if (diasRestantes <= 5 && diasRestantes > 0) alertas.push('🔴 ¡Gas crítico! Menos de 5 días restantes. Llama a tu gasero pronto.');
    else if (diasRestantes <= config.alerta_dias) alertas.push(`⚠️ Gas bajo. Te quedan aproximadamente ${diasRestantes} días.`);

    // Costo estimado próxima recarga
    const costoEstimado = config.precio_litro_actual && litrosActualesEstimados > 0
        ? Math.round(litrosActualesEstimados * config.precio_litro_actual)
        : null;

    let mensajeFinal = `Tienes gas para aproximadamente ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}.`;
    if (tasaHistorica !== null) {
        mensajeFinal += ` (IA aprendiendo de ${Math.round(tasaHistorica * 10) / 10} L/día histórico)`;
    }
    if (hayFuga) {
        mensajeFinal = `⚠️ ALERTA: Consumo inusualmente alto (${Math.round(tasaRegresion * 10) / 10} L/día). Revisa que no haya fugas en tu instalación.`;
        confianza = 'baja';
    }

    return {
        dias_restantes: diasRestantes,
        fecha_recarga: fechaRecarga,
        tasa_consumo_diaria: Math.round(tasaFinal * 100) / 100,
        confianza,
        mensaje: mensajeFinal,
        alertas: alertas.length > 0 ? alertas : undefined,
        costo_estimado: costoEstimado,
    };
}

/**
 * Valida si una carga de gas fue completa comparando litros reportados vs incremento real.
 */
export function validarCarga(lecturaActual: Lectura, lecturaAnterior: Lectura, capacidadTotal: number): {
    esCorrecta: boolean;
    diferenciaLitros: number;
    mensaje: string;
} {
    if (!lecturaActual.es_carga || !lecturaActual.litros_cargados) {
        return { esCorrecta: true, diferenciaLitros: 0, mensaje: '' };
    }
    const incrementoLitros = lecturaActual.kg_restantes - lecturaAnterior.kg_restantes;
    const litrosEsperados = lecturaActual.litros_cargados;
    const margenError = Math.max(litrosEsperados * 0.05, 2);
    const diferencia = litrosEsperados - incrementoLitros;
    if (diferencia > margenError) {
        return {
            esCorrecta: false,
            diferenciaLitros: Math.round(diferencia),
            mensaje: `⚠️ Posible carga incompleta. El tanque subió ${incrementoLitros.toFixed(1)}L pero pagaste ${litrosEsperados}L. Diferencia: ~${Math.round(diferencia)}L.`
        };
    }
    return { esCorrecta: true, diferenciaLitros: Math.round(diferencia), mensaje: '✅ Carga verificada correctamente.' };
}

/**
 * Estima el nivel actual (litros) basado en la última lectura y tiempo transcurrido.
 */
export function estimarNivelActual(ultimaLectura: Lectura, tasaDiaria: number): number {
    const fechaLectura = new Date(ultimaLectura.fecha).getTime();
    const ahora = new Date().getTime();
    const diasTranscurridos = (ahora - fechaLectura) / (1000 * 60 * 60 * 24);
    return Math.max(0, ultimaLectura.kg_restantes - diasTranscurridos * tasaDiaria);
}

export function porcentajeALitros(porcentaje: number, capacidad_litros: number): number {
    return Math.round((porcentaje / 100) * capacidad_litros * 100) / 100;
}

export function litrosAPorcentaje(litros: number, capacidad_litros: number): number {
    return Math.round((litros / capacidad_litros) * 100);
}

export function colorNivel(porcentaje: number): string {
    if (porcentaje > 50) return '#4ADE80';
    if (porcentaje > 20) return '#FACC15';
    return '#F87171';
}

export const calcularNivelCarga = (
    litrosCargados: number,
    capacidadTotal: number,
    nivelAnteriorPorcentaje: number
): number => {
    const porcentajeCargado = (litrosCargados / capacidadTotal) * 100;
    return Math.min(Math.round(nivelAnteriorPorcentaje + porcentajeCargado), 100);
};

export const dineroALitros = (monto: number, precioLitro: number): number => {
    if (!precioLitro || precioLitro <= 0) return 0;
    return monto / precioLitro;
};
