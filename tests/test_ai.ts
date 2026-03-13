import { predecirConsumo } from '../services/ai';
import { Configuracion, Lectura } from '../services/database';

const mockConfig: Configuracion = {
    capacidad_litros: 300,
    num_personas: 4,
    nombre_usuario: 'Test',
    alerta_dias: 3,
    onboarding_completo: true,
    carga_habitual_litros: 240, // 80% del tanque
    frecuencia_carga_dias: 60,   // El usuario dice que le dura 60 días
    veces_cocina_dia: 2,
    num_personas_baño: 4,
    tiempo_baño_min_promedio: 15,
    tipo_uso: 'casa',
    minutos_cocina_dia: 60,
    tipo_negocio: 'restaurante_grande',
    num_quemadores_comerciales: 0,
    num_freidoras: 0,
    tiene_plancha: false,
    tiene_horno: false,
    horas_operacion_dia: 0,
    dias_operacion_semana: 6,
    tiene_secadora: false,
    tiene_calefaccion: false,
    tiene_boiler: true,
    num_personas_boiler: 4,
    zona_climatica: 'centro',
    pais: 'México',
    estado: 'Jalisco',
    municipio: 'Guadalajara',
    actualizar_precio_auto: true,
};

// Caso 1: Sin lecturas (debería usar la capacidad total o el perfil)
const lecturas0: Lectura[] = [];
const pred0 = predecirConsumo(lecturas0, mockConfig, []);
console.log('--- Caso 0 Lecturas ---');
console.log('Días restantes esperados: ~60');
console.log('Días restantes obtenidos:', pred0.dias_restantes);
console.log('Tasa consumo (L/día):', pred0.tasa_consumo_diaria);

// Caso 2: Una lectura al 100%
const lecturas1: Lectura[] = [
    { fecha: new Date().toISOString(), nivel_porcentaje: 80, kg_restantes: 240, es_carga: false }
];
const pred1 = predecirConsumo(lecturas1, mockConfig, []);
console.log('\n--- Caso 1 Lectura (80%) ---');
console.log('Días restantes esperados: 60');
console.log('Días restantes obtenidos:', pred1.dias_restantes);
console.log('Tasa consumo (L/día):', pred1.tasa_consumo_diaria);

// Caso 3: Simulación de Fuga (caída drástica reciente)
const lecturasFuga: Lectura[] = [
    { fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), nivel_porcentaje: 80, kg_restantes: 240, es_carga: true },
    { fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), nivel_porcentaje: 70, kg_restantes: 210, es_carga: false },
    { fecha: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), nivel_porcentaje: 60, kg_restantes: 180, es_carga: false },
    { fecha: new Date().toISOString(), nivel_porcentaje: 20, kg_restantes: 60, es_carga: false } // Drop masivo
];
const predFuga = predecirConsumo(lecturasFuga, mockConfig, []);
console.log('\n--- Caso 3 Fuga Detectada (caída de 120 litros en 1 día) ---');
console.log('Mensaje esperado: ALERTA Fuga');
console.log('Mensaje obtenido:', predFuga.mensaje);
console.log('Tasa consumo (L/día):', predFuga.tasa_consumo_diaria);
console.log('Confianza Obtenida:', predFuga.confianza);
