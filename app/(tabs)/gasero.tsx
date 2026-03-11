import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    TouchableOpacity, TextInput, Alert,
    ActivityIndicator, SafeAreaView, Linking, Platform,
} from 'react-native';
// @ts-ignore
import * as Contacts from 'expo-contacts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { obtenerConfiguracion, actualizarConfiguracion, Configuracion } from '../../services/database';

import { useAlert } from '../../services/alertContext';

// Definición local mínima de tipos para evitar errores si el módulo no carga bien en el IDE
type ContactoMinimal = {
    id?: string;
    name: string;
    phoneNumbers?: Array<{ number?: string }>;
};

export default function GaseroScreen() {
    const { showAlert } = useAlert();
    const [config, setConfig] = useState<Configuracion | null>(null);
    const [contacts, setContacts] = useState<ContactoMinimal[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<ContactoMinimal[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    const cargarConfig = useCallback(async () => {
        const cfg = await obtenerConfiguracion();
        setConfig(cfg);
    }, []);

    useEffect(() => {
        cargarConfig();
    }, [cargarConfig]);

    const registrarManualmente = () => {
        showAlert({
            title: 'Registro Manual',
            message: 'Ingresa el nombre de tu gasero:',
            isPrompt: true,
            placeholder: 'Nombre del gasero',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Siguiente',
                    onPress: (name) => {
                        if (!name) return showAlert({ title: 'Error', message: 'El nombre es obligatorio.', type: 'error' });
                        showAlert({
                            title: 'Registro Manual',
                            message: `Ingresa el teléfono de ${name}:`,
                            isPrompt: true,
                            placeholder: 'Número de teléfono',
                            keyboardType: 'phone-pad',
                            buttons: [
                                { text: 'Cancelar', style: 'cancel' },
                                {
                                    text: 'Guardar',
                                    onPress: (phone) => {
                                        if (!phone) return showAlert({ title: 'Error', message: 'El teléfono es obligatorio.', type: 'error' });
                                        saveGasero(name, phone);
                                    }
                                }
                            ]
                        });
                    }
                }
            ]
        });
    };

    const handleSelectContact = async () => {
        if (!Contacts || !Contacts.requestPermissionsAsync) {
            showAlert({
                title: 'Módulo no disponible',
                message: 'El acceso a contactos no está disponible en este entorno. ¿Deseas registrarlo manualmente?',
                type: 'warning',
                buttons: [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Registrar Manual', onPress: registrarManualmente }
                ]
            });
            return;
        }

        setLoading(true);
        try {
            const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
            
            if (status === 'granted') {
                const { data } = await Contacts.getContactsAsync({
                    fields: [Contacts.Fields.PhoneNumbers],
                });

                if (data && data.length > 0) {
                    setContacts(data as any);
                    setFilteredContacts(data as any);
                    setShowPicker(true);
                } else {
                    showAlert({
                        title: 'Sin contactos',
                        message: 'No se encontraron contactos. ¿Deseas registrarlo manualmente?',
                        type: 'info',
                        buttons: [
                            { text: 'Cerrar', style: 'cancel' },
                            { text: 'Registrar Manual', onPress: registrarManualmente }
                        ]
                    });
                }
            } else {
                const buttons: any[] = [
                    { text: 'Entendido', style: 'cancel' },
                    { text: 'Registrar Manual', onPress: registrarManualmente }
                ];

                if (!canAskAgain && Platform.OS !== 'web') {
                    buttons.push({
                        text: 'Ir a Ajustes',
                        onPress: () => Linking.openSettings()
                    });
                }

                showAlert({
                    title: 'Permiso denegado',
                    message: 'Necesitamos acceso a tus contactos para facilitar el registro. Puedes dar el permiso en ajustes o registrarlo manualmente.',
                    type: 'warning',
                    buttons
                });
            }
        } catch (error) {
            showAlert({
                title: 'Error',
                message: 'Hubo un problema al acceder a la agenda. ¿Deseas registrarlo manualmente?',
                type: 'error',
                buttons: [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Registrar Manual', onPress: registrarManualmente }
                ]
            });
        }
        setLoading(false);
    };

    const filterContacts = (text: string) => {
        setSearch(text);
        if (!text) {
            setFilteredContacts(contacts);
            return;
        }
        const filtered = contacts.filter(c => {
            const nameMatch = c.name?.toLowerCase().includes(text.toLowerCase());
            const phoneMatch = c.phoneNumbers?.some((p) => p.number?.includes(text));
            return nameMatch || phoneMatch;
        });
        setFilteredContacts(filtered);
    };

    const saveGasero = async (name: string, phone: string) => {
        await actualizarConfiguracion({
            gasero_nombre: name,
            gasero_telefono: phone,
        });
        await cargarConfig();
        setShowPicker(false);
        setSearch('');
        showAlert({ 
            title: 'Éxito', 
            message: 'Gasero guardado correctamente.', 
            type: 'success' 
        });
    };

    const makeCall = () => {
        if (config?.gasero_telefono) {
            Linking.openURL(`tel:${config.gasero_telefono}`);
        }
    };

    const removeGasero = async () => {
        showAlert({
            title: 'Quitar contacto',
            message: '¿Deseas quitar a tu gasero de confianza?',
            type: 'warning',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Quitar',
                    style: 'destructive',
                    onPress: async () => {
                        await actualizarConfiguracion({ gasero_nombre: '', gasero_telefono: '' });
                        await cargarConfig();
                        showAlert({ title: 'Eliminado', message: 'El gasero ha sido removido.', type: 'info' });
                    }
                }
            ]
        });
    };

    const renderContact = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.contactItem}
            onPress={() => {
                const name = item.name || 'Sin nombre';
                const phone = item.phoneNumbers?.[0]?.number;
                if (phone) saveGasero(name, phone);
                else showAlert({ title: 'Error', message: 'Este contacto no tiene número de teléfono.', type: 'error' });
            }}
        >
            <View style={styles.contactAvatar}>
                <Text style={styles.avatarText}>{(item.name || '?').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name || 'Sin nombre'}</Text>
                <Text style={styles.contactPhone}>{item.phoneNumbers?.[0]?.number || 'Sin número'}</Text>
            </View>
        </TouchableOpacity>
    );

    if (showPicker) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowPicker(false)}>
                        <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.pickerTitle}>Seleccionar Contacto</Text>
                </View>
                <View style={styles.searchBar}>
                    <MaterialCommunityIcons name="magnify" size={20} color="#4A6080" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por nombre o número..."
                        placeholderTextColor="#4A6080"
                        value={search}
                        onChangeText={filterContacts}
                    />
                </View>
                <FlatList
                    data={filteredContacts}
                    keyExtractor={(item) => item.id || Math.random().toString()}
                    renderItem={renderContact}
                    contentContainerStyle={styles.listContent}
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Gasero de Confianza</Text>
                <Text style={styles.subtitle}>Configura a tu surtidor para llamarlo rápidamente cuando la IA detecte nivel bajo.</Text>

                {config?.gasero_nombre ? (
                    <View style={styles.gaseroCard}>
                        <View style={styles.gaseroInfoMain}>
                            <View style={styles.mainAvatar}>
                                <Text style={styles.mainAvatarText}>{(config.gasero_nombre || '?').charAt(0).toUpperCase()}</Text>
                            </View>
                            <Text style={styles.gaseroNameDisplay}>{config.gasero_nombre || 'Sin nombre'}</Text>
                            <Text style={styles.gaseroPhoneDisplay}>{config.gasero_telefono}</Text>
                        </View>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.btnCall} onPress={makeCall}>
                                <MaterialCommunityIcons name="phone" size={24} color="#FFFFFF" />
                                <Text style={styles.btnText}>Llamar ahora</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.btnChange} onPress={handleSelectContact}>
                                <MaterialCommunityIcons name="account-edit" size={20} color="#FF6B35" />
                                <Text style={styles.btnChangeText}>Cambiar</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.btnRemove} onPress={removeGasero}>
                            <Text style={styles.removeText}>Quitar de confianza</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.emptyCard}>
                        <MaterialCommunityIcons name="truck-delivery" size={64} color="#1E3A5F" />
                        <Text style={styles.emptyTitle}>Sin gasero asignado</Text>
                        <Text style={styles.emptyDesc}>Asigna a tu pipa o chofer de confianza desde tu agenda para tener su número a la mano.</Text>

                        <TouchableOpacity style={styles.btnPrimary} onPress={handleSelectContact} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="account-plus" size={22} color="#FFFFFF" />
                                    <Text style={styles.btnPrimaryText}>Elegir de mis Contactos</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D1B2A' },
    content: { padding: 20 },
    title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 10 },
    subtitle: { fontSize: 13, color: '#4A6080', marginTop: 6, marginBottom: 24 },
    emptyCard: {
        backgroundColor: '#132338',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1E3A5F',
        marginTop: 20,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 16 },
    emptyDesc: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 20 },
    btnPrimary: {
        backgroundColor: '#FF6B35',
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    btnPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    gaseroCard: {
        backgroundColor: '#132338',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1E3A5F',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    gaseroInfoMain: { alignItems: 'center', marginBottom: 24 },
    mainAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FF6B3520',
        borderWidth: 2,
        borderColor: '#FF6B35',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    mainAvatarText: { fontSize: 32, fontWeight: '800', color: '#FF6B35' },
    gaseroNameDisplay: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
    gaseroPhoneDisplay: { fontSize: 16, color: '#4A6080', marginTop: 4 },
    actionButtons: { width: '100%', gap: 12 },
    btnCall: {
        backgroundColor: '#4ADE80',
        borderRadius: 14,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    btnChange: {
        backgroundColor: 'transparent',
        borderRadius: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#FF6B3540',
    },
    btnChangeText: { color: '#FF6B35', fontSize: 14, fontWeight: '700' },
    btnRemove: { marginTop: 20 },
    removeText: { color: '#F87171', fontSize: 12, fontWeight: '600', opacity: 0.8 },
    // Picker styles
    pickerHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
    pickerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#132338',
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#1E3A5F',
    },
    searchInput: { flex: 1, height: 45, color: '#FFFFFF', marginLeft: 8 },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1E3A5F30',
    },
    contactAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1E3A5F',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: { color: '#FFFFFF', fontWeight: '700' },
    contactInfo: { marginLeft: 12 },
    contactName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
    contactPhone: { color: '#4A6080', fontSize: 12, marginTop: 2 },
});
