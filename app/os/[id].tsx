import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Alert,
    Modal,
    Platform,
    Linking,
    RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getOSById, atualizarStatusOS } from '../../src/config/firebaseServices';
import { OrdemServico, StatusOS, FormaPagamento } from '../../src/types';
import StatusBadge from '../../src/components/StatusBadge';
import ModalImpressora from '../../src/components/ModalImpressora';
import {
    getMacImpressora,
    salvarMacImpressora,
    limparMacImpressora,
    imprimirReciboRetiradaOS,
    OSPrintData,
} from '../../src/services/printerService';

// Helper to format date
function formatarDataCompleta(timestamp: any): string {
    if (!timestamp) return '';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
}

export default function DetalhesOS() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [os, setOs] = useState<OrdemServico | null>(null);

    // Printer states
    const [showModalImpressora, setShowModalImpressora] = useState(false);
    const [imprimindo, setImprimindo] = useState(false);
    const [formaPagamentoSaldoSel, setFormaPagamentoSaldoSel] = useState<FormaPagamento>('pix');
    const [showPagamentoModal, setShowPagamentoModal] = useState(false);
    const [processandoEntrega, setProcessandoEntrega] = useState(false);

    useEffect(() => {
        carregarOS();
    }, [id]);

    const carregarOS = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const dados = await getOSById(id);
            setOs(dados);
        } catch (error) {
            console.error('Erro ao carregar OS:', error);
            Alert.alert('Erro', 'Não foi possível carregar os detalhes da Ordem de Serviço.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        carregarOS();
    };

    // WhatsApp contact logic
    const handleWhatsApp = () => {
        if (!os?.clienteTelefone) return;
        // Clean phone number from formatting
        const limpo = os.clienteTelefone.replace(/\D/g, '');
        // Append Brazil code if needed
        const fone = limpo.startsWith('55') ? limpo : `55${limpo}`;
        const msg = encodeURIComponent(`Olá ${os.clienteNome}, tudo bem? Aqui é da Sapataria Aguinaldo referente à sua Ordem de Serviço #${os.id.substring(os.id.length - 6).toUpperCase()}.`);
        Linking.openURL(`https://wa.me/${fone}?text=${msg}`).catch(() => {
            Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
        });
    };

    const handleLigar = () => {
        if (!os?.clienteTelefone) return;
        const limpo = os.clienteTelefone.replace(/\D/g, '');
        Linking.openURL(`tel:${limpo}`).catch(() => {
            Alert.alert('Erro', 'Não foi possível efetuar a ligação.');
        });
    };

    // Update status logic
    const handleMudarStatus = async (novoStatus: StatusOS) => {
        if (!os) return;
        try {
            setLoading(true);
            await atualizarStatusOS(os.id, novoStatus);
            Alert.alert('Sucesso', `Status atualizado para: ${novoStatus === 'em_conserto' ? 'Em Conserto' : 'Pronto'}`);
            await carregarOS();
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível atualizar o status da OS.');
        } finally {
            setLoading(false);
        }
    };

    // Delivery / Pickup flow
    const handleEntregarOS = () => {
        if (!os) return;
        if (os.saldo > 0) {
            setShowPagamentoModal(true);
        } else {
            confirmarEntregaSemSaldo();
        }
    };

    const confirmarEntregaSemSaldo = async () => {
        if (!os) return;
        try {
            setProcessandoEntrega(true);
            await atualizarStatusOS(os.id, 'entregue');
            await registrarSucessoEntrega();
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível finalizar a entrega da OS.');
        } finally {
            setProcessandoEntrega(false);
        }
    };

    const confirmarEntregaComSaldo = async () => {
        if (!os) return;
        try {
            setProcessandoEntrega(true);
            await atualizarStatusOS(os.id, 'entregue', formaPagamentoSaldoSel);
            setShowPagamentoModal(false);
            await registrarSucessoEntrega(formaPagamentoSaldoSel);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível registrar o pagamento e entrega.');
        } finally {
            setProcessandoEntrega(false);
        }
    };

    const registrarSucessoEntrega = async (pgtoSaldo?: FormaPagamento) => {
        Alert.alert(
            'OS Entregue com Sucesso!',
            'Deseja imprimir o comprovante de entrega e quitação do cliente?',
            [
                {
                    text: 'Não',
                    style: 'cancel',
                    onPress: () => carregarOS(),
                },
                {
                    text: '🖨️ Imprimir',
                    onPress: async () => {
                        const mac = await getMacImpressora();
                        if (!mac) {
                            setShowModalImpressora(true);
                        } else {
                            await executarImpressaoRetirada(mac, pgtoSaldo || 'pix');
                        }
                    }
                }
            ]
        );
    };

    const executarImpressaoRetirada = async (mac: string, pgtoSaldo: string) => {
        if (!os) return;
        const printData: OSPrintData = {
            id: os.id,
            clienteNome: os.clienteNome,
            clienteTelefone: os.clienteTelefone,
            itens: os.itens.map(it => ({
                descricao: it.descricao,
                servicos: it.servicos
            })),
            sinal: os.sinal,
            saldo: os.saldo,
            formaPagamentoSinal: os.formaPagamentoSinal,
            createdAt: os.createdAt
        };

        let sucesso = false;
        try {
            setImprimindo(true);
            sucesso = await imprimirReciboRetiradaOS(mac, printData, pgtoSaldo);
        } finally {
            setImprimindo(false);
        }

        if (sucesso) {
            Alert.alert('Sucesso', 'Comprovante de entrega impresso!');
            carregarOS();
        } else {
            Alert.alert(
                'Falha na Impressão',
                'Não foi possível conectar com a impressora.\nDeseja remover este dispositivo como padrão e escolher outro?',
                [
                    { 
                        text: 'Apenas Cancelar', 
                        style: 'cancel',
                        onPress: () => {
                            carregarOS();
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

    const handleReimprimirComprovante = async () => {
        const mac = await getMacImpressora();
        if (!mac) {
            setShowModalImpressora(true);
        } else {
            // Em OS entregue, a formaPagamentoSaldo pode estar salva no documento
            const pgtoSaldo = (os as any)?.formaPagamentoSaldo || 'pix';
            await executarImpressaoRetirada(mac, pgtoSaldo);
        }
    };

    // Loading Screen
    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8C6239" />
                <Text style={styles.loadingText}>Carregando Ordem de Serviço...</Text>
            </SafeAreaView>
        );
    }

    if (!os) {
        return (
            <SafeAreaView style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={54} color="#D32F2F" />
                <Text style={styles.errorText}>Ordem de Serviço não encontrada.</Text>
                <TouchableOpacity style={styles.btnVoltar} onPress={() => router.back()}>
                    <Text style={styles.btnVoltarText}>Voltar para Lista</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const idCurto = os.id.substring(os.id.length - 6).toUpperCase();
    const totalGeral = os.sinal + os.saldo;

    return (
        <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.btnHeaderBack} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#2C2520" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>OS #{idCurto}</Text>
                    <Text style={styles.headerSubtitle}>Criada em {formatarDataCompleta(os.createdAt)}</Text>
                </View>
                <StatusBadge status={os.status} />
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8C6239" />
                }
            >
                {/* ─── CLIENTE CARD ──────────────────────────────────────────────── */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Cliente</Text>
                    <View style={styles.clienteInfoContainer}>
                        <View style={styles.clienteAvatar}>
                            <Text style={styles.clienteAvatarText}>
                                {os.clienteNome.substring(0, 2).toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.clienteTexts}>
                            <Text style={styles.clienteNome}>{os.clienteNome}</Text>
                            <Text style={styles.clienteWhatsapp}>{os.clienteTelefone}</Text>
                        </View>
                    </View>
                    <View style={styles.clienteActions}>
                        <TouchableOpacity style={styles.btnWhatsApp} onPress={handleWhatsApp}>
                            <Ionicons name="logo-whatsapp" size={18} color="#FAF9F6" />
                            <Text style={styles.btnWhatsAppText}>WhatsApp</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnLigar} onPress={handleLigar}>
                            <Ionicons name="call-outline" size={18} color="#8C6239" />
                            <Text style={styles.btnLigarText}>Ligar</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ─── ITENS DA OS ───────────────────────────────────────────────── */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Itens e Serviços</Text>
                    {os.itens.map((item, index) => (
                        <View key={item.id} style={[styles.itemBox, index > 0 && styles.itemBoxBorder]}>
                            <Text style={styles.itemIndexLabel}>Item #{index + 1}</Text>
                            <Text style={styles.itemDescricao}>{item.descricao}</Text>

                            <Text style={styles.servicosTitle}>Serviços Requeridos:</Text>
                            {item.servicos.map((serv) => (
                                <View key={serv.id} style={styles.servicoRow}>
                                    <Text style={styles.servicoDesc}>• {serv.descricao}</Text>
                                    <Text style={styles.servicoValor}>R$ {serv.valor.toFixed(2)}</Text>
                                </View>
                            ))}

                            {/* Fotos Entrada */}
                            {item.fotosEntrada && item.fotosEntrada.length > 0 && (
                                <View style={styles.photoSection}>
                                    <Text style={styles.photoTitle}>Fotos de Entrada (Estado Inicial):</Text>
                                    <View style={styles.photosGrid}>
                                        {item.fotosEntrada.map((uri, idx) => (
                                            <Image
                                                key={idx}
                                                source={{ uri }}
                                                style={styles.photoThumb}
                                            />
                                        ))}
                                    </View>
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* ─── OBSERVAÇÃO ────────────────────────────────────────────────── */}
                {os.observacao ? (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Observações</Text>
                        <Text style={styles.observacaoText}>{os.observacao}</Text>
                    </View>
                ) : null}

                {/* ─── RESUMO FINANCEIRO ─────────────────────────────────────────── */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Resumo Financeiro</Text>
                    <View style={styles.financeRow}>
                        <Text style={styles.financeLabel}>Total dos Serviços</Text>
                        <Text style={styles.financeValor}>R$ {totalGeral.toFixed(2)}</Text>
                    </View>
                    <View style={styles.financeRow}>
                        <Text style={styles.financeLabel}>Sinal Pago (Entrada)</Text>
                        <Text style={[styles.financeValor, { color: '#2E7D32' }]}>
                            - R$ {os.sinal.toFixed(2)} ({os.formaPagamentoSinal.toUpperCase()})
                        </Text>
                    </View>
                    <View style={[styles.financeRow, styles.totalFinanceRow]}>
                        <Text style={styles.totalFinanceLabel}>Saldo na Retirada</Text>
                        <Text style={styles.totalFinanceValor}>R$ {os.saldo.toFixed(2)}</Text>
                    </View>
                    {os.status === 'entregue' && (os as any).formaPagamentoSaldo && (
                        <View style={styles.pgtoSaldoInfo}>
                            <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
                            <Text style={styles.pgtoSaldoText}>
                                Saldo pago via {((os as any).formaPagamentoSaldo as string).toUpperCase()} na retirada
                            </Text>
                        </View>
                    )}
                </View>

                {/* ─── AÇÕES DE STATUS / FLUXO DE TRABALHO ────────────────────────── */}
                <View style={styles.actionsCard}>
                    <Text style={styles.actionsTitle}>Ações de Produção</Text>

                    {os.status === 'aguardando' && (
                        <TouchableOpacity
                            style={[styles.btnActionPrimary, { backgroundColor: '#8C6239' }]}
                            onPress={() => handleMudarStatus('em_conserto')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="hammer-outline" size={20} color="#FAF9F6" />
                            <Text style={styles.btnActionText}>Iniciar Conserto</Text>
                        </TouchableOpacity>
                    )}

                    {os.status === 'em_conserto' && (
                        <TouchableOpacity
                            style={[styles.btnActionPrimary, { backgroundColor: '#2E7D32' }]}
                            onPress={() => handleMudarStatus('pronto')}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="checkmark-done-circle-outline" size={20} color="#FAF9F6" />
                            <Text style={styles.btnActionText}>Marcar como Pronto</Text>
                        </TouchableOpacity>
                    )}

                    {os.status !== 'entregue' && (
                        <TouchableOpacity
                            style={[styles.btnActionDeliver, os.status !== 'pronto' && styles.btnActionDeliverWarn]}
                            onPress={handleEntregarOS}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="gift-outline" size={20} color="#FAF9F6" />
                            <Text style={styles.btnActionText}>Registrar Retirada (Entrega)</Text>
                        </TouchableOpacity>
                    )}

                    {os.status === 'entregue' && (
                        <TouchableOpacity
                            style={styles.btnActionReimprimir}
                            onPress={handleReimprimirComprovante}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="print-outline" size={20} color="#8C6239" />
                            <Text style={styles.btnActionReimprimirText}>Reimprimir Comprovante de Retirada</Text>
                        </TouchableOpacity>
                    )}
                </View>

            </ScrollView>

            {/* ─── MODAL SELEÇÃO DE PAGAMENTO SALDO ───────────────────────────── */}
            <Modal
                visible={showPagamentoModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowPagamentoModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Recebimento de Saldo</Text>
                        <Text style={styles.modalSubtitle}>
                            Para entregar o calçado, registre o recebimento do saldo de:
                        </Text>
                        <Text style={styles.modalValorDestaque}>R$ {os.saldo.toFixed(2)}</Text>

                        <Text style={styles.labelForma}>Forma de Pagamento:</Text>
                        <View style={styles.formaRow}>
                            <TouchableOpacity
                                style={[
                                    styles.formaChip,
                                    formaPagamentoSaldoSel === 'dinheiro' && styles.formaChipActive
                                ]}
                                onPress={() => setFormaPagamentoSaldoSel('dinheiro')}
                            >
                                <Ionicons
                                    name="cash-outline"
                                    size={16}
                                    color={formaPagamentoSaldoSel === 'dinheiro' ? '#FAF9F6' : '#7A7067'}
                                />
                                <Text
                                    style={[
                                        styles.formaText,
                                        formaPagamentoSaldoSel === 'dinheiro' && styles.formaTextActive
                                    ]}
                                >
                                    Dinheiro
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.formaChip,
                                    formaPagamentoSaldoSel === 'pix' && styles.formaChipActive
                                ]}
                                onPress={() => setFormaPagamentoSaldoSel('pix')}
                            >
                                <Ionicons
                                    name="qr-code-outline"
                                    size={16}
                                    color={formaPagamentoSaldoSel === 'pix' ? '#FAF9F6' : '#7A7067'}
                                />
                                <Text
                                    style={[
                                        styles.formaText,
                                        formaPagamentoSaldoSel === 'pix' && styles.formaTextActive
                                    ]}
                                >
                                    PIX
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.formaChip,
                                    formaPagamentoSaldoSel === 'cartao' && styles.formaChipActive
                                ]}
                                onPress={() => setFormaPagamentoSaldoSel('cartao')}
                            >
                                <Ionicons
                                    name="card-outline"
                                    size={16}
                                    color={formaPagamentoSaldoSel === 'cartao' ? '#FAF9F6' : '#7A7067'}
                                />
                                <Text
                                    style={[
                                        styles.formaText,
                                        formaPagamentoSaldoSel === 'cartao' && styles.formaTextActive
                                    ]}
                                >
                                    Cartão
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.btnModalCancel}
                                onPress={() => setShowPagamentoModal(false)}
                                disabled={processandoEntrega}
                            >
                                <Text style={styles.btnModalCancelText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.btnModalConfirm}
                                onPress={confirmarEntregaComSaldo}
                                disabled={processandoEntrega}
                            >
                                {processandoEntrega ? (
                                    <ActivityIndicator size="small" color="#FAF9F6" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark" size={18} color="#FAF9F6" />
                                        <Text style={styles.btnModalConfirmText}>Confirmar Recebimento</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── MODAL SELEÇÃO DE IMPRESSORA ────────────────────────────── */}
            <ModalImpressora
                visible={showModalImpressora}
                macSalvo={undefined}
                onClose={() => {
                    setShowModalImpressora(false);
                    carregarOS();
                }}
                onSelectDevice={async (device) => {
                    await salvarMacImpressora(device.address);
                    setShowModalImpressora(false);
                    const pgtoSaldo = os.status === 'entregue' ? ((os as any).formaPagamentoSaldo || 'pix') : formaPagamentoSaldoSel;
                    await executarImpressaoRetirada(device.address, pgtoSaldo);
                }}
            />

            {/* Overlay de impressão */}
            {imprimindo && (
                <View style={styles.printingOverlay}>
                    <View style={styles.printingBox}>
                        <ActivityIndicator size="large" color="#8C6239" />
                        <Text style={styles.printingText}>Imprimindo comprovante de quitação...</Text>
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
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
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
    errorContainer: {
        flex: 1,
        backgroundColor: '#FAF9F6',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    errorText: {
        fontSize: 16,
        color: '#7A7067',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 24,
    },
    btnVoltar: {
        backgroundColor: '#8C6239',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    btnVoltarText: {
        color: '#FAF9F6',
        fontWeight: 'bold',
        fontSize: 14,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0EBE5',
        backgroundColor: '#FFFFFF',
    },
    btnHeaderBack: {
        padding: 4,
        marginRight: 10,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C2520',
    },
    headerSubtitle: {
        fontSize: 11,
        color: '#9A8E85',
        marginTop: 2,
    },

    // Card Layout
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#8C6239',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Cliente Details
    clienteInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    clienteAvatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#F5F2EB',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },
    clienteAvatarText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#8C6239',
    },
    clienteTexts: {
        flex: 1,
    },
    clienteNome: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2C2520',
    },
    clienteWhatsapp: {
        fontSize: 13,
        color: '#7A7067',
        marginTop: 2,
    },
    clienteActions: {
        flexDirection: 'row',
        gap: 10,
    },
    btnWhatsApp: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#25D366',
        borderRadius: 8,
        paddingVertical: 10,
        gap: 6,
    },
    btnWhatsAppText: {
        color: '#FAF9F6',
        fontWeight: 'bold',
        fontSize: 13,
    },
    btnLigar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#8C6239',
        gap: 6,
    },
    btnLigarText: {
        color: '#8C6239',
        fontWeight: 'bold',
        fontSize: 13,
    },

    // Item OS Details
    itemBox: {
        paddingVertical: 12,
    },
    itemBoxBorder: {
        borderTopWidth: 1,
        borderTopColor: '#FAF9F6',
        marginTop: 10,
    },
    itemIndexLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#9A8E85',
        textTransform: 'uppercase',
    },
    itemDescricao: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#2C2520',
        marginTop: 4,
        marginBottom: 8,
    },
    servicosTitle: {
        fontSize: 12,
        color: '#7A7067',
        fontWeight: '600',
        marginBottom: 6,
    },
    servicoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        paddingLeft: 8,
    },
    servicoDesc: {
        fontSize: 13,
        color: '#2C2520',
    },
    servicoValor: {
        fontSize: 13,
        fontWeight: '600',
        color: '#7A7067',
    },
    photoSection: {
        marginTop: 12,
    },
    photoTitle: {
        fontSize: 12,
        color: '#7A7067',
        fontWeight: '600',
        marginBottom: 8,
    },
    photosGrid: {
        flexDirection: 'row',
        gap: 10,
    },
    photoThumb: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#F5F2EB',
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },

    // Obs text
    observacaoText: {
        fontSize: 14,
        color: '#2C2520',
        lineHeight: 20,
    },

    // Finance rows
    financeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    financeLabel: {
        fontSize: 13,
        color: '#7A7067',
    },
    financeValor: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2C2520',
    },
    totalFinanceRow: {
        borderTopWidth: 1,
        borderTopColor: '#F0EBE5',
        paddingTop: 8,
        marginTop: 8,
    },
    totalFinanceLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2C2520',
    },
    totalFinanceValor: {
        fontSize: 16,
        fontWeight: '800',
        color: '#8C6239',
    },
    pgtoSaldoInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#E8F5E9',
        borderRadius: 8,
        padding: 10,
        marginTop: 12,
    },
    pgtoSaldoText: {
        fontSize: 12,
        color: '#2E7D32',
        fontWeight: '600',
    },

    // Actions Card
    actionsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },
    actionsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2C2520',
        marginBottom: 12,
    },
    btnActionPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 10,
        paddingVertical: 13,
        marginBottom: 10,
    },
    btnActionDeliver: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#2E7D32',
        borderRadius: 10,
        paddingVertical: 13,
    },
    btnActionDeliverWarn: {
        backgroundColor: '#B85C14', // Warning color if trying to deliver directly without finishing
    },
    btnActionText: {
        color: '#FAF9F6',
        fontWeight: 'bold',
        fontSize: 14,
    },
    btnActionReimprimir: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 10,
        paddingVertical: 13,
        borderWidth: 1.5,
        borderColor: '#8C6239',
        backgroundColor: '#FFFFFF',
    },
    btnActionReimprimirText: {
        color: '#8C6239',
        fontWeight: 'bold',
        fontSize: 14,
    },

    // Modal Sheet selector
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(44, 37, 32, 0.45)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#E2DCD5',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C2520',
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#7A7067',
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 12,
    },
    modalValorDestaque: {
        fontSize: 28,
        fontWeight: '900',
        color: '#8C6239',
        textAlign: 'center',
        marginBottom: 20,
    },
    labelForma: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#2C2520',
        marginBottom: 10,
    },
    formaRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 24,
    },
    formaChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E2DCD5',
        backgroundColor: '#FFFFFF',
        gap: 6,
    },
    formaChipActive: {
        backgroundColor: '#8C6239',
        borderColor: '#8C6239',
    },
    formaText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#7A7067',
    },
    formaTextActive: {
        color: '#FAF9F6',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    btnModalCancel: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        paddingVertical: 13,
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },
    btnModalCancelText: {
        color: '#7A7067',
        fontWeight: 'bold',
        fontSize: 14,
    },
    btnModalConfirm: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2E7D32',
        borderRadius: 10,
        paddingVertical: 13,
        gap: 6,
    },
    btnModalConfirmText: {
        color: '#FAF9F6',
        fontWeight: 'bold',
        fontSize: 14,
    },

    // Print Overlay
    printingOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(44, 37, 32, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
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