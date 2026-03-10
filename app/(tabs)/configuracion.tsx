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
        capacidad_litros: 30,
        num_personas: 3,
        nombre_usuario: '',
        alerta_dias: 3,
        onboarding_completo: true,
        carga_habitual_litros: 0,
        frecuencia_carga_dias: 30,
        veces_cocina_dia: 2,
        minutos_cocina_dia: 60,
        num_personas_baño: 3,
        tiempo_baño_min_promedio: 15,
        tipo_uso: 'casa',
        tipo_negocio: '',
        num_quemadores_comerciales: 0,
        num_freidoras: 0,
        tiene_plancha: false,
        tiene_horno: false,
        horas_operacion_dia: 0,
        dias_operacion_semana: 6,
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

                    <Text style={styles.label}>Personas en el hogar</Text>
                    <TextInput
                        style={styles.input}
                        value={String(config.num_personas)}
                        onChangeText={(v) => setConfig({ ...config, num_personas: parseInt(v, 10) || 0 })}
                        keyboardType="numeric"
                        placeholder="Ej. 3"
                        placeholderTextColor="#4A6080"
                    />
                </View>

                {/* Tanque */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="propane-tank" size={16} color="#FF6B35" />
                        <Text style={styles.sectionTitle}>Tu tanque e Historial</Text>
                    </View>

                    <Text style={styles.label}>Capacidad total (Litros)</Text>
                    <View style={styles.optionsRow}>
                        {['100', '120', '180', '300', '500', '1000', '2000', '5000'].map((v) => (
                            <TouchableOpacity
                                key={v}
                                style={[styles.optionBtn, config.capacidad_litros === parseFloat(v) && styles.optionBtnActive]}
                                onPress={() => setConfig({ ...config, capacidad_litros: parseFloat(v) })}
                            >
                                <Text style={[styles.optionText, config.capacidad_litros === parseFloat(v) && styles.optionTextActive]}>
                                    {v} L
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput
                        style={styles.input}
                        value={String(config.capacidad_litros)}
                        onChangeText={(v) => setConfig({ ...config, capacidad_litros: parseFloat(v) || 0 })}
                        keyboardType="numeric"
                        placeholder="Ej. 100"
                        placeholderTextColor="#4A6080"
                    />

                    <Text style={styles.label}>Carga habitual (Litros)</Text>
                    <TextInput
                        style={styles.input}
                        value={String(config.carga_habitual_litros)}
                        onChangeText={(v) => setConfig({ ...config, carga_habitual_litros: parseFloat(v) || 0 })}
                        keyboardType="numeric"
                        placeholder="Ej. 100"
                        placeholderTextColor="#4A6080"
                    />

                    <Text style={styles.label}>Frecuencia de carga (Días)</Text>
                    <TextInput
                        style={styles.input}
                        value={String(config.frecuencia_carga_dias)}
                        onChangeText={(v) => setConfig({ ...config, frecuencia_carga_dias: parseInt(v, 10) || 0 })}
                        keyboardType="numeric"
                        placeholder="Ej. 30"
                        placeholderTextColor="#4A6080"
                    />
                </View>

                {/* Hábitos */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="silverware-fork-knife" size={16} color="#FF6B35" />
                        <Text style={styles.sectionTitle}>Hábitos de Consumo</Text>
                    </View>

                    <View style={styles.usoContainer}>
                        <TouchableOpacity
                            style={[styles.usoCard, config.tipo_uso === 'casa' && styles.usoCardActive]}
                            onPress={() => setConfig({ ...config, tipo_uso: 'casa' })}
                        >
                            <MaterialCommunityIcons name="home" size={24} color={config.tipo_uso === 'casa' ? "#FF6B35" : "#4A6080"} />
                            <Text style={[styles.usoTitle, config.tipo_uso === 'casa' && styles.usoTextActive]}>Casa</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.usoCard, config.tipo_uso === 'negocio' && styles.usoCardActive]}
                            onPress={() => setConfig({ ...config, tipo_uso: 'negocio' })}
                        >
                            <MaterialCommunityIcons name="store" size={24} color={config.tipo_uso === 'negocio' ? "#FF6B35" : "#4A6080"} />
                            <Text style={[styles.usoTitle, config.tipo_uso === 'negocio' && styles.usoTextActive]}>Negocio</Text>
                        </TouchableOpacity>
                    </View>

                    {config.tipo_uso === 'casa' ? (
                        <>
                            <Text style={styles.label}>Veces que cocinan al día</Text>
                            <TextInput
                                style={styles.input}
                                value={String(config.veces_cocina_dia)}
                                onChangeText={(v) => setConfig({ ...config, veces_cocina_dia: parseInt(v, 10) || 0 })}
                                keyboardType="numeric"
                            />
                            <Text style={styles.label}>Minutos totales de cocinado al día</Text>
                            <TextInput
                                style={styles.input}
                                value={String(config.minutos_cocina_dia)}
                                onChangeText={(v) => setConfig({ ...config, minutos_cocina_dia: parseInt(v, 10) || 0 })}
                                keyboardType="numeric"
                            />
                            <Text style={styles.label}>Personas que se bañan a diario</Text>
                            <TextInput
                                style={styles.input}
                                value={String(config.num_personas_baño)}
                                onChangeText={(v) => setConfig({ ...config, num_personas_baño: parseInt(v, 10) || 0 })}
                                keyboardType="numeric"
                            />
                            <Text style={styles.label}>Tiempo promedio de baño (minutos)</Text>
                            <TextInput
                                style={styles.input}
                                value={String(config.tiempo_baño_min_promedio)}
                                onChangeText={(v) => setConfig({ ...config, tiempo_baño_min_promedio: parseInt(v, 10) || 0 })}
                                keyboardType="numeric"
                            />
                        </>
                    ) : (
                        <>
                            <Text style={styles.label}>Quemadores comerciales / Parrillas</Text>
                            <TextInput
                                style={styles.input}
                                value={String(config.num_quemadores_comerciales)}
                                onChangeText={(v) => setConfig({ ...config, num_quemadores_comerciales: parseInt(v, 10) || 0 })}
                                keyboardType="numeric"
                            />
                            <Text style={styles.label}>Freidoras a gas</Text>
                            <TextInput
                                style={styles.input}
                                value={String(config.num_freidoras)}
                                onChangeText={(v) => setConfig({ ...config, num_freidoras: parseInt(v, 10) || 0 })}
                                keyboardType="numeric"
                            />
                            <Text style={styles.label}>Horas de operación al día</Text>
                            <TextInput
                                style={styles.input}
                                value={String(config.horas_operacion_dia)}
                                onChangeText={(v) => setConfig({ ...config, horas_operacion_dia: parseFloat(v) || 0 })}
                                keyboardType="numeric"
                            />
                            <Text style={styles.label}>Días de operación a la semana</Text>
                            <TextInput
                                style={styles.input}
                                value={String(config.dias_operacion_semana)}
                                onChangeText={(v) => setConfig({ ...config, dias_operacion_semana: parseInt(v, 10) || 0 })}
                                keyboardType="numeric"
                            />
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                                <TouchableOpacity
                                    style={[styles.optionBtn, config.tiene_plancha && styles.optionBtnActive, { flex: 1 }]}
                                    onPress={() => setConfig({ ...config, tiene_plancha: !config.tiene_plancha })}
                                >
                                    <Text style={[styles.optionText, config.tiene_plancha && styles.optionTextActive, { textAlign: 'center' }]}>
                                        {config.tiene_plancha ? '✓ Plancha' : '+ Plancha a gas'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.optionBtn, config.tiene_horno && styles.optionBtnActive, { flex: 1 }]}
                                    onPress={() => setConfig({ ...config, tiene_horno: !config.tiene_horno })}
                                >
                                    <Text style={[styles.optionText, config.tiene_horno && styles.optionTextActive, { textAlign: 'center' }]}>
                                        {config.tiene_horno ? '✓ Horno' : '+ Horno a gas'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
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
    usoContainer: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 12 },
    usoCard: {
        flex: 1, backgroundColor: '#0D1B2A', borderWidth: 2, borderColor: '#1E3A5F',
        borderRadius: 12, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8
    },
    usoCardActive: { borderColor: '#FF6B35', backgroundColor: '#FF6B3510' },
    usoTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    usoTextActive: { color: '#FF6B35' },
});
