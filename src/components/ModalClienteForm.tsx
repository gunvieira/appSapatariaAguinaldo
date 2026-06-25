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
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addCliente, updateCliente } from '../services/clienteService';
import { Cliente } from '../types';
import { aplicarMascaraTelefone, limparMascaraTelefone, formatarTelefone } from '../utils/format';

interface ModalClienteFormProps {
    visible: boolean;
    clienteEditando: Cliente | null;
    onClose: () => void;
    onSaveSuccess: (cliente: Cliente, isEdit: boolean) => void;
}

export default function ModalClienteForm({
    visible,
    clienteEditando,
    onClose,
    onSaveSuccess,
}: ModalClienteFormProps) {
    const [formNome, setFormNome] = useState('');
    const [formWhatsapp, setFormWhatsapp] = useState('');
    const [salvando, setSalvando] = useState(false);

    // Preencher campos ao abrir para edição
    useEffect(() => {
        if (visible) {
            if (clienteEditando) {
                setFormNome(clienteEditando.nome);
                setFormWhatsapp(formatarTelefone(clienteEditando.whatsapp));
            } else {
                setFormNome('');
                setFormWhatsapp('');
            }
        }
    }, [visible, clienteEditando]);

    const handleSalvar = async () => {
        const nomeTrimmed = formNome.trim();
        const wppDigitos = limparMascaraTelefone(formWhatsapp);

        if (!nomeTrimmed) {
            Alert.alert('Campo obrigatório', 'Informe o nome do cliente.');
            return;
        }
        if (wppDigitos.length < 10) {
            Alert.alert('Telefone inválido', 'Informe um WhatsApp válido com DDD.');
            return;
        }

        setSalvando(true);
        try {
            if (clienteEditando) {
                await updateCliente(clienteEditando.id, { nome: nomeTrimmed, whatsapp: wppDigitos });
                const clienteAtualizado: Cliente = {
                    ...clienteEditando,
                    nome: nomeTrimmed,
                    whatsapp: wppDigitos,
                };
                onSaveSuccess(clienteAtualizado, true);
            } else {
                const novoCliente = await addCliente(nomeTrimmed, wppDigitos);
                onSaveSuccess(novoCliente, false);
            }
            onClose();
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível salvar o cliente. Tente novamente.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            statusBarTranslucent
            onRequestClose={() => !salvando && onClose()}
        >
            <KeyboardAvoidingView
                behavior="padding"
                style={{ flex: 1 }}
                keyboardVerticalOffset={0}
            >
                <View style={styles.overlay}>
                    <Pressable style={styles.backdrop} onPress={() => !salvando && onClose()} />
                    <View style={styles.sheet}>
                        {/* Handle */}
                        <View style={styles.handle} />

                        {/* Título */}
                        <View style={styles.header}>
                            <Text style={styles.title}>
                                {clienteEditando ? 'Editar Cliente' : 'Novo Cliente'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => !salvando && onClose()}
                                style={styles.closeBtn}
                                disabled={salvando}
                            >
                                <Ionicons name="close" size={22} color="#7A7067" />
                            </TouchableOpacity>
                        </View>

                        {/* Formulário */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Nome completo *</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="Ex: João da Silva"
                                placeholderTextColor="#C5BAB1"
                                value={formNome}
                                onChangeText={setFormNome}
                                autoCapitalize="words"
                                editable={!salvando}
                                returnKeyType="next"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>WhatsApp *</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="(11) 99999-9999"
                                placeholderTextColor="#C5BAB1"
                                value={formWhatsapp}
                                onChangeText={(v) => setFormWhatsapp(aplicarMascaraTelefone(v))}
                                keyboardType="phone-pad"
                                editable={!salvando}
                                returnKeyType="done"
                            />
                        </View>

                        {/* Botões */}
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={[styles.btn, styles.btnCancel]}
                                onPress={onClose}
                                disabled={salvando}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.btnCancelText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.btn, styles.btnSave, salvando && { opacity: 0.7 }]}
                                onPress={handleSalvar}
                                disabled={salvando}
                                activeOpacity={0.8}
                            >
                                {salvando ? (
                                    <ActivityIndicator size="small" color="#FAF9F6" />
                                ) : (
                                    <Text style={styles.btnSaveText}>
                                        {clienteEditando ? 'Salvar Alterações' : 'Adicionar Cliente'}
                                    </Text>
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
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(44,37,32,0.45)',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E2DCD5',
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 6,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0EBE5',
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#2C2520',
    },
    closeBtn: {
        padding: 4,
    },
    formGroup: {
        paddingHorizontal: 20,
        paddingTop: 18,
    },
    formLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#7A7067',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    formInput: {
        backgroundColor: '#FAF9F6',
        borderWidth: 1,
        borderColor: '#E2DCD5',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 11,
        fontSize: 15,
        color: '#2C2520',
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 20,
        gap: 10,
    },
    btn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnCancel: {
        backgroundColor: '#F0EBE5',
    },
    btnCancelText: {
        color: '#7A7067',
        fontWeight: '600',
        fontSize: 14,
    },
    btnSave: {
        backgroundColor: '#8C6239',
    },
    btnSaveText: {
        color: '#FAF9F6',
        fontWeight: '700',
        fontSize: 14,
    },
});
