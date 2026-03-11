import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, TextInput, Alert,
    SafeAreaView, FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { insertarEventoExtra, obtenerEventosExtra, eliminarEventoExtra, EventoExtra } from '../../services/database';

type TipoEvento = 'lavado' | 'visitas' | 'horno' | 'ducha' | 'fiesta' | 'frio' | 'mantenimiento' | 'otro';

const TIPOS_EVENTO: { id: TipoEvento, label: string, icon: string, color: string }[] = [
    { id: 'lavado', label: 'Lavado Pesado', icon: 'washing-machine', color: '#6366F1' },
    { id: 'visitas', label: 'Visitas en Casa', icon: 'account-group', color: '#FACC15' },
    { id: 'horno', label: 'Uso de Horno', icon: 'stove', color: '#FF6B35' },
    { id: 'ducha', label: 'Ducha Larga', icon: 'shower', color: '#0EA5E9' },
    { id: 'fiesta', label: 'Fiesta/Evento', icon: 'silverware-fork-knife', color: '#EC4899' },
    { id: 'frio', label: 'Día muy Frío', icon: 'snowflake', color: '#93C5FD' },
    { id: 'mantenimiento', label: 'Mantenimiento', icon: 'wrench', color: '#94A3B8' },
    { id: 'otro', label: 'Otro / Extra', icon: 'plus-circle', color: '#4ADE80' },
];

import { useAlert } from '../../services/alertContext';

export default function ExtrasScreen() {
    const { showAlert } = useAlert();
    const [eventos, setEventos] = useState<EventoExtra[]>([]);
    const [descripcion, setDescripcion] = useState('');
    const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoEvento>('otro');
    const [guardando, setGuardando] = useState(false);

    const cargarEventos = useCallback(async () => {
        const data = await obtenerEventosExtra();
        setEventos(data);
    }, []);

    useEffect(() => {
        cargarEventos();
    }, [cargarEventos]);

    const handleGuardar = async () => {
        if (!descripcion.trim()) {
            showAlert({ 
                title: 'Faltan datos', 
                message: 'Por favor describe qué sucedió (ej. "Tuvimos comida familiar").',
                type: 'warning'
            });
            return;
        }

        setGuardando(true);
        try {
            await insertarEventoExtra({
                fecha: new Date().toISOString(),
                descripcion: descripcion.trim(),
                tipo: tipoSeleccionado,
            });
            setDescripcion('');
            setTipoSeleccionado('otro');
            await cargarEventos();
            showAlert({ 
                title: 'Registrado', 
                message: 'La IA tomará en cuenta este consumo extra.',
                type: 'success'
            });
        } catch (e) {
            showAlert({ 
                title: 'Error', 
                message: 'No se pudo guardar el evento.',
                type: 'error'
            });
        }
        setGuardando(false);
    };

    const handleEliminar = (id: number) => {
        showAlert({
            title: 'Eliminar evento',
            message: '¿Seguro que deseas eliminar este registro?',
            type: 'warning',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        await eliminarEventoExtra(id);
                        await cargarEventos();
                        showAlert({ title: 'Eliminado', message: 'El evento ha sido eliminado.', type: 'info' });
                    }
                }
            ]
        });
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={styles.title}>Consumos Extras</Text>
            <Text style={styles.subtitle}>Indica a la IA si hoy gastaste más de lo habitual por una razón específica. Así evitarás falsas alarmas de fugas.</Text>

            <View style={styles.card}>
                <Text style={styles.label}>¿Qué ocurrió hoy?</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej. Visitas de fin de semana..."
                    placeholderTextColor="#4A6080"
                    value={descripcion}
                    onChangeText={setDescripcion}
                />

                <Text style={styles.label}>Categoría</Text>
                <View style={styles.tipoContainer}>
                    {TIPOS_EVENTO.map((t) => (
                        <TouchableOpacity
                            key={t.id}
                            style={[
                                styles.tipoBtn,
                                tipoSeleccionado === t.id && { backgroundColor: t.color + '20', borderColor: t.color }
                            ]}
                            onPress={() => setTipoSeleccionado(t.id)}
                        >
                            <MaterialCommunityIcons
                                name={t.icon as any}
                                size={22}
                                color={tipoSeleccionado === t.id ? t.color : '#4A6080'}
                            />
                            <Text style={[
                                styles.tipoLabel,
                                tipoSeleccionado === t.id ? { color: t.color, fontWeight: '700' } : { color: '#4A6080' }
                            ]}>
                                {t.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.btnPrimary, guardando && { opacity: 0.7 }]}
                    onPress={handleGuardar}
                    disabled={guardando}
                >
                    <MaterialCommunityIcons name="check-decagram" size={22} color="#FFFFFF" />
                    <Text style={styles.btnPrimaryText}>Registrar Evento</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.historyTitle}>Historial de Eventos</Text>
        </View>
    );

    const renderEvento = ({ item }: { item: EventoExtra }) => {
        const tipo = TIPOS_EVENTO.find(t => t.id === item.tipo) || TIPOS_EVENTO[3];
        return (
            <View style={styles.eventoCard}>
                <View style={[styles.eventoIcon, { backgroundColor: tipo.color + '20' }]}>
                    <MaterialCommunityIcons name={tipo.icon as any} size={20} color={tipo.color} />
                </View>
                <View style={styles.eventoInfo}>
                    <Text style={styles.eventoDesc}>{item.descripcion}</Text>
                    <Text style={styles.eventoFecha}>
                        {new Date(item.fecha).toLocaleDateString('es-MX', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => handleEliminar(item.id!)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#F87171" />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={eventos}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={renderEvento}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No has registrado consumos extras aún.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D1B2A' },
    listContent: { padding: 20 },
    header: { marginBottom: 10 },
    title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 10 },
    subtitle: { fontSize: 13, color: '#4A6080', marginTop: 6, marginBottom: 24, lineHeight: 18 },
    card: {
        backgroundColor: '#132338',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#1E3A5F',
        marginBottom: 30,
    },
    label: { fontSize: 13, color: '#94A3B8', marginTop: 12, marginBottom: 8, fontWeight: '600' },
    input: {
        backgroundColor: '#0D1B2A',
        borderWidth: 1,
        borderColor: '#1E3A5F',
        borderRadius: 12,
        padding: 14,
        color: '#FFFFFF',
        fontSize: 15,
        marginBottom: 16,
    },
    tipoContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    tipoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1E3A5F',
        backgroundColor: '#0D1B2A',
        minWidth: '45%',
    },
    tipoLabel: { fontSize: 12 },
    btnPrimary: {
        backgroundColor: '#FF6B35',
        borderRadius: 14,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    btnPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    historyTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 },
    eventoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#132338',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1E3A5F30',
    },
    eventoIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    eventoInfo: { flex: 1 },
    eventoDesc: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
    eventoFecha: { color: '#4A6080', fontSize: 12, marginTop: 4 },
    emptyContainer: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: '#4A6080', fontSize: 14 },
});
