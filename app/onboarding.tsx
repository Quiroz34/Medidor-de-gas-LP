import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, TextInput, Alert,
    KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import { actualizarConfiguracion, Configuracion } from '../services/database';
import { detectUserLocation } from '../services/locationService';

import { useAlert } from '../services/alertContext';

import { solicitarPermisosTotales } from '../services/permissions';

export default function OnboardingScreen() {
    const { showAlert } = useAlert();
    const [step, setStep] = useState(0);
    const [nombre, setNombre] = useState('');
    const [capacidad, setCapacidad] = useState('30');
    const [personas, setPersonas] = useState('3');
    const [alertaDias, setAlertaDias] = useState('3');

    // Nuevos campos
    const [cargaHabitual, setCargaHabitual] = useState('');
    const [frecuenciaCarga, setFrecuenciaCarga] = useState('');

    // Opciones Tipo Uso
    const [tipoUso, setTipoUso] = useState<'casa' | 'negocio' | null>(null);

    // Campos Casa
    const [vecesCocina, setVecesCocina] = useState('2');
    const [minutosCocina, setMinutosCocina] = useState('60');
    const [personasBaño, setPersonasBaño] = useState('3');
    const [tiempoBaño, setTiempoBaño] = useState('15');
    const [tieneSecadora, setTieneSecadora] = useState(false);
    const [tieneCalefaccion, setTieneCalefaccion] = useState(false);
    const [tieneBoiler, setTieneBoiler] = useState(true);
    const [personasBoiler, setPersonasBoiler] = useState('3');
    // Zona climática
    const [zonaClimatica, setZonaClimatica] = useState<'norte' | 'centro' | 'sur'>('centro');

    // Campos Negocio
    const [tipoNegocio, setTipoNegocio] = useState('');
    const [quemadores, setQuemadores] = useState('0');
    const [freidoras, setFreidoras] = useState('0');
    const [tienePlancha, setTienePlancha] = useState(false);
    const [tieneHorno, setTieneHorno] = useState(false);
    const [horasOperacion, setHorasOperacion] = useState('8');
    const [diasOperacion, setDiasOperacion] = useState('6');
 
    // Regional/Precios
    const [pais, setPais] = useState('México');
    const [estado, setEstado] = useState('');
    const [municipio, setMunicipio] = useState('');
    const [actualizarPrecioAuto, setActualizarPrecioAuto] = useState(true);

    const [pediendoPermisos, setPediendoPermisos] = useState(false);

    const handleSolicitarPermisos = async () => {
        setPediendoPermisos(true);
        try {
            const result = await solicitarPermisosTotales();
            
            // Si concedió ubicación, intentar auto-completar Estado y Municipio
            if (result.location) {
                const locationData = await detectUserLocation();
                if (locationData) {
                    setEstado(locationData.estado);
                    setMunicipio(locationData.municipio);
                    setPais(locationData.pais);
                }
            }
            
            setStep(2);
        } catch (e) {
            console.error(e);
            setStep(2);
        }
        setPediendoPermisos(false);
    };

    const handleFinalizar = async () => {
        try {
            const finalConfig: Partial<Configuracion> = {
                nombre_usuario: nombre,
                capacidad_litros: parseFloat(capacidad) || 100,
                num_personas: parseInt(personas, 10) || 3,
                alerta_dias: parseInt(alertaDias, 10) || 3,
                onboarding_completo: true,
                carga_habitual_litros: parseFloat(cargaHabitual) || 0,
                frecuencia_carga_dias: parseInt(frecuenciaCarga, 10) || 30,
                tipo_uso: tipoUso || 'casa',
                veces_cocina_dia: parseInt(vecesCocina, 10) || 2,
                minutos_cocina_dia: parseInt(minutosCocina, 10) || 60,
                num_personas_baño: parseInt(personasBaño, 10) || 3,
                tiempo_baño_min_promedio: parseInt(tiempoBaño, 10) || 15,
                tiene_secadora: tieneSecadora,
                tiene_calefaccion: tieneCalefaccion,
                tiene_boiler: tieneBoiler,
                num_personas_boiler: parseInt(personasBoiler, 10) || 3,
                zona_climatica: zonaClimatica,
                tipo_negocio: tipoNegocio as any,
                num_quemadores_comerciales: parseInt(quemadores, 10) || 0,
                num_freidoras: parseInt(freidoras, 10) || 0,
                tiene_plancha: tienePlancha,
                tiene_horno: tieneHorno,
                horas_operacion_dia: parseFloat(horasOperacion) || 0,
                dias_operacion_semana: parseInt(diasOperacion, 10) || 6,
                pais: pais,
                estado: estado,
                municipio: municipio,
                actualizar_precio_auto: actualizarPrecioAuto,
            };

            await actualizarConfiguracion(finalConfig);
            router.replace('/(tabs)');
        } catch (e) {
            console.error(e);
            showAlert({ title: 'Error', message: 'No se pudo guardar la configuración inicial.', type: 'error' });
        }
    };

    const nextStep = () => {
        if (step === 2) {
            if (!nombre.trim()) {
                showAlert({ 
                    title: 'Información faltante', 
                    message: 'Por favor ingresa tu nombre para continuar.',
                    type: 'warning'
                });
                return;
            }
            const cap = parseFloat(capacidad);
            if (isNaN(cap) || cap <= 0) {
                showAlert({ 
                    title: 'Valor inválido', 
                    message: 'La capacidad del tanque debe ser un número mayor a 0 litros.',
                    type: 'error'
                });
                return;
            }
        } else if (step === 3) {
            if (!tipoUso) {
                showAlert({ 
                    title: 'Falta selección', 
                    message: 'Por favor selecciona si el uso es para Casa o Negocio.',
                    type: 'info'
                });
                return;
            }
        } else if (step === 4) {
            if (tipoUso === 'casa') {
                if (!personas.trim() || !vecesCocina.trim() || !minutosCocina.trim() || !personasBaño.trim() || !tiempoBaño.trim()) {
                    showAlert({ 
                        title: 'Campos incompletos', 
                        message: 'Por favor responde todas las preguntas sobre los hábitos de tu hogar.',
                        type: 'warning'
                    });
                    return;
                }
            } else if (tipoUso === 'negocio') {
                if (!tipoNegocio.trim() || !quemadores.trim() || !freidoras.trim() || !horasOperacion.trim() || !diasOperacion.trim()) {
                    showAlert({ 
                        title: 'Campos incompletos', 
                        message: 'Por favor responde todas las preguntas sobre tu negocio.',
                        type: 'warning'
                    });
                    return;
                }
            }
        }
        setStep(s => s + 1);
    };

    const prevStep = () => setStep(s => s - 1);

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

                    {step === 0 && (
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
                                    <Text style={styles.featureDesc}>Aprende de tu perfil y estima cuántos días te dura.</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.btnPrimary} onPress={() => setStep(1)}>
                                <Text style={styles.btnPrimaryText}>Comenzar →</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* PASO 1: PERMISOS */}
                    {step === 1 && (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Funciones Premium</Text>
                            <View style={{ marginBottom: 12 }}>
                                <Text style={styles.featureDesc}>Para que la aplicación funcione al 100%, necesitamos algunos permisos básicos:</Text>
                            </View>

                            <View style={styles.permList}>
                                <View style={styles.permItem}>
                                    <MaterialCommunityIcons name="bell-ring" size={24} color="#FF6B35" />
                                    <Text style={styles.permLabel}>Avisos de Gas Bajo</Text>
                                </View>
                                <View style={styles.permItem}>
                                    <MaterialCommunityIcons name="calendar-check" size={24} color="#4ADE80" />
                                    <Text style={styles.permLabel}>Agendar Recargas</Text>
                                </View>
                                <View style={styles.permItem}>
                                    <MaterialCommunityIcons name="map-marker-radius" size={24} color="#3B82F6" />
                                    <Text style={styles.permLabel}>Precios Regionales</Text>
                                </View>
                                <View style={styles.permItem}>
                                    <MaterialCommunityIcons name="account-group" size={24} color="#FACC15" />
                                    <Text style={styles.permLabel}>Elegir tu Gasero</Text>
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={[styles.btnPrimary, pediendoPermisos && { opacity: 0.7 }]} 
                                onPress={handleSolicitarPermisos}
                                disabled={pediendoPermisos}
                            >
                                <Text style={styles.btnPrimaryText}>
                                    {pediendoPermisos ? 'Habilitando...' : 'Habilitar Funciones →'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 2 && (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Paso 1: Perfil Básico</Text>
                            <Text style={styles.label}>Tu nombre</Text>
                            <TextInput style={styles.input} placeholder="Ej. Juan" value={nombre} onChangeText={setNombre} placeholderTextColor="#4A6080" />

                            <Text style={styles.label}>Capacidad del tanque (Litros)</Text>
                            <View style={styles.optionsRow}>
                                {['100', '120', '180', '300', '500', '1000', '2000', '5000'].map((v) => (
                                    <TouchableOpacity key={v} style={[styles.optionBtn, capacidad === v && styles.optionBtnActive]} onPress={() => setCapacidad(v)}>
                                        <Text style={[styles.optionText, capacidad === v && styles.optionTextActive]}>{v} L</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TextInput style={styles.input} placeholder="Otro valor en litros" keyboardType="numeric" value={capacidad} onChangeText={setCapacidad} placeholderTextColor="#4A6080" />

                            {/* Ubicación para precios automáticos */}
                            <Text style={[styles.label, { marginTop: 12 }]}>Ubícanos para darte precios automáticos</Text>
                            <Text style={styles.featureDesc}>Esto ayuda a obtener el precio vigente de tu región.</Text>
                            
                            <Text style={styles.label}>País</Text>
                            <TextInput style={styles.input} value={pais} onChangeText={setPais} placeholder="México" placeholderTextColor="#4A6080" />

                            <Text style={styles.label}>Estado / Provincia</Text>
                            <TextInput style={styles.input} value={estado} onChangeText={setEstado} placeholder="Ej. CDMX o Guanajuato" placeholderTextColor="#4A6080" />

                            <Text style={styles.label}>Municipio / Ciudad</Text>
                            <TextInput style={styles.input} value={municipio} onChangeText={setMunicipio} placeholder="Ej. León" placeholderTextColor="#4A6080" />

                            <TouchableOpacity
                                style={[styles.optionBtn, actualizarPrecioAuto && styles.optionBtnActive, { marginTop: 8, paddingVertical: 12 }]}
                                onPress={() => setActualizarPrecioAuto(!actualizarPrecioAuto)}
                            >
                                <Text style={[styles.optionText, actualizarPrecioAuto && styles.optionTextActive, { textAlign: 'center' }]}>
                                    {actualizarPrecioAuto ? '✓ Precio automático activo' : '+ Activar precio automático'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.btnPrimary, { marginTop: 24 }]} onPress={nextStep}>
                                <Text style={styles.btnPrimaryText}>Siguiente</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 3 && (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Paso 2: Tipo de Uso</Text>
                            <Text style={styles.featureDesc}>Esto ayuda a la IA a calcular cómo se consume tu gas.</Text>

                            <View style={styles.usoContainer}>
                                <TouchableOpacity
                                    style={[styles.usoCard, tipoUso === 'casa' && styles.usoCardActive]}
                                    onPress={() => setTipoUso('casa')}
                                >
                                    <MaterialCommunityIcons name="home" size={40} color={tipoUso === 'casa' ? "#FF6B35" : "#4A6080"} />
                                    <Text style={[styles.usoTitle, tipoUso === 'casa' && styles.usoTextActive]}>Casa / Vivienda</Text>
                                    <Text style={styles.usoDesc}>Uso doméstico, estufa, boiler, etc.</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.usoCard, tipoUso === 'negocio' && styles.usoCardActive]}
                                    onPress={() => setTipoUso('negocio')}
                                >
                                    <MaterialCommunityIcons name="store" size={40} color={tipoUso === 'negocio' ? "#FF6B35" : "#4A6080"} />
                                    <Text style={[styles.usoTitle, tipoUso === 'negocio' && styles.usoTextActive]}>Negocio / Comida</Text>
                                    <Text style={styles.usoDesc}>Restaurantes, locales, freidoras.</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.navigationBtns}>
                                <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={prevStep}>
                                    <Text style={styles.btnSecondaryText}>Atrás</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btnPrimary, { flex: 2, marginTop: 0, opacity: tipoUso ? 1 : 0.5 }]}
                                    onPress={() => tipoUso && nextStep()}
                                    disabled={!tipoUso}
                                >
                                    <Text style={styles.btnPrimaryText}>Siguiente</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {step === 4 && tipoUso === 'casa' && (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Paso 3: Hábitos del Hogar</Text>

                            <Text style={styles.label}>Personas en el hogar (X o más)</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={personas} onChangeText={setPersonas} placeholder="Ej. 3" placeholderTextColor="#4A6080" />

                            <Text style={styles.label}>¿Cuántas veces cocinan al día?</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={vecesCocina} onChangeText={setVecesCocina} placeholder="Ej. 2" placeholderTextColor="#4A6080" />

                            <Text style={styles.label}>¿Cuántos minutos en total cocinan al día?</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={minutosCocina} onChangeText={setMinutosCocina} placeholder="Ej. 60" placeholderTextColor="#4A6080" />

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                                <TouchableOpacity
                                    style={[styles.optionBtn, tieneSecadora && styles.optionBtnActive, { flex: 1 }]}
                                    onPress={() => setTieneSecadora(!tieneSecadora)}
                                >
                                    <Text style={[styles.optionText, tieneSecadora && styles.optionTextActive, { textAlign: 'center' }]}>
                                        {tieneSecadora ? '✓ Secadora' : '+ Secadora'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.optionBtn, tieneCalefaccion && styles.optionBtnActive, { flex: 1 }]}
                                    onPress={() => setTieneCalefaccion(!tieneCalefaccion)}
                                >
                                    <Text style={[styles.optionText, tieneCalefaccion && styles.optionTextActive, { textAlign: 'center' }]}>
                                        {tieneCalefaccion ? '✓ Calefacción' : '+ Calefacción'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Boiler / Calentador de agua */}
                            <Text style={styles.label}>¿Tienes calentador de agua (boiler) a gas?</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={[styles.optionBtn, tieneBoiler && styles.optionBtnActive, { flex: 1 }]}
                                    onPress={() => setTieneBoiler(true)}
                                >
                                    <Text style={[styles.optionText, tieneBoiler && styles.optionTextActive, { textAlign: 'center' }]}>Sí</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.optionBtn, !tieneBoiler && styles.optionBtnActive, { flex: 1 }]}
                                    onPress={() => setTieneBoiler(false)}
                                >
                                    <Text style={[styles.optionText, !tieneBoiler && styles.optionTextActive, { textAlign: 'center' }]}>No</Text>
                                </TouchableOpacity>
                            </View>

                            {tieneBoiler && (
                                <>
                                    <Text style={styles.label}>¿Cuántos se bañan a diario con agua caliente?</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" value={personasBaño} onChangeText={setPersonasBaño} placeholder="Ej. 3" placeholderTextColor="#4A6080" />

                                    <Text style={styles.label}>Tiempo promedio de baño (minutos)</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" value={tiempoBaño} onChangeText={setTiempoBaño} placeholder="Ej. 15" placeholderTextColor="#4A6080" />

                                    <Text style={styles.label}>¿Cuántas personas usan el boiler?</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" value={personasBoiler} onChangeText={setPersonasBoiler} placeholder="Ej. 3" placeholderTextColor="#4A6080" />
                                </>
                            )}

                            {/* Zona climática */}
                            <Text style={styles.label}>¿Cómo es el clima en tu ciudad?</Text>
                            <Text style={[styles.featureDesc, { marginBottom: 8 }]}>Esto ajusta la predicción según el clima de tu zona.</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {([['norte', '❄️ Norte', 'Monterrey, Chihuahua...'], ['centro', '🌤️ Centro', 'CDMX, Guadalajara...'], ['sur', '☀️ Sur', 'Cancún, Mérida...']] as const).map(([val, label, desc]) => (
                                    <TouchableOpacity
                                        key={val}
                                        style={[styles.optionBtn, zonaClimatica === val && styles.optionBtnActive, { flex: 1, alignItems: 'center', paddingVertical: 12 }]}
                                        onPress={() => setZonaClimatica(val)}
                                    >
                                        <Text style={[styles.optionText, zonaClimatica === val && styles.optionTextActive, { textAlign: 'center', fontSize: 16 }]}>{label.split(' ')[0]}</Text>
                                        <Text style={[styles.optionText, zonaClimatica === val && styles.optionTextActive, { textAlign: 'center' }]}>{label.split(' ')[1]}</Text>
                                        <Text style={{ fontSize: 9, color: '#4A6080', textAlign: 'center', marginTop: 2 }}>{desc}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.navigationBtns}>
                                <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={prevStep}>
                                    <Text style={styles.btnSecondaryText}>Atrás</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btnPrimary, { flex: 2, marginTop: 0 }]} onPress={nextStep}>
                                    <Text style={styles.btnPrimaryText}>Siguiente</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {step === 4 && tipoUso === 'negocio' && (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Paso 3: Equipos de Negocio</Text>
                            <Text style={styles.featureDesc}>Describe brevemente tu negocio y equipos.</Text>

                            <Text style={styles.label}>Nombre o tipo de negocio</Text>
                            <TextInput style={styles.input} value={tipoNegocio} onChangeText={setTipoNegocio} placeholder="Ej. Restaurante 'La Posada'" placeholderTextColor="#4A6080" />

                            <Text style={styles.label}>¿Cuántos quemadores comerciales/parrillas usas?</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={quemadores} onChangeText={setQuemadores} placeholder="Ej. 4" placeholderTextColor="#4A6080" />

                            <Text style={styles.label}>¿Cuántas freidoras a gas tienes?</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={freidoras} onChangeText={setFreidoras} placeholder="Ej. 1" placeholderTextColor="#4A6080" />

                            <Text style={styles.label}>¿Cuántas horas al día tienes la cocina encendida?</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={horasOperacion} onChangeText={setHorasOperacion} placeholder="Ej. 8" placeholderTextColor="#4A6080" />

                            <Text style={styles.label}>¿Cuántos días a la semana abres?</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={diasOperacion} onChangeText={setDiasOperacion} placeholder="Ej. 6" placeholderTextColor="#4A6080" />

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                                <TouchableOpacity
                                    style={[styles.optionBtn, tienePlancha && styles.optionBtnActive, { flex: 1 }]}
                                    onPress={() => setTienePlancha(!tienePlancha)}
                                >
                                    <Text style={[styles.optionText, tienePlancha && styles.optionTextActive, { textAlign: 'center' }]}>
                                        {tienePlancha ? '✓ Plancha' : '+ Plancha a gas'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.optionBtn, tieneHorno && styles.optionBtnActive, { flex: 1 }]}
                                    onPress={() => setTieneHorno(!tieneHorno)}
                                >
                                    <Text style={[styles.optionText, tieneHorno && styles.optionTextActive, { textAlign: 'center' }]}>
                                        {tieneHorno ? '✓ Horno' : '+ Horno a gas'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.navigationBtns}>
                                <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={prevStep}>
                                    <Text style={styles.btnSecondaryText}>Atrás</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btnPrimary, { flex: 2, marginTop: 0 }]} onPress={nextStep}>
                                    <Text style={styles.btnPrimaryText}>Siguiente</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {step === 5 && (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Paso 4: Historial de Carga</Text>

                            <Text style={styles.label}>¿Cuánto cargas normalmente? (Litros)</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={cargaHabitual} onChangeText={setCargaHabitual} placeholder="Ej. 100" placeholderTextColor="#4A6080" />

                            <Text style={styles.label}>¿Cada cuánto tiempo recargas? (Días)</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={frecuenciaCarga} onChangeText={setFrecuenciaCarga} placeholder="Ej. 30" placeholderTextColor="#4A6080" />

                            <Text style={styles.label}>Avisar con cuánto tiempo de anticipación</Text>
                            <View style={styles.optionsRow}>
                                {['2', '3', '5', '7'].map((v) => (
                                    <TouchableOpacity key={v} style={[styles.optionBtn, alertaDias === v && styles.optionBtnActive]} onPress={() => setAlertaDias(v)}>
                                        <Text style={[styles.optionText, alertaDias === v && styles.optionTextActive]}>{v} días</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.navigationBtns}>
                                <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={prevStep}>
                                    <Text style={styles.btnSecondaryText}>Atrás</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btnPrimary, { flex: 2, marginTop: 0 }]} onPress={handleFinalizar}>
                                    <Text style={styles.btnPrimaryText}>¡Finalizar!</Text>
                                </TouchableOpacity>
                            </View>
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
    optionText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
    optionTextActive: { color: '#FFFFFF' },
    navigationBtns: { flexDirection: 'row', gap: 12, marginTop: 24, alignItems: 'center' },
    btnSecondary: {
        backgroundColor: '#1E3A5F',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    btnSecondaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    btnPrimary: {
        backgroundColor: '#FF6B35',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 24,
    },
    btnPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    usoContainer: { marginTop: 16, gap: 16 },
    usoCard: {
        backgroundColor: '#0D1B2A',
        borderWidth: 2,
        borderColor: '#1E3A5F',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
    },
    usoCardActive: { borderColor: '#FF6B35', backgroundColor: '#FF6B3510' },
    usoTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 12 },
    usoTextActive: { color: '#FF6B35' },
    usoDesc: { color: '#94A3B8', fontSize: 13, marginTop: 6, textAlign: 'center' },
    // Permisos styles
    permList: { marginTop: 24, gap: 16, marginBottom: 24 },
    permItem: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#0D1B2A', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1E3A5F' },
    permLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
