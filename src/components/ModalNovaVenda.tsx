import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { salvarVendaDireta } from '../services/vendaService';
import { FormaPagamento, ItemVenda } from '../types';
import { VendaDiretaPrintData } from '../services/printerService';
import { formatarReal } from '../utils/format';

interface ItemVendaLocal {
    id: string;
    descricao: string;
    valor: string;
}

const FORMA_PAGAMENTO_LABELS: Record<FormaPagamento, string> = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartão: 'Cartão',
};

const FORMA_PAGAMENTO_ICONS: Record<FormaPagamento, string> = {
    dinheiro: 'cash-outline',
    pix: 'qr-code-outline',
    cartão: 'card-outline',
};

interface ModalNovaVendaProps {
    visible: boolean;
    onClose: () => void;
    onSaveSuccess: (vendaPrintData: VendaDiretaPrintData) => void;
}

export default function ModalNovaVenda({ visible, onClose, onSaveSuccess }: ModalNovaVendaProps) {
    const [itensVenda, setItensVenda] = useState<ItemVendaLocal[]>([
        { id: Date.now().toString(), descricao: '', valor: '' },
    ]);
    const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
    const [saving, setSaving] = useState(false);

    // ─── Reset ao fechar ──────────────────────────────────────────────────────
    const handleClose = () => {
        setItensVenda([{ id: Date.now().toString(), descricao: '', valor: '' }]);
        setFormaPagamento('pix');
        onClose();
    };

    // ─── Cálculo do total ─────────────────────────────────────────────────────
    const calcularTotal = () =>
        itensVenda.reduce((sum, item) => {
            const val = parseFloat(item.valor.replace(',', '.'));
            return sum + (isNaN(val) ? 0 : val);
        }, 0);

    // ─── Gerenciar itens ──────────────────────────────────────────────────────
    const handleAdicionarItem = () => {
        setItensVenda(prev => [...prev, { id: Date.now().toString(), descricao: '', valor: '' }]);
    };

    const handleRemoverItem = (id: string) => {
        if (itensVenda.length === 1) {
            Alert.alert('Aviso', 'A venda precisa ter pelo menos 1 item.');
            return;
        }
        setItensVenda(prev => prev.filter(item => item.id !== id));
    };

    const handleUpdateDescricao = (id: string, text: string) => {
        setItensVenda(prev => prev.map(item => (item.id === id ? { ...item, descricao: text } : item)));
    };

    const handleUpdateValor = (id: string, text: string) => {
        setItensVenda(prev => prev.map(item => (item.id === id ? { ...item, valor: text } : item)));
    };

    // ─── Confirmar venda ──────────────────────────────────────────────────────
    const handleConfirmar = async () => {
        for (let i = 0; i < itensVenda.length; i++) {
            const item = itensVenda[i];
            if (!item.descricao.trim()) {
                Alert.alert('Aviso', `Preencha a descrição do item ${i + 1}.`);
                return;
            }
            const val = parseFloat(item.valor.replace(',', '.'));
            if (isNaN(val) || val <= 0) {
                Alert.alert('Aviso', `Digite um valor válido para o item "${item.descricao || `Item ${i + 1}`}".`);
                return;
            }
        }

        const total = calcularTotal();
        if (total <= 0) {
            Alert.alert('Aviso', 'O valor total da venda deve ser maior que zero.');
            return;
        }

        try {
            setSaving(true);
            const itensProntos: ItemVenda[] = itensVenda.map(item => ({
                descricao: item.descricao.trim(),
                valor: parseFloat(item.valor.replace(',', '.')),
            }));

            await salvarVendaDireta(itensProntos, formaPagamento);

            const valorTotal = itensProntos.reduce((s, i) => s + i.valor, 0);
            const vendaPrintData: VendaDiretaPrintData = {
                itens: itensProntos,
                valor_total: valorTotal,
                formaPagamento,
            };

            handleClose();
            onSaveSuccess(vendaPrintData);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível registrar a venda. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={0}
            >
                <View style={styles.backdrop}>
                    <View style={styles.sheet}>

                        {/* Handle visual */}
                        <View style={styles.handle} />

                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>Nova Venda Rápida</Text>
                            <TouchableOpacity
                                onPress={handleClose}
                                style={styles.closeBtn}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close" size={24} color="#7A7067" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.scroll}
                            contentContainerStyle={{ flexGrow: 1 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Itens da Venda */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Itens Vendidos</Text>
                                    <TouchableOpacity
                                        style={styles.btnAdicionarItem}
                                        onPress={handleAdicionarItem}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="add-circle-outline" size={16} color="#8C6239" />
                                        <Text style={styles.btnAdicionarItemText}>Adicionar Item</Text>
                                    </TouchableOpacity>
                                </View>

                                {itensVenda.map((item) => (
                                    <View key={item.id} style={styles.itemRow}>
                                        <View style={styles.itemInputsWrapper}>
                                            <TextInput
                                                style={styles.itemInputDescricao}
                                                placeholder="Ex: Cadarço preto n°40"
                                                placeholderTextColor="#B0A89F"
                                                value={item.descricao}
                                                onChangeText={(text) => handleUpdateDescricao(item.id, text)}
                                                returnKeyType="next"
                                            />
                                            <View style={styles.itemValorWrapper}>
                                                <Text style={styles.itemValorPrefix}>R$</Text>
                                                <TextInput
                                                    style={styles.itemInputValor}
                                                    placeholder="0,00"
                                                    placeholderTextColor="#B0A89F"
                                                    keyboardType="numeric"
                                                    value={item.valor}
                                                    onChangeText={(text) => handleUpdateValor(item.id, text)}
                                                />
                                            </View>
                                        </View>
                                        {itensVenda.length > 1 && (
                                            <TouchableOpacity
                                                style={styles.btnRemoverItem}
                                                onPress={() => handleRemoverItem(item.id)}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Ionicons name="trash-outline" size={18} color="#C0392B" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                            </View>

                            <View style={styles.divider} />

                            {/* Forma de Pagamento */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Forma de Pagamento</Text>
                                <View style={styles.pagamentoRow}>
                                    {(['dinheiro', 'pix', 'cartão'] as FormaPagamento[]).map((forma) => {
                                        const isActive = formaPagamento === forma;
                                        return (
                                            <TouchableOpacity
                                                key={forma}
                                                style={[styles.pagamentoChip, isActive && styles.pagamentoChipActive]}
                                                onPress={() => setFormaPagamento(forma)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons
                                                    name={FORMA_PAGAMENTO_ICONS[forma] as any}
                                                    size={16}
                                                    color={isActive ? '#FAF9F6' : '#7A7067'}
                                                />
                                                <Text
                                                    style={[
                                                        styles.pagamentoChipText,
                                                        isActive && styles.pagamentoChipTextActive,
                                                    ]}
                                                >
                                                    {FORMA_PAGAMENTO_LABELS[forma]}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {/* Resumo Total */}
                            <View style={styles.resumoCard}>
                                <View style={styles.resumoRow}>
                                    <Text style={styles.resumoLabel}>
                                        {itensVenda.length} {itensVenda.length === 1 ? 'item' : 'itens'}
                                    </Text>
                                    <View style={styles.resumoTotalWrapper}>
                                        <Text style={styles.resumoTotalLabel}>Total</Text>
                                        <Text style={styles.resumoTotalValor}>
                                            {formatarReal(calcularTotal())}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Botão Confirmar */}
                            <TouchableOpacity
                                style={[styles.btnConfirmar, saving && styles.btnConfirmarDisabled]}
                                onPress={handleConfirmar}
                                activeOpacity={0.85}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#FAF9F6" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle-outline" size={20} color="#FAF9F6" />
                                        <Text style={styles.btnConfirmarText}>Confirmar Venda</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <View style={{ height: 24 }} />
                        </ScrollView>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(44,37,32,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        maxHeight: '92%',
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 12,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#E2DCD5',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0EBE5',
    },
    title: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#2C2520',
        letterSpacing: 0.2,
    },
    closeBtn: {
        padding: 4,
    },
    scroll: {
        flexGrow: 0,
    },
    section: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#8C6239',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0EBE5',
        marginHorizontal: 20,
    },

    // ─── Linha de Item ────────────────────────────────────────────────────────
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    itemInputsWrapper: {
        flex: 1,
        flexDirection: 'row',
        gap: 8,
    },
    itemInputDescricao: {
        flex: 1,
        height: 44,
        backgroundColor: '#FAF9F6',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        paddingHorizontal: 12,
        fontSize: 14,
        color: '#2C2520',
    },
    itemValorWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 90,
        height: 44,
        backgroundColor: '#FAF9F6',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        paddingHorizontal: 10,
    },
    itemValorPrefix: {
        fontSize: 13,
        color: '#9A8E85',
        fontWeight: '600',
        marginRight: 4,
    },
    itemInputValor: {
        flex: 1,
        height: '100%',
        fontSize: 14,
        color: '#2C2520',
        padding: 0,
    },
    btnRemoverItem: {
        marginLeft: 10,
        padding: 4,
    },
    btnAdicionarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#8C6239',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    btnAdicionarItemText: {
        fontSize: 12,
        color: '#8C6239',
        fontWeight: 'bold',
        marginLeft: 4,
    },

    // ─── Forma de Pagamento ───────────────────────────────────────────────────
    pagamentoRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    pagamentoChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E2DCD5',
        backgroundColor: '#FFFFFF',
        gap: 6,
    },
    pagamentoChipActive: {
        backgroundColor: '#8C6239',
        borderColor: '#8C6239',
    },
    pagamentoChipText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#7A7067',
    },
    pagamentoChipTextActive: {
        color: '#FAF9F6',
    },

    // ─── Resumo ───────────────────────────────────────────────────────────────
    resumoCard: {
        marginHorizontal: 20,
        marginVertical: 16,
        backgroundColor: '#FAF9F6',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },
    resumoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    resumoLabel: {
        fontSize: 13,
        color: '#9A8E85',
    },
    resumoTotalWrapper: {
        alignItems: 'flex-end',
    },
    resumoTotalLabel: {
        fontSize: 11,
        color: '#9A8E85',
    },
    resumoTotalValor: {
        fontSize: 24,
        fontWeight: '800',
        color: '#8C6239',
        letterSpacing: -0.5,
    },

    // ─── Botão Confirmar ──────────────────────────────────────────────────────
    btnConfirmar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8C6239',
        marginHorizontal: 20,
        borderRadius: 12,
        paddingVertical: 15,
        gap: 8,
        shadowColor: '#8C6239',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
    },
    btnConfirmarDisabled: {
        opacity: 0.65,
    },
    btnConfirmarText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#FAF9F6',
        letterSpacing: 0.3,
    },
});
