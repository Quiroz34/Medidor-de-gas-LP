import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#0D1B2A',
                    borderTopColor: '#1E3A5F',
                    borderTopWidth: 1,
                    height: 60,
                    paddingBottom: 8,
                },
                tabBarActiveTintColor: '#FF6B35',
                tabBarInactiveTintColor: '#4A6080',
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Inicio',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="fire" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="historial"
                options={{
                    title: 'Historial',
                    tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 3 },
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="chart-line" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="gasero"
                options={{
                    title: 'Gasero',
                    tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 3 },
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="truck-delivery" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="extras"
                options={{
                    title: 'Extras',
                    tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 3 },
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="plus-box" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="configuracion"
                options={{
                    title: 'Configuración',
                    tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 3 },
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="cog" color={color} size={size} />
                    ),
                }}
            />
        </Tabs>
    );
}
