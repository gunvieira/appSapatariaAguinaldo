import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
    getDadosCaixaDoDia,
    fecharCaixa,
    getHistoricoFechamentos,
    DadosCaixaDoDia,
} from '../../src/config/firebaseServices';
import { FechamentoCaixa } from '../../src/types';
import ModalImpressora from '../../src/components/ModalImpressora';
import {
    getMacImpressora,
    salvarMacImpressora,
    limparMacImpressora,
    imprimirReciboFechamento,
} from '../../src/services/printerService';

// ─── Auxiliares ───────────────────────────────────────────────────────────────
function formatarDataCompleta(timestamp: any): string {
    if (!timestamp) return '';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${diasSemana[date.getDay()]}, ${date.getDate()} ${meses[date.getMonth()]}. ${date.getFullYear()}`;
    } catch {
        return '';
    }
}

function formatarHoraFechamento(timestamp: any): string {
    if (!timestamp) return '';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

function getDataHojeFormatada(): string {
    const hoje = new Date();
    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${diasSemana[hoje.getDay()]}, ${hoje.getDate()} de ${meses[hoje.getMonth()]}`;
}

// ─── Componente de Card de Forma de Pagamento ─────────────────────────────────
interface MetodoPagCardProps {
    icone: string;
    label: string;
    valor: number;
    corFundo: string;
    corIcone: string;
    corTexto: string;
}

function MetodoPagCard({ icone, label, valor, corFundo, corIcone, corTexto }: MetodoPagCardProps) {
    return (
        <View style={[styles.metodoPagCard, { backgroundColor: corFundo }]}>
            <View style={[styles.metodoPagIconWrapper, { backgroundColor: corIcone + '22' }]}>
                <Ionicons name={icone as any} size={18} color={corIcone} />
            </View>
            <Text style={[styles.metodoPagLabel, { color: corTexto }]}>{label}</Text>
            <Text style={[styles.metodoPagValor, { color: corIcone }]}>
                R$ {valor.toFixed(2)}
            </Text>
        </View>
    );
}

// ─── Componente de Card de Fechamento Histórico ───────────────────────────────
interface FechamentoCardProps {
    fechamento: FechamentoCaixa;
}

function FechamentoCard({ fechamento }: FechamentoCardProps) {
    const dataFormatada = formatarDataCompleta(fechamento.data);
    const hora = formatarHoraFechamento(fechamento.data);

    return (
        <View style={styles.fechamentoCard}>
            {/* Cabeçalho do card */}
            <View style={styles.fechamentoCardHeader}>
                <View style={styles.fechamentoDataWrapper}>
                    <Ionicons name="calendar-outline" size={14} color="#8C6239" />
                    <Text style={styles.fechamentoData}>{dataFormatada}</Text>
                </View>
                <Text style={styles.fechamentoHora}>{hora}</Text>
            </View>

            {/* Total em destaque */}
            <Text style={styles.fechamentoTotal}>R$ {fechamento.totalGeral.toFixed(2)}</Text>

            {/* Breakdown por forma de pagamento */}
            <View style={styles.fechamentoBreakdown}>
                {fechamento.totalDinheiro > 0 && (
                    <View style={styles.fechamentoBreakdownItem}>
                        <View style={[styles.fechamentoBreakdownDot, { backgroundColor: '#2E7D32' }]} />
                        <Text style={styles.fechamentoBreakdownText}>
                            Dinheiro: <Text style={styles.fechamentoBreakdownValor}>R$ {fechamento.totalDinheiro.toFixed(2)}</Text>
                        </Text>
                    </View>
                )}
                {fechamento.totalPix > 0 && (
                    <View style={styles.fechamentoBreakdownItem}>
                        <View style={[styles.fechamentoBreakdownDot, { backgroundColor: '#1565C0' }]} />
                        <Text style={styles.fechamentoBreakdownText}>
                            PIX: <Text style={styles.fechamentoBreakdownValor}>R$ {fechamento.totalPix.toFixed(2)}</Text>
                        </Text>
                    </View>
                )}
                {fechamento.totalCartao > 0 && (
                    <View style={styles.fechamentoBreakdownItem}>
                        <View style={[styles.fechamentoBreakdownDot, { backgroundColor: '#8D6E1A' }]} />
                        <Text style={styles.fechamentoBreakdownText}>
                            Cartão: <Text style={styles.fechamentoBreakdownValor}>R$ {fechamento.totalCartao.toFixed(2)}</Text>
                        </Text>
                    </View>
                )}
            </View>

            {/* Rodapé com contadores */}
            <View style={styles.fechamentoFooter}>
                <View style={styles.fechamentoChip}>
                    <Ionicons name="document-text-outline" size={11} color="#7A7067" />
                    <Text style={styles.fechamentoChipText}>{fechamento.quantidadeOS} OS</Text>
                </View>
                <View style={styles.fechamentoChip}>
                    <Ionicons name="cart-outline" size={11} color="#7A7067" />
                    <Text style={styles.fechamentoChipText}>{fechamento.quantidadeVendas} vendas</Text>
                </View>
            </View>
        </View>
    );
}

// ─── Tela Principal ───────────────────────────────────────────────────────────
export default function Caixa() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fechando, setFechando] = useState(false);
    const [dadosDia, setDadosDia] = useState<DadosCaixaDoDia>({
        totalDinheiro: 0,
        totalPix: 0,
        totalCartao: 0,
        totalGeral: 0,
        quantidadeOS: 0,
        quantidadeVendas: 0,
    });
    const [historico, setHistorico] = useState<FechamentoCaixa[]>([]);
    const [macImpressora, setMacImpressora] = useState<string | null>(null);
    const [showModalImpressora, setShowModalImpressora] = useState(false);
    const [pendingFechamentoPrint, setPendingFechamentoPrint] = useState<any | null>(null);
    const [imprimindo, setImprimindo] = useState(false);

    // ─── Carregar Dados ───────────────────────────────────────────────────────
    const carregarDados = async () => {
        try {
            const [dados, hist, mac] = await Promise.all([
                getDadosCaixaDoDia(),
                getHistoricoFechamentos(30),
                getMacImpressora(),
            ]);
            setDadosDia(dados);
            setHistorico(hist);
            setMacImpressora(mac);
        } catch (error) {
            console.error('Erro ao carregar dados do caixa:', error);
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

    // ─── Fechar Caixa ──────────────────────────────────────────────────────────
    const handleFecharCaixa = () => {
        if (dadosDia.totalGeral <= 0) {
            Alert.alert(
                'Caixa Vazio',
                'Não há movimento registrado hoje para fechar o caixa.'
            );
            return;
        }

        Alert.alert(
            'Fechar Caixa do Dia',
            `Confirmar o fechamento com os seguintes totais?\n\n` +
            `💰 Total Geral: R$ ${dadosDia.totalGeral.toFixed(2)}\n` +
            `💵 Dinheiro:    R$ ${dadosDia.totalDinheiro.toFixed(2)}\n` +
            `📱 PIX:         R$ ${dadosDia.totalPix.toFixed(2)}\n` +
            `💳 Cartão:      R$ ${dadosDia.totalCartao.toFixed(2)}\n\n` +
            `📋 ${dadosDia.quantidadeOS} OS  •  🛒 ${dadosDia.quantidadeVendas} vendas diretas`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar Fechamento',
                    style: 'default',
                    onPress: confirmarFechamento,
                },
            ]
        );
    };

    const confirmarFechamento = async () => {
        try {
            setFechando(true);
            const fechamentoData = {
                totalDinheiro: dadosDia.totalDinheiro,
                totalPix: dadosDia.totalPix,
                totalCartao: dadosDia.totalCartao,
                totalGeral: dadosDia.totalGeral,
                quantidadeOS: dadosDia.quantidadeOS,
                quantidadeVendas: dadosDia.quantidadeVendas,
            };
            await fecharCaixa(fechamentoData);

            const printObj = {
                ...fechamentoData,
                data: new Date()
            };
            setPendingFechamentoPrint(printObj);

            Alert.alert(
                '✅ Caixa Fechado!',
                `Fechamento registrado com sucesso.\nTotal: R$ ${dadosDia.totalGeral.toFixed(2)}\n\nDeseja imprimir o comprovante?`,
                [
                    { 
                        text: 'Não', 
                        style: 'cancel',
                        onPress: () => {
                            setPendingFechamentoPrint(null);
                        }
                    },
                    {
                        text: '🖨️ Imprimir',
                        onPress: async () => {
                            const mac = await getMacImpressora();
                            if (!mac) {
                                setShowModalImpressora(true);
                            } else {
                                await executarImpressaoFechamento(mac, printObj);
                            }
                        }
                    }
                ]
            );

            await carregarDados();
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível registrar o fechamento de caixa.');
        } finally {
            setFechando(false);
        }
    };

    const executarImpressaoFechamento = async (mac: string, dados: any) => {
        let sucesso = false;
        try {
            setImprimindo(true);
            sucesso = await imprimirReciboFechamento(mac, dados);
        } finally {
            setImprimindo(false);
        }

        if (sucesso) {
            setPendingFechamentoPrint(null);
        } else {
            Alert.alert(
                'Falha na Impressão',
                'Não foi possível conectar com a impressora.\nDeseja remover este dispositivo como padrão e escolher outro?',
                [
                    { 
                        text: 'Apenas Cancelar', 
                        style: 'cancel',
                        onPress: () => {
                            setPendingFechamentoPrint(null);
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

    // ─── Loading Inicial ───────────────────────────────────────────────────────
    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8C6239" />
                <Text style={styles.loadingText}>Carregando dados do caixa...</Text>
            </SafeAreaView>
        );
    }

    const caixaVazio = dadosDia.totalGeral <= 0;

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8C6239" />
                }
            >

                {/* ─── CARD TOTAL DO DIA ──────────────────────────────────────── */}
                <View style={styles.totalCard}>
                    <View style={styles.totalCardTopRow}>
                        <View>
                            <Text style={styles.totalCardLabel}>Movimento do Dia</Text>
                            <Text style={styles.totalCardDate}>{getDataHojeFormatada()}</Text>
                        </View>
                        <View style={styles.totalCardIconWrapper}>
                            <Ionicons name="wallet" size={24} color="#FAF9F6" />
                        </View>
                    </View>

                    <Text style={styles.totalCardValor}>
                        R$ {dadosDia.totalGeral.toFixed(2)}
                    </Text>

                    {caixaVazio && (
                        <Text style={styles.totalCardEmpty}>
                            Nenhum pagamento registrado hoje
                        </Text>
                    )}
                </View>

                {/* ─── GRADE DE FORMAS DE PAGAMENTO ───────────────────────────── */}
                <View style={styles.metodosGrid}>
                    <MetodoPagCard
                        icone="cash-outline"
                        label="Dinheiro"
                        valor={dadosDia.totalDinheiro}
                        corFundo="#F0FDF4"
                        corIcone="#2E7D32"
                        corTexto="#2C2520"
                    />
                    <MetodoPagCard
                        icone="qr-code-outline"
                        label="PIX"
                        valor={dadosDia.totalPix}
                        corFundo="#EFF6FF"
                        corIcone="#1565C0"
                        corTexto="#2C2520"
                    />
                    <MetodoPagCard
                        icone="card-outline"
                        label="Cartão"
                        valor={dadosDia.totalCartao}
                        corFundo="#FFFBEB"
                        corIcone="#8D6E1A"
                        corTexto="#2C2520"
                    />
                </View>

                {/* ─── CHIPS OPERACIONAIS ─────────────────────────────────────── */}
                <View style={styles.operRow}>
                    <View style={styles.operChip}>
                        <Ionicons name="document-text-outline" size={15} color="#8C6239" />
                        <Text style={styles.operChipText}>
                            <Text style={styles.operChipNumber}>{dadosDia.quantidadeOS}</Text>
                            {' '}OS com pagamento
                        </Text>
                    </View>
                    <View style={styles.operChip}>
                        <Ionicons name="cart-outline" size={15} color="#8C6239" />
                        <Text style={styles.operChipText}>
                            <Text style={styles.operChipNumber}>{dadosDia.quantidadeVendas}</Text>
                            {' '}vendas diretas
                        </Text>
                    </View>
                </View>

                {/* ─── BOTÃO FECHAR CAIXA ─────────────────────────────────────── */}
                <TouchableOpacity
                    style={[
                        styles.btnFecharCaixa,
                        caixaVazio && styles.btnFecharCaixaDisabled
                    ]}
                    onPress={handleFecharCaixa}
                    activeOpacity={caixaVazio ? 1 : 0.8}
                    disabled={fechando}
                >
                    {fechando ? (
                        <ActivityIndicator size="small" color="#8C6239" />
                    ) : (
                        <>
                            <Ionicons
                                name="lock-closed-outline"
                                size={20}
                                color={caixaVazio ? '#C4B8B0' : '#8C6239'}
                            />
                            <Text style={[
                                styles.btnFecharCaixaText,
                                caixaVazio && styles.btnFecharCaixaTextDisabled
                            ]}>
                                Fechar Caixa do Dia
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* ─── CONFIGURAÇÃO DE IMPRESSORA ─────────────────────────────── */}
                <TouchableOpacity
                    style={styles.btnConfigImpressora}
                    onPress={() => setShowModalImpressora(true)}
                    activeOpacity={0.8}
                >
                    <View style={styles.btnConfigImpressoraLeft}>
                        <Ionicons name="print-outline" size={18} color="#8C6239" />
                        <Text style={styles.btnConfigImpressoraText} numberOfLines={1}>
                            {macImpressora ? `Impressora: ${macImpressora}` : 'Configurar Impressora'}
                        </Text>
                    </View>
                    {macImpressora ? (
                        <TouchableOpacity
                            onPress={async () => {
                                Alert.alert(
                                    'Remover Impressora',
                                    'Deseja desconectar a impressora salva?',
                                    [
                                        { text: 'Cancelar', style: 'cancel' },
                                        {
                                            text: 'Desconectar',
                                            style: 'destructive',
                                            onPress: async () => {
                                                await limparMacImpressora();
                                                setMacImpressora(null);
                                            }
                                        }
                                    ]
                                );
                            }}
                            style={styles.btnClearImpressora}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="trash-outline" size={16} color="#D32F2F" />
                        </TouchableOpacity>
                    ) : (
                        <Ionicons name="chevron-forward" size={16} color="#9A8E85" />
                    )}
                </TouchableOpacity>

                {/* ─── DIVISOR ────────────────────────────────────────────────── */}
                <View style={styles.sectionDivider}>
                    <View style={styles.sectionDividerLine} />
                    <Text style={styles.sectionDividerLabel}>FECHAMENTOS ANTERIORES</Text>
                    <View style={styles.sectionDividerLine} />
                </View>

                {/* ─── HISTÓRICO DE FECHAMENTOS ────────────────────────────────── */}
                {historico.length > 0 ? (
                    <View style={styles.historicoWrapper}>
                        {historico.map((fech) => (
                            <FechamentoCard key={fech.id} fechamento={fech} />
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyHistorico}>
                        <Ionicons name="time-outline" size={44} color="#E2DCD5" />
                        <Text style={styles.emptyHistoricoTitle}>Sem Histórico</Text>
                        <Text style={styles.emptyHistoricoSubtitle}>
                            Os fechamentos de caixa realizados aparecerão aqui.
                        </Text>
                    </View>
                )}

            </ScrollView>

            <ModalImpressora
                visible={showModalImpressora}
                macSalvo={macImpressora || undefined}
                onClose={() => {
                    setShowModalImpressora(false);
                    setPendingFechamentoPrint(null);
                }}
                onSelectDevice={async (device) => {
                    await salvarMacImpressora(device.address);
                    setMacImpressora(device.address);
                    setShowModalImpressora(false);
                    if (pendingFechamentoPrint) {
                        await executarImpressaoFechamento(device.address, pendingFechamentoPrint);
                    } else {
                        Alert.alert('Sucesso', 'Impressora configurada com sucesso!');
                    }
                }}
            />

            {/* Overlay de impressão */}
            {imprimindo && (
                <View style={styles.printingOverlay}>
                    <View style={styles.printingBox}>
                        <ActivityIndicator size="large" color="#8C6239" />
                        <Text style={styles.printingText}>Imprimindo fechamento...</Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
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

    // ─── Card Total do Dia ──────────────────────────────────────────────────
    totalCard: {
        backgroundColor: '#8C6239',
        borderRadius: 16,
        padding: 20,
        marginBottom: 14,
        shadowColor: '#8C6239',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
        elevation: 6,
    },
    totalCardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    totalCardLabel: {
        fontSize: 13,
        color: 'rgba(250,249,246,0.75)',
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    totalCardDate: {
        fontSize: 12,
        color: 'rgba(250,249,246,0.55)',
        marginTop: 3,
    },
    totalCardIconWrapper: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(250,249,246,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    totalCardValor: {
        fontSize: 38,
        fontWeight: '800',
        color: '#FAF9F6',
        letterSpacing: -1,
    },
    totalCardEmpty: {
        fontSize: 12,
        color: 'rgba(250,249,246,0.55)',
        marginTop: 6,
        fontStyle: 'italic',
    },

    // ─── Grade de Métodos de Pagamento ──────────────────────────────────────
    metodosGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 14,
    },
    metodoPagCard: {
        flex: 1,
        borderRadius: 12,
        padding: 12,
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },
    metodoPagIconWrapper: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    metodoPagLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#7A7067',
        marginBottom: 4,
    },
    metodoPagValor: {
        fontSize: 14,
        fontWeight: '800',
    },

    // ─── Chips Operacionais ──────────────────────────────────────────────────
    operRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 18,
    },
    operChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        gap: 7,
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    operChipText: {
        fontSize: 12,
        color: '#7A7067',
        flexShrink: 1,
    },
    operChipNumber: {
        fontWeight: '800',
        color: '#2C2520',
        fontSize: 13,
    },

    // ─── Botão Fechar Caixa ──────────────────────────────────────────────────
    btnFecharCaixa: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.8,
        borderColor: '#8C6239',
        borderRadius: 12,
        paddingVertical: 14,
        gap: 10,
        marginBottom: 28,
        shadowColor: '#8C6239',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.10,
        shadowRadius: 4,
        elevation: 2,
    },
    btnFecharCaixaDisabled: {
        borderColor: '#E2DCD5',
        shadowOpacity: 0,
        elevation: 0,
    },
    btnFecharCaixaText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#8C6239',
        letterSpacing: 0.3,
    },
    btnFecharCaixaTextDisabled: {
        color: '#C4B8B0',
    },
    btnConfigImpressora: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginTop: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },
    btnConfigImpressoraLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    btnConfigImpressoraText: {
        fontSize: 14,
        color: '#2C2520',
        fontWeight: '600',
    },
    btnClearImpressora: {
        padding: 4,
    },

    // ─── Divisor de Seção ────────────────────────────────────────────────────
    sectionDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    sectionDividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2DCD5',
    },
    sectionDividerLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9A8E85',
        letterSpacing: 0.8,
    },

    // ─── Histórico ───────────────────────────────────────────────────────────
    historicoWrapper: {
        gap: 10,
    },
    fechamentoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    fechamentoCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    fechamentoDataWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    fechamentoData: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2C2520',
    },
    fechamentoHora: {
        fontSize: 12,
        color: '#9A8E85',
        backgroundColor: '#F5F2EB',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 5,
    },
    fechamentoTotal: {
        fontSize: 24,
        fontWeight: '800',
        color: '#8C6239',
        letterSpacing: -0.5,
        marginBottom: 10,
    },
    fechamentoBreakdown: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    fechamentoBreakdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    fechamentoBreakdownDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    fechamentoBreakdownText: {
        fontSize: 12,
        color: '#7A7067',
    },
    fechamentoBreakdownValor: {
        fontWeight: '700',
        color: '#2C2520',
    },
    fechamentoFooter: {
        flexDirection: 'row',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#F0EBE5',
        paddingTop: 10,
    },
    fechamentoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FAF9F6',
        borderRadius: 6,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },
    fechamentoChipText: {
        fontSize: 11,
        color: '#7A7067',
        fontWeight: '500',
    },

    // ─── Histórico Vazio ─────────────────────────────────────────────────────
    emptyHistorico: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 24,
    },
    emptyHistoricoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2C2520',
        marginTop: 14,
        marginBottom: 6,
    },
    emptyHistoricoSubtitle: {
        fontSize: 13,
        color: '#9A8E85',
        textAlign: 'center',
        lineHeight: 19,
    },
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