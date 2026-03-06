import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import {
    insertarLectura,
    obtenerConfiguracion,
    Configuracion,
} from '@/services/database';
import { porcentajeAKg } from '@/services/ai';

export default function RegistroModal() {
    const [config, setConfig] = useState<Configuracion | null>(null);
    const [nivel, setNivel] = useState(50);
    const [notas, setNotas] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        obtenerConfiguracion().then(setConfig);
    }, []);

    const kgActuales = config ? porcentajeAKg(nivel, config.capacidad_kg) : 0;

    const handleGuardar = async () => {
        if (!config) return;
        setGuardando(true);
        try {
            await insertarLectura({
                fecha: new Date().toISOString(),
                nivel_porcentaje: nivel,
                kg_restantes: kgActuales,
                notas: notas.trim() || undefined,
            });
            router.back();
        } catch (e) {
            Alert.alert('Error', 'No se pudo guardar la lectura. Intenta de nuevo.');
        } finally {
            setGuardando(false);
        }
    };

    const nivelColor = nivel > 50 ? '#4ADE80' : nivel > 20 ? '#FACC15' : '#F87171';

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <View style={styles.header}>
                        <MaterialCommunityIcons name="gauge" size={40} color="#FF6B35" />
                        <Text style={styles.title}>¿Cuánto gas tienes?</Text>
                        <Text style={styles.subtitle}>
                            Mueve el control para indicar el nivel aproximado de tu tanque
                        </Text>
                    </View>

                    {/* Display de nivel */}
                    <View style={styles.levelDisplay}>
                        <Text style={[styles.levelPercent, { color: nivelColor }]}>{nivel}%</Text>
                        <Text style={styles.levelKg}>{kgActuales.toFixed(1)} kg</Text>
                        <Text style={styles.levelDesc}>
                            {nivel > 50 ? '🔥 Buen nivel' : nivel > 20 ? '⚠️ Nivel medio' : '🚨 Nivel crítico'}
                        </Text>
                    </View>

                    {/* Slider */}
                    <View style={styles.sliderCard}>
                        <View style={styles.sliderLabels}>
                            <Text style={styles.sliderEdge}>Vacío</Text>
                            <Text style={styles.sliderEdge}>Lleno</Text>
                        </View>
                        <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={100}
                            step={5}
                            value={nivel}
                            onValueChange={setNivel}
                            minimumTrackTintColor={nivelColor}
                            maximumTrackTintColor="#1E3A5F"
                            thumbTintColor={nivelColor}
                        />

                        {/* Marcas de referencia rápida */}
                        <View style={styles.quickPicks}>
                            {[10, 25, 50, 75, 100].map((v) => (
                                <TouchableOpacity
                                    key={v}
                                    style={[styles.quickBtn, nivel === v && styles.quickBtnActive]}
                                    onPress={() => setNivel(v)}
                                >
                                    <Text style={[styles.quickText, nivel === v && { color: '#FFFFFF' }]}>{v}%</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Notas opcionales */}
                    <View style={styles.card}>
                        <Text style={styles.label}>Notas (opcional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej. Recargué hoy, olor a gas, etc."
                            placeholderTextColor="#4A6080"
                            value={notas}
                            onChangeText={setNotas}
                            multiline
                            numberOfLines={2}
                        />
                    </View>

                    {/* Fecha */}
                    <View style={styles.fechaRow}>
                        <MaterialCommunityIcons name="calendar-today" size={16} color="#4A6080" />
                        <Text style={styles.fechaText}>
                            Hoy: {new Date().toLocaleDateString('es-MX', {
                                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                            })}
                        </Text>
                    </View>

                    {/* Botón guardar */}
                    <TouchableOpacity
                        style={[styles.btnGuardar, guardando && styles.btnGuardando]}
                        onPress={handleGuardar}
                        disabled={guardando}
                    >
                        <MaterialCommunityIcons name="content-save" size={20} color="#FFFFFF" />
                        <Text style={styles.btnText}>{guardando ? 'Guardando...' : 'Guardar lectura'}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: '#0D1B2A' },
    scroll: { padding: 24, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 28 },
    title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 10 },
    subtitle: { fontSize: 13, color: '#4A6080', textAlign: 'center', marginTop: 6, lineHeight: 18 },
    levelDisplay: { alignItems: 'center', marginBottom: 20 },
    levelPercent: { fontSize: 64, fontWeight: '900', lineHeight: 72 },
    levelKg: { fontSize: 20, color: '#94A3B8', fontWeight: '600' },
    levelDesc: { fontSize: 14, color: '#64748B', marginTop: 4 },
    sliderCard: {
        backgroundColor: '#132338', borderRadius: 16, padding: 20,
        borderWidth: 1, borderColor: '#1E3A5F', marginBottom: 16,
    },
    sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    sliderEdge: { fontSize: 12, color: '#4A6080' },
    slider: { width: '100%', height: 40 },
    quickPicks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    quickBtn: {
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
        borderWidth: 1, borderColor: '#1E3A5F', backgroundColor: '#0D1B2A',
    },
    quickBtnActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
    quickText: { fontSize: 12, color: '#4A6080', fontWeight: '600' },
    card: {
        backgroundColor: '#132338', borderRadius: 16, padding: 18,
        borderWidth: 1, borderColor: '#1E3A5F', marginBottom: 16,
    },
    label: { fontSize: 13, color: '#94A3B8', marginBottom: 8, fontWeight: '600' },
    input: {
        backgroundColor: '#0D1B2A', borderWidth: 1, borderColor: '#1E3A5F',
        borderRadius: 10, padding: 12, color: '#FFFFFF', fontSize: 14,
        textAlignVertical: 'top',
    },
    fechaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    fechaText: { fontSize: 13, color: '#4A6080' },
    btnGuardar: {
        backgroundColor: '#FF6B35', borderRadius: 14, paddingVertical: 16,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    },
    btnGuardando: { backgroundColor: '#6B4226', opacity: 0.7 },
    btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
