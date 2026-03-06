import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput,
    TouchableOpacity, Alert, SafeAreaView, Switch,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
    obtenerConfiguracion,
    actualizarConfiguracion,
    eliminarTodasLecturas,
    Configuracion,
} from '@/services/database';
import { cancelarRecordatorios } from '@/services/notifications';

export default function ConfiguracionScreen() {
    const [config, setConfig] = useState<Configuracion>({
        capacidad_kg: 30,
        num_personas: 3,
        nombre_usuario: '',
        alerta_dias: 3,
        onboarding_completo: true,
    });
    const [guardado, setGuardado] = useState(false);
    const [notificaciones, setNotificaciones] = useState(true);

    useFocusEffect(
        useCallback(() => {
            obtenerConfiguracion().then(setConfig);
        }, []),
    );

    const handleGuardar = async () => {
        if (!config.nombre_usuario.trim()) {
            Alert.alert('Campo requerido', 'El nombre no puede estar vacío.');
            return;
        }
        await actualizarConfiguracion(config);
        setGuardado(true);
        setTimeout(() => setGuardado(false), 2000);
    };

    const handleResetDatos = () => {
        Alert.alert(
            'Borrar todos los datos',
            '¿Seguro? Se eliminarán todas tus lecturas. La configuración se mantendrá.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Borrar', style: 'destructive',
                    onPress: async () => {
                        await eliminarTodasLecturas();
                        await cancelarRecordatorios();
                        Alert.alert('Hecho', 'Todos los datos de lecturas fueron eliminados.');
                    },
                },
            ],
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.title}>Configuración</Text>

                {/* Perfil */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="account" size={16} color="#FF6B35" />
                        <Text style={styles.sectionTitle}>Perfil</Text>
                    </View>

                    <Text style={styles.label}>Tu nombre</Text>
                    <TextInput
                        style={styles.input}
                        value={config.nombre_usuario}
                        onChangeText={(v) => setConfig({ ...config, nombre_usuario: v })}
                        placeholder="Ej. Juan"
                        placeholderTextColor="#4A6080"
                    />
                </View>

                {/* Tanque */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="propane-tank" size={16} color="#FF6B35" />
                        <Text style={styles.sectionTitle}>Tu tanque</Text>
                    </View>

                    <Text style={styles.label}>Capacidad total (kg)</Text>
                    <View style={styles.optionsRow}>
                        {['20', '30', '45'].map((v) => (
                            <TouchableOpacity
                                key={v}
                                style={[styles.optionBtn, config.capacidad_kg === parseFloat(v) && styles.optionBtnActive]}
                                onPress={() => setConfig({ ...config, capacidad_kg: parseFloat(v) })}
                            >
                                <Text style={[styles.optionText, config.capacidad_kg === parseFloat(v) && styles.optionTextActive]}>
                                    {v} kg
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput
                        style={styles.input}
                        value={String(config.capacidad_kg)}
                        onChangeText={(v) => setConfig({ ...config, capacidad_kg: parseFloat(v) || 0 })}
                        keyboardType="numeric"
                        placeholder="Ej. 30"
                        placeholderTextColor="#4A6080"
                    />

                    <Text style={styles.label}>Personas en el hogar</Text>
                    <View style={styles.optionsRow}>
                        {[1, 2, 3, 4, 5].map((v) => (
                            <TouchableOpacity
                                key={v}
                                style={[styles.optionBtn, config.num_personas === v && styles.optionBtnActive]}
                                onPress={() => setConfig({ ...config, num_personas: v })}
                            >
                                <Text style={[styles.optionText, config.num_personas === v && styles.optionTextActive]}>
                                    {v}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Notificaciones */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="bell" size={16} color="#FF6B35" />
                        <Text style={styles.sectionTitle}>Recordatorios</Text>
                    </View>

                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Activar recordatorios</Text>
                        <Switch
                            value={notificaciones}
                            onValueChange={setNotificaciones}
                            trackColor={{ true: '#FF6B35', false: '#1E3A5F' }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    <Text style={styles.label}>Avisar con cuántos días de anticipación</Text>
                    <View style={styles.optionsRow}>
                        {[2, 3, 5, 7].map((v) => (
                            <TouchableOpacity
                                key={v}
                                style={[styles.optionBtn, config.alerta_dias === v && styles.optionBtnActive]}
                                onPress={() => setConfig({ ...config, alerta_dias: v })}
                            >
                                <Text style={[styles.optionText, config.alerta_dias === v && styles.optionTextActive]}>
                                    {v} días
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Botón guardar */}
                <TouchableOpacity
                    style={[styles.btnSave, guardado && styles.btnSaved]}
                    onPress={handleGuardar}
                >
                    <MaterialCommunityIcons
                        name={guardado ? 'check-circle' : 'content-save'}
                        size={20}
                        color="#FFFFFF"
                    />
                    <Text style={styles.btnSaveText}>{guardado ? '¡Guardado!' : 'Guardar cambios'}</Text>
                </TouchableOpacity>

                {/* Peligro */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="alert" size={16} color="#F87171" />
                        <Text style={[styles.sectionTitle, { color: '#F87171' }]}>Zona de peligro</Text>
                    </View>
                    <TouchableOpacity style={styles.btnDanger} onPress={handleResetDatos}>
                        <MaterialCommunityIcons name="trash-can" size={18} color="#F87171" />
                        <Text style={styles.btnDangerText}>Borrar todas las lecturas</Text>
                    </TouchableOpacity>
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
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#FF6B35' },
    label: { fontSize: 12, color: '#94A3B8', marginTop: 12, marginBottom: 8, fontWeight: '600' },
    input: {
        backgroundColor: '#0D1B2A', borderWidth: 1, borderColor: '#1E3A5F',
        borderRadius: 10, padding: 12, color: '#FFFFFF', fontSize: 15,
    },
    optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    optionBtn: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
        borderWidth: 1, borderColor: '#1E3A5F', backgroundColor: '#0D1B2A',
    },
    optionBtnActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
    optionText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
    optionTextActive: { color: '#FFFFFF' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    switchLabel: { color: '#E2E8F0', fontSize: 14 },
    btnSave: {
        backgroundColor: '#FF6B35', borderRadius: 14, paddingVertical: 16,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 16,
    },
    btnSaved: { backgroundColor: '#4ADE80' },
    btnSaveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    btnDanger: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderWidth: 1, borderColor: '#F8717140', borderRadius: 10,
        padding: 12, marginTop: 4,
    },
    btnDangerText: { color: '#F87171', fontSize: 14, fontWeight: '600' },
});
