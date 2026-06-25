import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getVendasDoDia, deletarVendaDireta } from '../../src/services/vendaService';
import { reloadSignal } from '../../src/utils/reloadSignal';
import { VendaDiretaDoc, FormaPagamento } from '../../src/types';
import ModalImpressora from '../../src/components/ModalImpressora';
import ModalComprovante from '../../src/components/ModalComprovante';
import ModalNovaVenda from '../../src/components/ModalNovaVenda';
import {
    getMacImpressora,
    salvarMacImpressora,
    limparMacImpressora,
    imprimirReciboVenda,
    VendaDiretaPrintData,
    buildReciboVendaTexto,
} from '../../src/services/printerService';
import { formatarReal } from '../../src/utils/format';

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
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [vendas, setVendas] = useState<VendaDiretaDoc[]>([]);
    const [showModal, setShowModal] = useState(false);

    // Impressora
    const [showModalImpressora, setShowModalImpressora] = useState(false);
    const [pendingVendaPrintData, setPendingVendaPrintData] = useState<VendaDiretaPrintData | null>(null);
    const [imprimindo, setImprimindo] = useState(false);

    // Pré-visualização do comprovante
    const [showComprovante, setShowComprovante] = useState(false);
    const [textoComprovante, setTextoComprovante] = useState('');

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
            if (reloadSignal.vendas) {
                setLoading(true);
                carregarDados();
                reloadSignal.vendas = false;
            }
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        carregarDados();
    };

    const totalDoDia = vendas.reduce((sum, v) => sum + v.valor_total, 0);

    // ─── Callback do Modal de Nova Venda ──────────────────────────────────────
    const handleVendaSalva = async (vendaPrintData: VendaDiretaPrintData) => {
        setPendingVendaPrintData(vendaPrintData);
        await carregarDados();
        const texto = buildReciboVendaTexto(vendaPrintData);
        setTextoComprovante(texto);
        setShowComprovante(true);
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
                        onPress: () => setPendingVendaPrintData(null),
                    },
                    {
                        text: 'Remover e Escolher Outra',
                        onPress: async () => {
                            await limparMacImpressora();
                            setShowModalImpressora(true);
                        },
                    },
                ]
            );
        }
    };

    const handleExcluirVenda = (id: string, valor: number) => {
        Alert.alert(
            'Excluir Venda',
            `Tem certeza que deseja excluir permanentemente esta venda de ${formatarReal(valor)}? Esta ação não pode ser desfeita.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: () => executarExclusaoVenda(id),
                },
            ]
        );
    };

    const executarExclusaoVenda = async (id: string) => {
        try {
            setLoading(true);
            await deletarVendaDireta(id);
            Alert.alert('Sucesso', 'Venda excluída com sucesso!');
            await carregarDados();
        } catch (error) {
            console.error('Erro ao excluir venda:', error);
            Alert.alert('Erro', 'Não foi possível excluir a venda. Tente novamente.');
        } finally {
            setLoading(false);
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
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.vendaValor}>{formatarReal(item.valor_total)}</Text>
                            <TouchableOpacity
                                onPress={() => handleExcluirVenda(item.id, item.valor_total)}
                                style={{ marginLeft: 12, padding: 4 }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="trash-outline" size={18} color="#C0392B" />
                            </TouchableOpacity>
                        </View>
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
                            <Text style={styles.totalDiaValor}>{formatarReal(totalDoDia)}</Text>
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
                    onPress={() => setShowModal(true)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={30} color="#FAF9F6" />
                </TouchableOpacity>

            </View>

            {/* ─── MODAL: NOVA VENDA ───────────────────────────────────────────── */}
            <ModalNovaVenda
                visible={showModal}
                onClose={() => setShowModal(false)}
                onSaveSuccess={handleVendaSalva}
            />

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

            {/* ─── MODAL: PRÉ-VISUALIZAÇÃO DO COMPROVANTE ─────────────────── */}
            <ModalComprovante
                visible={showComprovante}
                titulo="Comprovante de Venda"
                textoComprovante={textoComprovante}
                onImprimir={() => {
                    setShowComprovante(false);
                    handleImprimirVenda();
                }}
                onFechar={() => setShowComprovante(false)}
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