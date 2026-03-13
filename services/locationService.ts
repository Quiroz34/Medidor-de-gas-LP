import * as ExpoLocation from 'expo-location';

export interface UserLocation {
    estado: string;
    municipio: string;
    pais: string;
}

/**
 * Detecta la ubicación actual del usuario y devuelve el Estado y Municipio procesados.
 */
export async function detectUserLocation(): Promise<UserLocation | null> {
    try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') return null;

        const loc = await ExpoLocation.getCurrentPositionAsync({ 
            accuracy: ExpoLocation.Accuracy.Balanced 
        });

        if (!loc) return null;

        const [address] = await ExpoLocation.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
        });

        if (!address) return null;

        return {
            estado: address.region || '',
            municipio: address.city || address.subregion || address.district || '',
            pais: address.country || 'México'
        };
    } catch (error) {
        console.error('Error al detectar ubicación:', error);
        return null;
    }
}
