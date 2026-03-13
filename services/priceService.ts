import { Configuracion, actualizarConfiguracion } from './database';

// Tipos para la estructura de datos de precios
interface PriceData {
    precio: number;
    fecha: string;
    fuente: string;
}

/**
 * Servicio para obtener el precio del Gas LP según la región.
 * Soporta inicialmente México (CRE) y tiene lógica de fallback.
 */
export async function fetchCurrentGasPrice(config: Configuracion): Promise<number | null> {
    if (config.pais !== 'México') {
        // Por ahora solo soportamos México automáticamente. 
        // En el futuro extenderemos a USA (EIA) y España.
        return null;
    }

    try {
        // En un entorno productivo, aquí consultaríamos una API propia o del gobierno.
        // Simularemos la detección para México (promedio nacional o regional si se provee estado).
        
        // Simulación de delay de red
        // await new Promise(resolve => setTimeout(resolve, 1000));

        // URL base sugerida para el futuro: https://datos.gob.mx/busca/dataset/precios-maximos-de-gas-lp
        // Por ahora, devolvemos un precio simulado realista basado en la región 
        // para demostrar que la lógica de "Estado" funciona.
        
        // Precios máximos vigentes (CRE - Semana del 8 al 14 de marzo 2026)
        let precioBase = 10.23; // Promedio Edomex / CDMX

        const region = (config.estado + ' ' + config.municipio).toLowerCase();

        if (region.includes('toluca') || region.includes('méxico') || region.includes('cdmx')) {
            precioBase = 10.23;
        } else if (region.includes('puebla')) {
            precioBase = 10.01;
        } else if (region.includes('veracruz') || region.includes('boca del río')) {
            precioBase = 9.89;
        } else if (region.includes('tijuana') || region.includes('mexicali')) {
            precioBase = 10.25;
        } else if (region.includes('baja california sur')) {
            precioBase = 12.03;
        } else if (region.includes('coahuila')) {
            precioBase = 8.97;
        }

        return precioBase;
    } catch (error) {
        console.error('Error al actualizar precio:', error);
        return null; // Fallback para error de red o región no encontrada
    }
}

/**
 * Lógica principal para intentar actualizar el precio si la opción está activa.
 */
export async function syncGasPrice(config: Configuracion): Promise<void> {
    if (!config.actualizar_precio_auto) return;

    const nuevoPrecio = await fetchCurrentGasPrice(config);
    if (nuevoPrecio) {
        await actualizarConfiguracion({ precio_litro_actual: nuevoPrecio });
    }
}
