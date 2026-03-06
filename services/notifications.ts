import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano.
// shouldShowBanner y shouldShowList son los campos correctos para SDK 55+
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function solicitarPermisos(): Promise<boolean> {
    // Crear canal de Android (necesario para Android 8+)
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('gas-recordatorio', {
            name: 'Recordatorio de gas LP',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF6B35',
        });
    }

    // En emuladores isDevice=false, pero permitimos continuar para desarrollo
    if (!Device.isDevice) {
        return true;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    return finalStatus === 'granted';
}

export async function programarRecordatorio(
    fechaRecarga: Date,
    diasAntes: number = 3,
): Promise<string | null> {
    const hasPermission = await solicitarPermisos();
    if (!hasPermission) return null;

    // Cancelar recordatorios anteriores
    await cancelarRecordatorios();

    const fechaAviso = new Date(fechaRecarga);
    fechaAviso.setDate(fechaAviso.getDate() - diasAntes);
    fechaAviso.setHours(9, 0, 0, 0); // Avisar a las 9 AM

    // Solo programar si la fecha es futura
    if (fechaAviso <= new Date()) return null;

    // DateTriggerInput: { type: SchedulableTriggerInputTypes.DATE, date: Date | number }
    const id = await Notifications.scheduleNotificationAsync({
        content: {
            title: '🔥 Recordatorio de Gas LP',
            body: `Te quedan aproximadamente ${diasAntes} días de gas. ¡Es momento de agendar tu recarga!`,
            data: { tipo: 'recordatorio_gas' },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fechaAviso,
            channelId: 'gas-recordatorio',
        },
    });

    return id;
}

export async function cancelarRecordatorios(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function obtenerRecordatorioProgramado(): Promise<Date | null> {
    const notifs = await Notifications.getAllScheduledNotificationsAsync();
    if (notifs.length === 0) return null;

    const trigger = notifs[0].trigger as { type?: string; date?: number | Date; timestamp?: number };
    const raw = trigger?.date ?? trigger?.timestamp;
    if (raw) {
        return raw instanceof Date ? raw : new Date(raw);
    }
    return null;
}
