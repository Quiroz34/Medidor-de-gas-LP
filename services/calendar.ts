import RNCalendarEvents from 'react-native-calendar-events';
import { Platform } from 'react-native';

export interface CalendarEventDetails {
    title: string;
    startDate: Date;
    endDate: Date;
    description: string;
    location?: string;
}

export async function requestCalendarPermissions(): Promise<boolean> {
    try {
        const status = await RNCalendarEvents.requestPermissions();
        return status === 'authorized';
    } catch (error) {
        console.error('Error requesting calendar permissions:', error);
        return false;
    }
}

export async function addEventToCalendar({
    title,
    startDate,
    endDate,
    description,
    location,
}: CalendarEventDetails): Promise<{ success: boolean; error?: string }> {
    try {
        // Asegurarse de tener permisos
        const status = await RNCalendarEvents.checkPermissions();
        if (status !== 'authorized') {
            const requestStatus = await RNCalendarEvents.requestPermissions();
            if (requestStatus !== 'authorized') {
                return { success: false, error: 'Permiso denegado para acceder al calendario.' };
            }
        }

        // Obtener calendarios disponibles (preferir el primario)
        const calendars = await RNCalendarEvents.findCalendars();
        const primaryCalendar = calendars.find(
            (cal) => cal.isPrimary || cal.allowsModifications
        ) || calendars[0];

        if (!primaryCalendar) {
            return { success: false, error: 'No se encontró un calendario disponible.' };
        }

        // Guardar el evento
        const eventId = await RNCalendarEvents.saveEvent(title, {
            calendarId: primaryCalendar.id,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            description,
            location,
            alarms: [{ date: -60 }], // Avisar 1 hora antes (en minutos)
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error adding event to calendar:', error);
        return { success: false, error: error.message || 'Error desconocido al guardar en el calendario.' };
    }
}
