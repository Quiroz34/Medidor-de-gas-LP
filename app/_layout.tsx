import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initDatabase, obtenerConfiguracion } from '@/services/database';

import { AlertProvider } from '@/services/alertContext';
import CustomAlert from '@/components/CustomAlert';

export default function RootLayout() {
    useEffect(() => {
        // Small delay so the navigator mounts before we navigate
        const timer = setTimeout(async () => {
            await initDatabase();
            const config = await obtenerConfiguracion();
            if (!config.onboarding_completo) {
                router.replace('/onboarding');
            } else {
                router.replace('/(tabs)');
            }
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <AlertProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                    name="registro"
                    options={{
                        presentation: 'modal',
                        headerShown: true,
                        headerTitle: 'Registrar Lectura',
                        headerStyle: { backgroundColor: '#0D1B2A' },
                        headerTintColor: '#FF6B35',
                    }}
                />
            </Stack>
            <CustomAlert />
        </AlertProvider>
    );
}
