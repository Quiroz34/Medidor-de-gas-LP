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
    actualizarConfiguracion,
    Configuracion,
    obtenerUltimasLecturas,
    Lectura
} from '../services/database';
import { porcentajeALitros, calcularNivelCarga, dineroALitros, validarCarga } from '../services/ai';

import { useAlert } from '../services/alertContext';

export default function RegistroModal() {
    const { showAlert } = useAlert();
    const [config, setConfig] = useState<Configuracion | null>(null);
    const [tipo, setTipo] = useState<'lectura' | 'carga'>('lectura');
    const [modoCarga, setModoCarga] = useState<'litros' | 'dinero'>('litros');

    // Estados para lectura
    const [nivel, setNivel] = useState(50);

    // Estados para carga
    const [litrosCargados, setLitrosCargados] = useState('');
    const [montoDinero, setMontoDinero] = useState('');
    const [precioLitro, setPrecioLitro] = useState('');
    const [lastLectura, setLastLectura] = useState<Lectura | null>(null);
    const [nivelPrevio, setNivelPrevio] = useState(0);

    const [notas, setNotas] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        obtenerConfiguracion().then(cfg => {
            setConfig(cfg);
            if (cfg.precio_litro_actual) setPrecioLitro(String(cfg.precio_litro_actual));
        });
        obtenerUltimasLecturas(1).then(docs => {
            if (docs.length > 0) {
                setLastLectura(docs[0]);
                setNivelPrevio(docs[0].nivel_porcentaje);
            }
        });
    }, []);

    // Cálculo automático para carga
    let nivelCalculado = nivel;
    if (tipo === 'carga') {
        const lts = modoCarga === 'litros'
            ? parseFloat(litrosCargados) || 0
            : dineroALitros(parseFloat(montoDinero) || 0, parseFloat(precioLitro) || 0);

        nivelCalculado = config ? calcularNivelCarga(lts, config.capacidad_litros, nivelPrevio) : nivelPrevio;
    }

    const litrosActuales = config ? porcentajeALitros(tipo === 'lectura' ? nivel : nivelCalculado, config.capacidad_litros) : 0;

    const handleGuardar = async () => {
        if (!config) return;
        
        const esCarga = tipo === 'carga';
        let lts = 0;
        
        if (esCarga) {
            if (modoCarga === 'litros') {
                lts = parseFloat(litrosCargados);
                if (isNaN(lts) || lts <= 0) {
                    showAlert({ title: 'Valor inválido', message: 'Ingresa una cantidad válida de litros.', type: 'warning' });
                    return;
                }
            } else {
                const monto = parseFloat(montoDinero);
                const precio = parseFloat(precioLitro);
                if (isNaN(monto) || monto <= 0 || isNaN(precio) || precio <= 0) {
                    showAlert({ title: 'Valor inválido', message: 'Ingresa un monto y precio válido.', type: 'warning' });
                    return;
                }
                lts = dineroALitros(monto, precio);
            }
        }

        setGuardando(true);
        try {

            const parsedMonto = parseFloat(montoDinero);
            const parsedPrecio = parseFloat(precioLitro);

            const nuevaLectura: Lectura = {
                fecha: new Date().toISOString(),
                nivel_porcentaje: tipo === 'lectura' ? nivel : nivelCalculado,
                kg_restantes: litrosActuales,
                notas: notas.trim() || undefined,
                es_carga: esCarga,
                litros_cargados: esCarga ? lts : undefined,
                monto_dinero: (esCarga && modoCarga === 'dinero' && !isNaN(parsedMonto)) ? parsedMonto : undefined,
                precio_litro: (esCarga && !isNaN(parsedPrecio)) ? parsedPrecio : undefined,
            };

            await insertarLectura(nuevaLectura);

            // 🧠 APRENDIZAJE IA: Si es una carga, actualizamos el factor del mes anterior
            if (esCarga && lastLectura) {
                const fechaFin = new Date(nuevaLectura.fecha);
                const fechaInicio = new Date(lastLectura.fecha);
                const diffDias = (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24);
                
                if (diffDias >= 1) { // Solo si pasó al menos un día
                    const consumoReal = lastLectura.kg_restantes - (nuevaLectura.kg_restantes - lts);
                    const tasaReal = consumoReal / diffDias;
                    
                    if (tasaReal > 0) {
                        const tasaEsperada = config ? (await import('../services/ai')).calcularTasaPerfil(config) : 1;
                        const factorObservado = tasaReal / (tasaEsperada || 1);
                        
                        // Solo actualizar si el factor es razonable (evitar errores de captura)
                        if (factorObservado > 0.2 && factorObservado < 5) {
                            const { actualizarFactorUsuario } = await import('../services/database');
                            await actualizarFactorUsuario(fechaInicio.getMonth(), factorObservado);
                        }
                    }
                }
            }

            if (esCarga && lastLectura) {
                const validacion = validarCarga(nuevaLectura, lastLectura, config.capacidad_litros);
                if (!validacion.esCorrecta) {
                    showAlert({
                        title: '¡Atención: Carga Incompleta!',
                        message: validacion.mensaje,
                        type: 'warning',
                        buttons: [{ text: 'Entendido', onPress: () => router.back() }]
                    });
                    return;
                } else {
                    showAlert({
                        title: 'Carga Exitosa',
                        message: validacion.mensaje,
                        type: 'success',
                        buttons: [{ text: 'OK', onPress: () => router.back() }]
                    });
                    return;
                }
            }

            if (esCarga && precioLitro) {
                await actualizarConfiguracion({ ...config, precio_litro_actual: parseFloat(precioLitro) });
            }

            router.back();
        } catch (e) {
            showAlert({
                title: 'Error',
                message: 'No se pudo guardar el registro. Intenta de nuevo.',
                type: 'error'
            });
        } finally {
            setGuardando(false);
        }
    };

    const getNivelColor = (porc: number) => {
        if (porc <= 10) return '#EF4444'; // Rojo
        if (porc <= 30) return '#FF8C00'; // Naranja
        if (porc <= 50) return '#FACC15'; // Amarillo
        return '#4ADE80'; // Verde
    };

    const curNivel = tipo === 'lectura' ? nivel : nivelCalculado;
    const nivelColor = getNivelColor(curNivel);

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <View style={styles.header}>
                        <MaterialCommunityIcons name={tipo === 'lectura' ? 'gauge' : 'tanker-truck'} size={40} color="#FF6B35" />
                        <Text style={styles.title}>{tipo === 'lectura' ? '¿Cuánto gas tienes?' : 'Registrar nueva carga'}</Text>

                        {/* Selector Tipo */}
                        <View style={styles.typeSelector}>
                            <TouchableOpacity
                                style={[styles.typeBtn, tipo === 'lectura' && styles.typeBtnActive]}
                                onPress={() => setTipo('lectura')}
                            >
                                <Text style={[styles.typeText, tipo === 'lectura' && styles.typeTextActive]}>Lectura manual</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.typeBtn, tipo === 'carga' && styles.typeBtnActive]}
                                onPress={() => setTipo('carga')}
                            >
                                <Text style={[styles.typeText, tipo === 'carga' && styles.typeTextActive]}>Nueva carga</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Display de nivel dinámico */}
                    <View style={styles.levelDisplay}>
                        <Text style={[styles.levelPercent, { color: nivelColor }]}>
                            {tipo === 'lectura' ? nivel : nivelCalculado}%
                        </Text>
                        <Text style={styles.levelKg}>{litrosActuales.toFixed(1)} L</Text>
                        <Text style={styles.levelDesc}>
                            {tipo === 'carga' ? '🎉 Nivel final estimado' : (nivel > 50 ? '🔥 Buen nivel' : nivel > 20 ? '⚠️ Nivel medio' : '🚨 Nivel crítico')}
                        </Text>
                    </View>

                    {tipo === 'lectura' ? (
                        /* MODO LECTURA: Slider */
                        <View style={styles.sliderCard}>
                            <View style={styles.sliderLabels}>
                                <Text style={styles.sliderEdge}>Vacío</Text>
                                <Text style={styles.sliderEdge}>Lleno</Text>
                            </View>
                            <Slider
                                style={styles.slider}
                                minimumValue={0}
                                maximumValue={100}
                                step={1}
                                value={nivel}
                                onValueChange={setNivel}
                                minimumTrackTintColor={nivelColor}
                                maximumTrackTintColor="#1E3A5F"
                                thumbTintColor={nivelColor}
                            />
                            <View style={styles.quickPicks}>
                                {[10, 20, 50, 80, 100].map((v) => (
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
                    ) : (
                        /* MODO CARGA: Inputs Dinero/Litros */
                        <View style={styles.card}>
                            <View style={styles.modoCargaTabs}>
                                <TouchableOpacity
                                    style={[styles.modoTab, modoCarga === 'litros' && styles.modoTabActive]}
                                    onPress={() => setModoCarga('litros')}
                                >
                                    <Text style={[styles.modoTabText, modoCarga === 'litros' && styles.modoTabTextActive]}>Por Litros</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modoTab, modoCarga === 'dinero' && styles.modoTabActive]}
                                    onPress={() => setModoCarga('dinero')}
                                >
                                    <Text style={[styles.modoTabText, modoCarga === 'dinero' && styles.modoTabTextActive]}>Por Dinero</Text>
                                </TouchableOpacity>
                            </View>

                            {modoCarga === 'litros' ? (
                                <>
                                    <Text style={styles.label}>Litros surtidos</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ej. 100"
                                        placeholderTextColor="#4A6080"
                                        keyboardType="numeric"
                                        value={litrosCargados}
                                        onChangeText={setLitrosCargados}
                                    />
                                </>
                            ) : (
                                <>
                                    <Text style={styles.label}>Monto pagado ($)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ej. 1200"
                                        placeholderTextColor="#4A6080"
                                        keyboardType="numeric"
                                        value={montoDinero}
                                        onChangeText={setMontoDinero}
                                    />
                                    <Text style={styles.label}>Precio por litro ($)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ej. 11.50"
                                        placeholderTextColor="#4A6080"
                                        keyboardType="numeric"
                                        value={precioLitro}
                                        onChangeText={setPrecioLitro}
                                    />
                                </>
                            )}

                            {tipo === 'carga' && modoCarga === 'litros' && (
                                <>
                                    <Text style={styles.label}>Precio por litro (opcional)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ej. 11.50"
                                        placeholderTextColor="#4A6080"
                                        keyboardType="numeric"
                                        value={precioLitro}
                                        onChangeText={setPrecioLitro}
                                    />
                                </>
                            )}

                            <Text style={styles.hintText}>
                                Nivel antes de la carga: {nivelPrevio}%
                            </Text>
                            <View style={styles.photoReminder}>
                                <MaterialCommunityIcons name="camera" size={16} color="#4ADE80" />
                                <Text style={styles.photoReminderText}>Recuerda tomar foto a tu tanque para verificar que el repartidor te dio lo justo.</Text>
                            </View>
                        </View>
                    )}

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
    scroll: { padding: 24, paddingBottom: 10 },
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
    // Nuevos estilos para Carga
    typeSelector: {
        flexDirection: 'row',
        backgroundColor: '#0D1B2A',
        borderRadius: 12,
        padding: 4,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#1E3A5F',
        width: '100%',
    },
    typeBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    typeBtnActive: {
        backgroundColor: '#FF6B35',
    },
    typeText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#4A6080',
    },
    typeTextActive: {
        color: '#FFFFFF',
    },
    modoCargaTabs: {
        flexDirection: 'row',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1E3A5F',
    },
    modoTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
    },
    modoTabActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#FF6B35',
    },
    modoTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4A6080',
    },
    modoTabTextActive: {
        color: '#FF6B35',
    },
    hintText: {
        fontSize: 12,
        color: '#4ADE80',
        marginTop: 12,
        fontStyle: 'italic',
    },
    photoReminder: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
        padding: 10,
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        borderRadius: 8,
    },
    photoReminderText: {
        flex: 1,
        fontSize: 12,
        color: '#4ADE80',
        fontWeight: '600',
    },
});
