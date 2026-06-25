import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { addCliente } from '../services/clienteService';
import { Cliente } from '../types';
import { aplicarMascaraTelefone, limparMascaraTelefone } from '../utils/format';

interface ModalNovoClienteProps {
    visible: boolean;
    onClose: () => void;
    onSaveSuccess: (novoCliente: Cliente) => void;
    initialNome?: string;
    initialWhatsapp?: string;
}

export default function ModalNovoCliente({ 
    visible, 
    onClose, 
    onSaveSuccess,
    initialNome = '',
    initialWhatsapp = ''
}: ModalNovoClienteProps) {
    const [nome, setNome] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            setNome(initialNome);
            setWhatsapp(initialWhatsapp);
        }
    }, [visible, initialNome, initialWhatsapp]);

    const handleCriarCliente = async () => {
        if (!nome.trim() || !whatsapp.trim()) {
            Alert.alert('Aviso', 'Preencha todos os campos do cliente.');
            return;
        }
        try {
            setLoading(true);
            const rawWhatsapp = limparMascaraTelefone(whatsapp);
            const novoCliente = await addCliente(nome.trim(), rawWhatsapp);
            
            setNome('');
            setWhatsapp('');
            onSaveSuccess(novoCliente);
            onClose();
            Alert.alert('Sucesso', 'Cliente cadastrado com sucesso!');
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível cadastrar o cliente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Cadastrar Novo Cliente</Text>
                        
                        <Text style={styles.inputLabel}>Nome Completo:</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Ex: João da Silva"
                            placeholderTextColor="#9A8E85"
                            value={nome}
                            onChangeText={setNome}
                            editable={!loading}
                        />

                        <Text style={styles.inputLabel}>WhatsApp/Telefone:</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Ex: (11) 99999-9999"
                            placeholderTextColor="#9A8E85"
                            keyboardType="phone-pad"
                            value={whatsapp}
                            onChangeText={(text) => setWhatsapp(aplicarMascaraTelefone(text))}
                            editable={!loading}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.modalBtn, { backgroundColor: '#FAF9F6', borderWidth: 1, borderColor: '#E2DCD5' }]}
                                onPress={onClose}
                                disabled={loading}
                            >
                                <Text style={[styles.modalBtnText, { color: '#7A7067' }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalBtn, { backgroundColor: '#8C6239' }]}
                                onPress={handleCriarCliente}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#FAF9F6" />
                                ) : (
                                    <Text style={[styles.modalBtnText, { color: '#FAF9F6' }]}>Salvar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(44, 37, 32, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        width: '85%',
        borderWidth: 1,
        borderColor: '#E2DCD5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#8C6239',
    },
    inputLabel: {
        fontSize: 13,
        color: '#7A7067',
        marginBottom: 6,
        marginTop: 10,
    },
    modalInput: {
        backgroundColor: '#FAF9F6',
        borderRadius: 6,
        height: 44,
        paddingHorizontal: 12,
        color: '#2C2520',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        marginVertical: 8,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 18,
    },
    modalBtn: {
        flex: 1,
        height: 44,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 5,
    },
    modalBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
});
