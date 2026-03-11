import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Alert, SafeAreaView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { obtenerLecturas, eliminarLectura, Lectura } from '@/services/database';

import { useAlert } from '@/services/alertContext';

export default function HistorialScreen() {
    const { showAlert } = useAlert();
    const [lecturas, setLecturas] = useState<Lectura[]>([]);

    const cargar = useCallback(async () => {
        const data = await obtenerLecturas();
        setLecturas(data);
    }, []);

    useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

    const handleEliminar = (id: number) => {
        showAlert({
            title: 'Eliminar lectura',
            message: '¿Seguro que deseas eliminar esta lectura?',
            type: 'warning',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar', style: 'destructive',
                    onPress: async () => {
                        await eliminarLectura(id);
                        cargar();
                        showAlert({ title: 'Eliminado', message: 'La lectura ha sido eliminada.', type: 'info' });
                    },
                },
            ],
        });
    };

    // Calcular consumo entre lecturas consecutivas para la gráfica de barras manual
    const consumos: { fecha: string; consumo: number }[] = [];
    for (let i = lecturas.length - 1; i > 0; i--) {
        const anterior = lecturas[i];
        const actual = lecturas[i - 1];
        const dias = Math.max(
            1,
            (new Date(actual.fecha).getTime() - new Date(anterior.fecha).getTime()) / 86400000,
        );
        const consumoKg = Math.max(0, anterior.kg_restantes - actual.kg_restantes);
        consumos.push({
            fecha: new Date(actual.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
            consumo: Math.round((consumoKg / dias) * 10) / 10,
        });
    }
    const maxConsumo = Math.max(...consumos.map((c) => c.consumo), 0.01);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.title}>Historial de Consumo</Text>

                {/* Gráfica manual de barras */}
                {consumos.length > 0 && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="chart-bar" size={18} color="#FF6B35" />
                            <Text style={styles.cardTitle}>Consumo diario (kg/día)</Text>
                        </View>
                        <View style={styles.barsContainer}>
                            {consumos.slice(-7).map((c, i) => (
                                <View key={i} style={styles.barColumn}>
                                    <Text style={styles.barValue}>{c.consumo}</Text>
                                    <View style={styles.barWrapper}>
                                        <View
                                            style={[
                                                styles.bar,
                                                {
                                                    height: Math.max(10, (c.consumo / maxConsumo) * 90),
                                                    backgroundColor: c.consumo > 2 ? '#F87171' : c.consumo > 1 ? '#FACC15' : '#4ADE80',
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.barLabel}>{c.fecha}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Lista de lecturas */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Todas las lecturas</Text>
                    {lecturas.length === 0 ? (
                        <Text style={styles.empty}>
                            No hay lecturas registradas aún.{'\n'}
                            Registra el nivel de tu tanque desde la pantalla de Inicio.
                        </Text>
                    ) : (
                        lecturas.map((l) => (
                            <View key={l.id} style={styles.row}>
                                <View style={[styles.dot, {
                                    backgroundColor: l.nivel_porcentaje > 50 ? '#4ADE80'
                                        : l.nivel_porcentaje > 20 ? '#FACC15' : '#F87171',
                                }]} />
                                <View style={styles.rowData}>
                                    <Text style={styles.rowFecha}>
                                        {new Date(l.fecha).toLocaleDateString('es-MX', {
                                            weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                                        })}
                                    </Text>
                                    {l.notas ? <Text style={styles.rowNotas}>{l.notas}</Text> : null}
                                </View>
                                <Text style={styles.rowNivel}>{l.nivel_porcentaje}%</Text>
                                <Text style={styles.rowKg}>{l.kg_restantes.toFixed(1)} kg</Text>
                                <TouchableOpacity onPress={() => handleEliminar(l.id!)}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#4A6080" />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D1B2A' },
    scroll: { padding: 20, paddingBottom: 40 },
    title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 20 },
    card: {
        backgroundColor: '#132338', borderRadius: 16, padding: 18,
        borderWidth: 1, borderColor: '#1E3A5F', marginBottom: 16,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
    barsContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 130 },
    barColumn: { flex: 1, alignItems: 'center' },
    barWrapper: { width: '100%', height: 90, justifyContent: 'flex-end' },
    bar: { width: '100%', borderRadius: 4 },
    barValue: { fontSize: 9, color: '#94A3B8', marginBottom: 4 },
    barLabel: { fontSize: 9, color: '#4A6080', marginTop: 4, textAlign: 'center' },
    empty: { color: '#4A6080', textAlign: 'center', lineHeight: 22, paddingVertical: 16 },
    row: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
        borderTopWidth: 1, borderTopColor: '#1E3A5F', gap: 8,
    },
    dot: { width: 10, height: 10, borderRadius: 5 },
    rowData: { flex: 1 },
    rowFecha: { fontSize: 13, color: '#E2E8F0' },
    rowNotas: { fontSize: 11, color: '#4A6080', marginTop: 1 },
    rowNivel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', width: 40, textAlign: 'right' },
    rowKg: { fontSize: 12, color: '#4A6080', width: 50, textAlign: 'right' },
});
