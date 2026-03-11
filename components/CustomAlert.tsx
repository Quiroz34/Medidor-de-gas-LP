import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Modal,
    TouchableOpacity, TextInput, Animated,
    Dimensions, Platform, KeyboardAvoidingView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAlert } from '../services/alertContext';

const { width } = Dimensions.get('window');

export default function CustomAlert() {
    const { alertState, hideAlert } = useAlert();
    const [promptValue, setPromptValue] = useState('');
    const [opacity] = useState(new Animated.Value(0));
    const [scale] = useState(new Animated.Value(0.9));

    useEffect(() => {
        if (alertState?.visible) {
            setPromptValue(alertState.defaultValue || '');
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scale, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.timing(opacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start();
        }
    }, [alertState?.visible]);

    if (!alertState || !alertState.visible) return null;

    const { title, message, buttons, type = 'info', isPrompt, placeholder, keyboardType } = alertState;

    const getIcon = () => {
        switch (type) {
            case 'warning': return { name: 'alert-circle', color: '#FACC15' };
            case 'error': return { name: 'close-circle', color: '#F87171' };
            case 'success': return { name: 'check-circle', color: '#4ADE80' };
            default: return { name: 'information', color: '#6366F1' };
        }
    };

    const icon = getIcon();

    const handleButtonPress = (onPress?: (val?: string) => void) => {
        hideAlert();
        if (onPress) {
            setTimeout(() => {
                onPress(isPrompt ? promptValue : undefined);
            }, 200);
        }
    };

    return (
        <Modal transparent visible={alertState.visible} animationType="none">
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={styles.overlay}
            >
                <Animated.View style={[styles.backdrop, { opacity }]} />
                
                <Animated.View style={[styles.alertContainer, { transform: [{ scale }], opacity }]}>
                    <View style={styles.header}>
                        <MaterialCommunityIcons name={icon.name as any} size={28} color={icon.color} />
                        <Text style={styles.title}>{title}</Text>
                    </View>

                    <Text style={styles.message}>{message}</Text>

                    {isPrompt && (
                        <TextInput
                            style={styles.input}
                            value={promptValue}
                            onChangeText={setPromptValue}
                            placeholder={placeholder}
                            placeholderTextColor="#4A6080"
                            keyboardType={keyboardType}
                            autoFocus
                        />
                    )}

                    <View style={styles.buttonContainer}>
                        {buttons && buttons.length > 0 ? (
                            buttons.map((btn, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.button,
                                        btn.style === 'cancel' ? styles.cancelButton :
                                        btn.style === 'destructive' ? styles.destructiveButton :
                                        styles.confirmButton,
                                        buttons.length > 2 && { width: '100%', marginBottom: 8 }
                                    ]}
                                    onPress={() => handleButtonPress(btn.onPress)}
                                >
                                    <Text style={[
                                        styles.buttonText,
                                        btn.style === 'cancel' && styles.cancelButtonText
                                    ]}>
                                        {btn.text}
                                    </Text>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <TouchableOpacity style={styles.confirmButton} onPress={() => handleButtonPress()}>
                                <Text style={styles.buttonText}>Entendido</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(5, 10, 20, 0.85)',
    },
    alertContainer: {
        width: width * 0.85,
        backgroundColor: '#132338',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#1E3A5F',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        flex: 1,
    },
    message: {
        fontSize: 15,
        color: '#94A3B8',
        lineHeight: 22,
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#0D1B2A',
        borderRadius: 12,
        padding: 12,
        color: '#FFFFFF',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#1E3A5F',
        marginBottom: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 10,
    },
    button: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        minWidth: 80,
        alignItems: 'center',
    },
    confirmButton: {
        backgroundColor: '#FF6B35',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#1E3A5F',
    },
    destructiveButton: {
        backgroundColor: '#EF4444',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
    cancelButtonText: {
        color: '#4A6080',
    }
});
