import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, TextInput, Alert,
    KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { actualizarConfiguracion } from '@/services/database';

export default function OnboardingScreen() {
    const [step, setStep] = useState(0);
    const [nombre, setNombre] = useState('');
    const [capacidad, setCapacidad] = useState('30');
    const [personas, setPersonas] = useState('3');
    const [alertaDias, setAlertaDias] = useState('3');

    const handleFinalizar = async () => {
        if (!nombre.trim()) {
            Alert.alert('Campo requerido', 'Por favor ingresa tu nombre.');
            return;
        }
        const cap = parseFloat(capacidad);
        const pers = parseInt(personas, 10);
        const alerta = parseInt(alertaDias, 10);

        if (isNaN(cap) || cap <= 0) {
            Alert.alert('Valor inválido', 'La capacidad del tanque debe ser mayor a 0.');
            return;
        }

        await actualizarConfiguracion({
            nombre_usuario: nombre.trim(),
            capacidad_kg: cap,
            num_personas: isNaN(pers) ? 3 : pers,
            alerta_dias: isNaN(alerta) ? 3 : alerta,
            onboarding_completo: true,
        });

        router.replace('/(tabs)');
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    {/* Header */}
                    <View style={styles.header}>
                        <MaterialCommunityIcons name="fire" size={56} color="#FF6B35" />
                        <Text style={styles.appName}>Gas LP Monitor</Text>
                        <Text style={styles.tagline}>Tu asistente inteligente de gas</Text>
                    </View>

                    {step === 0 ? (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>¿Cómo funciona?</Text>

                            <View style={styles.featureRow}>
                                <MaterialCommunityIcons name="gauge" size={28} color="#FF6B35" />
                                <View style={styles.featureText}>
                                    <Text style={styles.featureTitle}>Registra tu nivel</Text>
                                    <Text style={styles.featureDesc}>Ingresa el % de gas que tiene tu tanque.</Text>
                                </View>
                            </View>

                            <View style={styles.featureRow}>
                                <MaterialCommunityIcons name="brain" size={28} color="#4ADE80" />
                                <View style={styles.featureText}>
                                    <Text style={styles.featureTitle}>IA predice tu consumo</Text>
                                    <Text style={styles.featureDesc}>Aprende de tu historial y estima cuántos días te dura.</Text>
                                </View>
                            </View>

                            <View style={styles.featureRow}>
                                <MaterialCommunityIcons name="bell-ring" size={28} color="#FACC15" />
                                <View style={styles.featureText}>
                                    <Text style={styles.featureTitle}>Recordatorios automáticos</Text>
                                    <Text style={styles.featureDesc}>Te avisamos antes de que se acabe el gas.</Text>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.btnPrimary} onPress={() => setStep(1)}>
                                <Text style={styles.btnPrimaryText}>Comenzar →</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Configura tu tanque</Text>

                            <Text style={styles.label}>Tu nombre</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ej. Juan"
                                placeholderTextColor="#4A6080"
                                value={nombre}
                                onChangeText={setNombre}
                            />

                            <Text style={styles.label}>Capacidad del tanque (kg)</Text>
                            <View style={styles.optionsRow}>
                                {['20', '30', '45'].map((v) => (
                                    <TouchableOpacity
                                        key={v}
                                        style={[styles.optionBtn, capacidad === v && styles.optionBtnActive]}
                                        onPress={() => setCapacidad(v)}
                                    >
                                        <Text style={[styles.optionText, capacidad === v && styles.optionTextActive]}>
                                            {v} kg
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Otro valor en kg"
                                placeholderTextColor="#4A6080"
                                keyboardType="numeric"
                                value={capacidad}
                                onChangeText={setCapacidad}
                            />

                            <Text style={styles.label}>Personas en el hogar</Text>
                            <View style={styles.optionsRow}>
                                {['1', '2', '3', '4', '5+'].map((v) => (
                                    <TouchableOpacity
                                        key={v}
                                        style={[styles.optionBtn, personas === v && styles.optionBtnActive]}
                                        onPress={() => setPersonas(v === '5+' ? '5' : v)}
                                    >
                                        <Text style={[styles.optionText, personas === (v === '5+' ? '5' : v) && styles.optionTextActive]}>
                                            {v}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Avisar con cuántos días de anticipación</Text>
                            <View style={styles.optionsRow}>
                                {['2', '3', '5', '7'].map((v) => (
                                    <TouchableOpacity
                                        key={v}
                                        style={[styles.optionBtn, alertaDias === v && styles.optionBtnActive]}
                                        onPress={() => setAlertaDias(v)}
                                    >
                                        <Text style={[styles.optionText, alertaDias === v && styles.optionTextActive]}>
                                            {v} días
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity style={styles.btnPrimary} onPress={handleFinalizar}>
                                <Text style={styles.btnPrimaryText}>¡Listo! Empezar</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: '#0D1B2A' },
    scrollContent: { padding: 24, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 32, marginTop: 24 },
    appName: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginTop: 12 },
    tagline: { fontSize: 14, color: '#4A6080', marginTop: 4 },
    card: {
        backgroundColor: '#132338',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: '#1E3A5F',
    },
    cardTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 24 },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 14 },
    featureText: { flex: 1 },
    featureTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
    featureDesc: { fontSize: 13, color: '#94A3B8' },
    label: { fontSize: 13, color: '#94A3B8', marginTop: 16, marginBottom: 8, fontWeight: '600' },
    input: {
        backgroundColor: '#0D1B2A',
        borderWidth: 1,
        borderColor: '#1E3A5F',
        borderRadius: 10,
        padding: 12,
        color: '#FFFFFF',
        fontSize: 15,
    },
    optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    optionBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#1E3A5F',
        backgroundColor: '#0D1B2A',
    },
    optionBtnActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
    optionText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
    optionTextActive: { color: '#FFFFFF' },
    btnPrimary: {
        backgroundColor: '#FF6B35',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 24,
    },
    btnPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
