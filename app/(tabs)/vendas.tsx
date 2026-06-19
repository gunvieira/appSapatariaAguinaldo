import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getVendasDoDia, salvarVendaDireta } from '../../src/services/vendaService';
import { VendaDiretaDoc, ItemVenda } from '../../src/types';
import ModalImpressora from '../../src/components/ModalImpressora';
import {
    getMacImpressora,
    salvarMacImpressora,
    limparMacImpressora,
    imprimirReciboVenda,
    VendaDiretaPrintData,
} from '../../src/services/printerService';

type FormaPagamento = 'dinheiro' | 'pix' | 'cartao';

interface ItemVendaLocal {
    id: string;
    descricao: string;
    valor: string; // string para o TextInput
}

const FORMA_PAGAMENTO_LABELS: Record<FormaPagamento, string> = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao: 'Cartão',
};

const FORMA_PAGAMENTO_ICONS: Record<FormaPagamento, string> = {
    dinheiro: 'cash-outline',
    pix: 'qr-code-outline',
    cartao: 'card-outline',
};

function formatarHora(timestamp: any): string {
    if (!timestamp) return '';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

export default function Vendas() {
    // ─── Estados ─────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [vendas, setVendas] = useState<VendaDiretaDoc[]>([]);
    const [showModal, setShowModal] = useState(false);

    // Estado do modal de nova venda
    const [itensVenda, setItensVenda] = useState<ItemVendaLocal[]>([
        { id: Date.now().toString(), descricao: '', valor: '' }
    ]);
    const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');

    // Impressora
    const [showModalImpressora, setShowModalImpressora] = useState(false);
    const [pendingVendaPrintData, setPendingVendaPrintData] = useState<VendaDiretaPrintData | null>(null);
    const [imprimindo, setImprimindo] = useState(false);

    // ─── Carregar Dados ───────────────────────────────────────────────────────
    const carregarDados = async () => {
        try {
            const lista = await getVendasDoDia();
            setVendas(lista);
        } catch (error) {
            console.error('Erro ao carregar vendas do dia:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            carregarDados();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        carregarDados();
    };

    // ─── Total do Dia ─────────────────────────────────────────────────────────
    const totalDoDia = vendas.reduce((sum, v) => sum + v.valor_total, 0);

    // ─── Cálculo do Modal ─────────────────────────────────────────────────────
    const calcularTotalModal = () => {
        return itensVenda.reduce((sum, item) => {
            const val = parseFloat(item.valor.replace(',', '.'));
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
    };

    // ─── Gerenciar Itens do Modal ─────────────────────────────────────────────
    const handleAdicionarItem = () => {
        setItensVenda(prev => [
            ...prev,
            { id: Date.now().toString(), descricao: '', valor: '' }
        ]);
    };

    const handleRemoverItem = (id: string) => {
        if (itensVenda.length === 1) {
            Alert.alert('Aviso', 'A venda precisa ter pelo menos 1 item.');
            return;
        }
        setItensVenda(prev => prev.filter(item => item.id !== id));
    };

    const handleUpdateDescricao = (id: string, text: string) => {
        setItensVenda(prev =>
            prev.map(item => item.id === id ? { ...item, descricao: text } : item)
        );
    };

    const handleUpdateValor = (id: string, text: string) => {
        setItensVenda(prev =>
            prev.map(item => item.id === id ? { ...item, valor: text } : item)
        );
    };

    // ─── Abrir / Fechar Modal ─────────────────────────────────────────────────
    const handleAbrirModal = () => {
        setItensVenda([{ id: Date.now().toString(), descricao: '', valor: '' }]);
        setFormaPagamento('pix');
        setShowModal(true);
    };

    const handleFecharModal = () => {
        setShowModal(false);
    };

    // ─── Confirmar Venda ──────────────────────────────────────────────────────
    const handleConfirmarVenda = async () => {
        // Validar itens
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

        const total = calcularTotalModal();
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
            setPendingVendaPrintData(vendaPrintData);
            handleFecharModal();
            await carregarDados();

            Alert.alert(
                '\u2705 Venda Registrada!',
                `Total: R$ ${valorTotal.toFixed(2)}\n\nDeseja imprimir o comprovante?`,
                [
                    { text: 'N\u00e3o', style: 'cancel' },
                    { text: '\u{1F5A8}\uFE0F Imprimir', onPress: handleImprimirVenda },
                ]
            );
        } catch (error) {
            Alert.alert('Erro', 'N\u00e3o foi poss\u00edvel registrar a venda. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    // ─── Impressão ────────────────────────────────────────────────────────────
    const handleImprimirVenda = async () => {
        if (!pendingVendaPrintData) return;
        const mac = await getMacImpressora();
        if (!mac) {
            setShowModalImpressora(true);
        } else {
            await executarImpressaoVenda(mac);
        }
    };

    const executarImpressaoVenda = async (mac: string) => {
        let sucesso = false;
        try {
            setImprimindo(true);
            sucesso = await imprimirReciboVenda(mac, pendingVendaPrintData!);
        } finally {
            setImprimindo(false);
        }

        if (sucesso) {
            setPendingVendaPrintData(null);
        } else {
            Alert.alert(
                'Falha na Impressão',
                'Não foi possível conectar com a impressora.\nDeseja remover este dispositivo como padrão e escolher outro?',
                [
                    { 
                        text: 'Apenas Cancelar', 
                        style: 'cancel',
                        onPress: () => {
                            setPendingVendaPrintData(null);
                        }
                    },
                    {
                        text: 'Remover e Escolher Outra',
                        onPress: async () => {
                            await limparMacImpressora();
                            setShowModalImpressora(true);
                        }
                    }
                ]
            );
        }
    };

    // ─── Renderização de cada venda na lista ──────────────────────────────────
    const renderVendaCard = ({ item }: { item: VendaDiretaDoc }) => {
        const hora = formatarHora(item.createdAt);
        const icone = FORMA_PAGAMENTO_ICONS[item.formaPagamento] as any;
        const label = FORMA_PAGAMENTO_LABELS[item.formaPagamento];

        return (
            <View style={styles.vendaCard}>
                {/* Barra lateral colorida por forma de pagamento */}
                <View style={[
                    styles.vendaCardAccent,
                    {
                        backgroundColor:
                            item.formaPagamento === 'dinheiro' ? '#2E7D32' :
                            item.formaPagamento === 'pix' ? '#1565C0' :
                            '#8D6E1A'
                    }
                ]} />

                <View style={styles.vendaCardBody}>
                    {/* Itens da venda */}
                    <View style={styles.vendaItensRow}>
                        {item.itens.slice(0, 2).map((it, idx) => (
                            <View key={idx} style={styles.itemTag}>
                                <Text style={styles.itemTagText} numberOfLines={1}>
                                    {it.descricao}
                                </Text>
                            </View>
                        ))}
                        {item.itens.length > 2 && (
                            <View style={styles.itemTagMore}>
                                <Text style={styles.itemTagMoreText}>+{item.itens.length - 2}</Text>
                            </View>
                        )}
                    </View>

                    {/* Rodapé com pagamento, hora e valor */}
                    <View style={styles.vendaCardFooter}>
                        <View style={styles.vendaPagRow}>
                            <Ionicons name={icone} size={13} color="#7A7067" />
                            <Text style={styles.vendaPagText}>{label}</Text>
                            {hora ? <Text style={styles.vendaHoraText}> · {hora}</Text> : null}
                        </View>
                        <Text style={styles.vendaValor}>R$ {item.valor_total.toFixed(2)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    // ─── Loading Inicial ──────────────────────────────────────────────────────
    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8C6239" />
                <Text style={styles.loadingText}>Carregando vendas do dia...</Text>
            </SafeAreaView>
        );
    }

    // ─── Render Principal ─────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
            <View style={styles.container}>

                {/* ─── CARD TOTAL DO DIA ──────────────────────────────────────── */}
                <View style={styles.topSummaryWrapper}>
                    <View style={styles.totalDiaCard}>
                        <View style={styles.totalDiaLeft}>
                            <View style={styles.totalIconWrapper}>
                                <Ionicons name="cart" size={22} color="#FAF9F6" />
                            </View>
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.totalDiaLabel}>Vendas de Hoje</Text>
                                <Text style={styles.totalDiaCount}>
                                    {vendas.length} {vendas.length === 1 ? 'venda' : 'vendas'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.totalDiaRight}>
                            <Text style={styles.totalDiaValor}>R$ {totalDoDia.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* ─── LISTA DE VENDAS DO DIA ──────────────────────────────────── */}
                <FlatList
                    data={vendas}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onRefresh={onRefresh}
                    refreshing={refreshing}
                    ListHeaderComponent={
                        vendas.length > 0 ? (
                            <Text style={styles.listHeader}>Vendas Registradas Hoje</Text>
                        ) : null
                    }
                    renderItem={renderVendaCard}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="cart-outline" size={52} color="#E2DCD5" />
                            <Text style={styles.emptyTitle}>Nenhuma Venda Hoje</Text>
                            <Text style={styles.emptySubtitle}>
                                Registre suas vendas rápidas de balcão aqui. Toque no{' '}
                                <Text style={{ color: '#8C6239', fontWeight: 'bold' }}>+</Text>{' '}
                                para começar.
                            </Text>
                        </View>
                    }
                />

                {/* ─── FAB (+) ────────────────────────────────────────────────── */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={handleAbrirModal}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={30} color="#FAF9F6" />
                </TouchableOpacity>

            </View>

            {/* ─── MODAL: NOVA VENDA ───────────────────────────────────────────── */}
            <Modal
                visible={showModal}
                animationType="slide"
                transparent={true}
                onRequestClose={handleFecharModal}
            >
                <View style={styles.modalBackdrop}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.modalSheetWrapper}
                    >
                        <View style={styles.modalSheet}>

                            {/* Handle visual */}
                            <View style={styles.modalHandle} />

                            {/* Header do Modal */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Nova Venda Rápida</Text>
                                <TouchableOpacity
                                    onPress={handleFecharModal}
                                    style={styles.modalCloseBtn}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="close" size={24} color="#7A7067" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                style={styles.modalScroll}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                            >
                                {/* Itens da Venda */}
                                <View style={styles.modalSection}>
                                    <View style={styles.modalSectionHeader}>
                                        <Text style={styles.modalSectionTitle}>Itens Vendidos</Text>
                                        <TouchableOpacity
                                            style={styles.btnAdicionarItem}
                                            onPress={handleAdicionarItem}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="add-circle-outline" size={16} color="#8C6239" />
                                            <Text style={styles.btnAdicionarItemText}>Adicionar Item</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {itensVenda.map((item, index) => (
                                        <View key={item.id} style={styles.itemRow}>
                                            <View style={styles.itemInputsWrapper}>
                                                <TextInput
                                                    style={styles.itemInputDescricao}
                                                    placeholder={`Ex: Cadarço preto n°40`}
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

                                {/* Divisor */}
                                <View style={styles.divider} />

                                {/* Forma de Pagamento */}
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>Forma de Pagamento</Text>
                                    <View style={styles.pagamentoRow}>
                                        {(['dinheiro', 'pix', 'cartao'] as FormaPagamento[]).map((forma) => {
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
                                                    <Text style={[
                                                        styles.pagamentoChipText,
                                                        isActive && styles.pagamentoChipTextActive
                                                    ]}>
                                                        {FORMA_PAGAMENTO_LABELS[forma]}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Divisor */}
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
                                                R$ {calcularTotalModal().toFixed(2)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Botão Confirmar */}
                                <TouchableOpacity
                                    style={[styles.btnConfirmar, saving && styles.btnConfirmarDisabled]}
                                    onPress={handleConfirmarVenda}
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

                                {/* Espaço extra para o teclado */}
                                <View style={{ height: 24 }} />
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* ─── MODAL: SELEÇÃO DE IMPRESSORA ──────────────────────── */}
            <ModalImpressora
                visible={showModalImpressora}
                macSalvo={undefined}
                onClose={() => {
                    setShowModalImpressora(false);
                    setPendingVendaPrintData(null);
                }}
                onSelectDevice={async (device) => {
                    await salvarMacImpressora(device.address);
                    setShowModalImpressora(false);
                    await executarImpressaoVenda(device.address);
                }}
            />

            {/* Overlay de impressão */}
            {imprimindo && (
                <View style={styles.printingOverlay}>
                    <View style={styles.printingBox}>
                        <ActivityIndicator size="large" color="#8C6239" />
                        <Text style={styles.printingText}>Imprimindo comprovante...</Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FAF9F6',
    },
    container: {
        flex: 1,
        backgroundColor: '#FAF9F6',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#FAF9F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#7A7067',
        fontSize: 14,
        marginTop: 15,
    },

    // ─── Card Total do Dia ────────────────────────────────────────────────────
    topSummaryWrapper: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 4,
    },
    totalDiaCard: {
        backgroundColor: '#8C6239',
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#8C6239',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    totalDiaLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    totalIconWrapper: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(250,249,246,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    totalDiaLabel: {
        fontSize: 12,
        color: 'rgba(250,249,246,0.75)',
        fontWeight: '600',
        letterSpacing: 0.4,
    },
    totalDiaCount: {
        fontSize: 11,
        color: 'rgba(250,249,246,0.55)',
        marginTop: 2,
    },
    totalDiaRight: {},
    totalDiaValor: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FAF9F6',
        letterSpacing: -0.5,
    },

    // ─── Lista ────────────────────────────────────────────────────────────────
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 90,
    },
    listHeader: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#9A8E85',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 10,
    },

    // ─── Venda Card ───────────────────────────────────────────────────────────
    vendaCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        marginBottom: 10,
        overflow: 'hidden',
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    vendaCardAccent: {
        width: 5,
    },
    vendaCardBody: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    vendaItensRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8,
    },
    itemTag: {
        backgroundColor: '#F5F2EB',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        maxWidth: 160,
    },
    itemTagText: {
        fontSize: 11,
        color: '#2C2520',
        fontWeight: '500',
    },
    itemTagMore: {
        backgroundColor: '#E2DCD5',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    itemTagMoreText: {
        fontSize: 11,
        color: '#7A7067',
        fontWeight: '600',
    },
    vendaCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    vendaPagRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    vendaPagText: {
        fontSize: 12,
        color: '#7A7067',
        marginLeft: 4,
    },
    vendaHoraText: {
        fontSize: 12,
        color: '#9A8E85',
    },
    vendaValor: {
        fontSize: 15,
        fontWeight: '800',
        color: '#8C6239',
    },

    // ─── Estado Vazio ─────────────────────────────────────────────────────────
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 30,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#2C2520',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 13,
        color: '#9A8E85',
        textAlign: 'center',
        lineHeight: 20,
    },

    // ─── FAB ─────────────────────────────────────────────────────────────────
    fab: {
        position: 'absolute',
        bottom: 22,
        right: 20,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#8C6239',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#8C6239',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
    },

    // ─── Modal ────────────────────────────────────────────────────────────────
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(44,37,32,0.45)',
        justifyContent: 'flex-end',
    },
    modalSheetWrapper: {
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        paddingHorizontal: 0,
        maxHeight: '92%',
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 12,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E2DCD5',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 4,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0EBE5',
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#2C2520',
        letterSpacing: 0.2,
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalScroll: {
        flexGrow: 0,
    },
    modalSection: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    modalSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    modalSectionTitle: {
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

    // ─── Linha de Item no Modal ───────────────────────────────────────────────
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

    // ─── Overlay de Impressão ──────────────────────────────────────────────
    printingOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(44, 37, 32, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    printingBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 28,
        alignItems: 'center',
        gap: 14,
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    printingText: {
        fontSize: 14,
        color: '#7A7067',
        fontWeight: '600',
    },
});