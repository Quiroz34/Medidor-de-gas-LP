import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, RefreshControl, SafeAreaView,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TankGauge from '@/components/TankGauge';
import {
    obtenerUltimasLecturas,
    obtenerConfiguracion,
    Lectura,
    Configuracion,
} from '@/services/database';
import { predecirConsumo, Prediccion } from '@/services/ai';
import { programarRecordatorio } from '@/services/notifications';

export default function HomeScreen() {
    const [config, setConfig] = useState<Configuracion | null>(null);
    const [lecturas, setLecturas] = useState<Lectura[]>([]);
    const [prediccion, setPrediccion] = useState<Prediccion | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const cargarDatos = useCallback(async () => {
        const cfg = await obtenerConfiguracion();
        const lects = await obtenerUltimasLecturas(20);
        const pred = predecirConsumo(lects);

        setConfig(cfg);
        setLecturas(lects);
        setPrediccion(pred);

        // Programar recordatorio si hay predicción con fecha
        if (pred.fecha_recarga && cfg.alerta_dias) {
            await programarRecordatorio(pred.fecha_recarga, cfg.alerta_dias);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            cargarDatos();
        }, [cargarDatos]),
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await cargarDatos();
        setRefreshing(false);
    };

    const ultimaLectura = lecturas[0];
    const nivelActual = ultimaLectura?.nivel_porcentaje ?? 0;
    const fechaUltima = ultimaLectura
        ? new Date(ultimaLectura.fecha).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric',
        })
        : null;

    const confianzaColor = {
        alta: '#4ADE80',
        media: '#FACC15',
        baja: '#F87171',
        insuficiente: '#4A6080',
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
            >
                {/* Header */}
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.greeting}>¡Hola{config?.nombre_usuario ? `, ${config.nombre_usuario}` : ''}! 👋</Text>
                        <Text style={styles.subtitle}>Estado de tu tanque de gas</Text>
                    </View>
                    <MaterialCommunityIcons name="fire" size={28} color="#FF6B35" />
                </View>

                {/* Gauge */}
                <View style={styles.gaugeCard}>
                    <TankGauge
                        porcentaje={nivelActual}
                        capacidad_kg={config?.capacidad_kg ?? 30}
                        size={220}
                    />
                    {fechaUltima && (
                        <Text style={styles.fechaLabel}>Última lectura: {fechaUltima}</Text>
                    )}
                    {!ultimaLectura && (
                        <Text style={styles.noDataHint}>Registra tu primer nivel para comenzar</Text>
                    )}
                </View>

                {/* Predicción IA */}
                {prediccion && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="brain" size={20} color="#4ADE80" />
                            <Text style={styles.cardTitle}>Predicción IA</Text>
                            {prediccion.confianza !== 'insuficiente' && (
                                <View style={[styles.badge, { backgroundColor: confianzaColor[prediccion.confianza] + '20' }]}>
                                    <Text style={[styles.badgeText, { color: confianzaColor[prediccion.confianza] }]}>
                                        Confianza {prediccion.confianza}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.mensajeIA}>{prediccion.mensaje}</Text>

                        {prediccion.dias_restantes !== null && (
                            <View style={styles.statsRow}>
                                <View style={styles.stat}>
                                    <Text style={styles.statValue}>{prediccion.dias_restantes}</Text>
                                    <Text style={styles.statLabel}>días restantes</Text>
                                </View>
                                {prediccion.tasa_consumo_diaria !== null && (
                                    <View style={styles.stat}>
                                        <Text style={styles.statValue}>{prediccion.tasa_consumo_diaria}</Text>
                                        <Text style={styles.statLabel}>kg/día</Text>
                                    </View>
                                )}
                                {prediccion.fecha_recarga && (
                                    <View style={styles.stat}>
                                        <Text style={styles.statValue}>
                                            {prediccion.fecha_recarga.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                        </Text>
                                        <Text style={styles.statLabel}>recargar antes de</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Botón registrar */}
                <TouchableOpacity style={styles.btnRegistrar} onPress={() => router.push('/registro')}>
                    <MaterialCommunityIcons name="plus-circle" size={22} color="#FFFFFF" />
                    <Text style={styles.btnRegistrarText}>Registrar nueva lectura</Text>
                </TouchableOpacity>

                {/* Últimas lecturas (mini list) */}
                {lecturas.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Últimas lecturas</Text>
                        {lecturas.slice(0, 3).map((l) => (
                            <View key={l.id} style={styles.lecturaRow}>
                                <MaterialCommunityIcons
                                    name="gauge"
                                    size={18}
                                    color={l.nivel_porcentaje > 50 ? '#4ADE80' : l.nivel_porcentaje > 20 ? '#FACC15' : '#F87171'}
                                />
                                <Text style={styles.lecturaFecha}>
                                    {new Date(l.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                </Text>
                                <Text style={styles.lecturaNivel}>{l.nivel_porcentaje}%</Text>
                                <Text style={styles.lecturaKg}>{l.kg_restantes.toFixed(1)} kg</Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D1B2A' },
    scroll: { padding: 20, paddingBottom: 40 },
    headerRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 20,
    },
    greeting: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
    subtitle: { fontSize: 13, color: '#4A6080', marginTop: 2 },
    gaugeCard: {
        backgroundColor: '#132338',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1E3A5F',
        marginBottom: 16,
    },
    fechaLabel: { fontSize: 12, color: '#4A6080', marginTop: 8 },
    noDataHint: { fontSize: 13, color: '#4A6080', marginTop: 8, textAlign: 'center' },
    card: {
        backgroundColor: '#132338',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: '#1E3A5F',
        marginBottom: 16,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', flex: 1 },
    badge: {
        paddingHorizontal: 10, paddingVertical: 3,
        borderRadius: 20,
    },
    badgeText: { fontSize: 11, fontWeight: '700' },
    mensajeIA: { fontSize: 14, color: '#E2E8F0', lineHeight: 20, marginBottom: 14 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
    stat: { alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '800', color: '#FF6B35' },
    statLabel: { fontSize: 11, color: '#4A6080', marginTop: 2 },
    btnRegistrar: {
        backgroundColor: '#FF6B35',
        borderRadius: 14,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    btnRegistrarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    lecturaRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#1E3A5F',
    },
    lecturaFecha: { flex: 1, color: '#94A3B8', fontSize: 13 },
    lecturaNivel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', width: 40, textAlign: 'right' },
    lecturaKg: { color: '#4A6080', fontSize: 13, width: 55, textAlign: 'right' },
});
