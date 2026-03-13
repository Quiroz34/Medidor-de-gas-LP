import * as Notifications from 'expo-notifications';
import * as Contacts from 'expo-contacts';
import RNCalendarEvents from 'react-native-calendar-events';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { solicitarPermisos as solicitarNotificaciones } from './notifications';

export interface PermisosEstado {
    notifications: boolean;
    contacts: boolean;
    calendar: boolean;
    location: boolean;
}

/**
 * Solicita todos los permisos críticos de la aplicación en una sola ráfaga.
 * Esto asegura que el usuario vea todas las alertas del sistema al inicio.
 */
export async function solicitarPermisosTotales(): Promise<PermisosEstado> {
    const estado: PermisosEstado = {
        notifications: false,
        contacts: false,
        calendar: false,
        location: false,
    };

    try {
        // 1. Notificaciones
        estado.notifications = await solicitarNotificaciones();

        // 2. Calendario
        if (Platform.OS === 'android' || Platform.OS === 'ios') {
            const calendarStatus = await RNCalendarEvents.requestPermissions();
            estado.calendar = calendarStatus === 'authorized';
        }

        // 3. Contactos
        const { status: contactsStatus } = await Contacts.requestPermissionsAsync();
        estado.contacts = contactsStatus === 'granted';

        // 4. Ubicación
        const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
        estado.location = locationStatus === 'granted';

    } catch (error) {
        console.error("Error al solicitar permisos unificados:", error);
    }

    return estado;
}

/**
 * Verifica el estado actual de los permisos sin solicitarlos.
 */
export async function verificarEstadoPermisos(): Promise<PermisosEstado> {
    const { status: notificationsStatus } = await Notifications.getPermissionsAsync();
    const { status: contactsStatus } = await Contacts.getPermissionsAsync();
    const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
    
    let calendarAuth = false;
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const calStatus = await RNCalendarEvents.checkPermissions();
        calendarAuth = calStatus === 'authorized';
    }

    return {
        notifications: notificationsStatus === 'granted',
        contacts: contactsStatus === 'granted',
        calendar: calendarAuth,
        location: locationStatus === 'granted',
    };
}
