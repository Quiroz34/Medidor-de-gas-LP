import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initDatabase, obtenerConfiguracion } from '@/services/database';

import { AlertProvider } from '@/services/alertContext';
import CustomAlert from '@/components/CustomAlert';

import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
    useEffect(() => {
        const prepare = async () => {
            try {
                await initDatabase();
                const config = await obtenerConfiguracion();
                if (!config.onboarding_completo) {
                    router.replace('/onboarding');
                } else {
                    router.replace('/(tabs)');
                }
            } catch (e) {
                console.warn(e);
            } finally {
                // Hide splash screen after navigation is ready
                setTimeout(async () => {
                    await SplashScreen.hideAsync().catch(() => {});
                }, 800);
            }
        };

        prepare();
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
