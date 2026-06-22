import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {getDashboardMetrics } from'../../src/services/dashboardService';
import {getRecentOS} from '../../src/services/ordemServicoService';
import { DashboardMetrics } from '../../src/types';
import { OrdemServico } from '../../src/types';
import MetricCard from '../../src/components/MetricCard';
import OSItemCard from '../../src/components/OSItemCard';
import { formatarReal } from '../../src/utils/format';

export default function Dashboard() {
    const router = useRouter();

    // ─── Estados ─────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        faturamentoHoje: 0,
        osAguardando: 0,
        osEmConserto: 0,
        osPronto: 0,
    });
    const [recentOS, setRecentOS] = useState<OrdemServico[]>([]);

    // ─── Carregar Dados ──────────────────────────────────────────────────────
    const carregarDados = async () => {
        try {
            const [novasMetricas, listaOSRecentes] = await Promise.all([
                getDashboardMetrics(),
                getRecentOS(4),
            ]);
            setMetrics(novasMetricas);
            setRecentOS(listaOSRecentes);
        } catch (error) {
            console.error('Erro ao carregar dados do Dashboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            carregarDados();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        carregarDados();
    };

    // ─── Auxiliares de Formatação ────────────────────────────────────────────
    const formatarDataHoje = () => {
        const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        
        const hoje = new Date();
        const diaSemana = diasSemana[hoje.getDay()];
        const dia = hoje.getDate();
        const mes = meses[hoje.getMonth()];
        
        return `${diaSemana}, ${dia} de ${mes}`;
    };

    // ─── Renderização de Elementos Visuais ───────────────────────────────────
    const renderDistribuiOS = () => {
        const total = metrics.osAguardando + metrics.osEmConserto + metrics.osPronto;
        if (total === 0) {
            return (
                <View style={styles.statusBarWrapper}>
                    <View style={[styles.statusBarSegment, { flex: 1, backgroundColor: '#E2DCD5' }]} />
                </View>
            );
        }

        const pctAguardando = (metrics.osAguardando / total) * 100;
        const pctEmConserto = (metrics.osEmConserto / total) * 100;
        const pctPronto = (metrics.osPronto / total) * 100;

        return (
            <View style={styles.statusBarWrapper}>
                {metrics.osAguardando > 0 && (
                    <View style={[styles.statusBarSegment, { flex: pctAguardando, backgroundColor: '#8D6E1A' }]} />
                )}
                {metrics.osEmConserto > 0 && (
                    <View style={[styles.statusBarSegment, { flex: pctEmConserto, backgroundColor: '#B85C14' }]} />
                )}
                {metrics.osPronto > 0 && (
                    <View style={[styles.statusBarSegment, { flex: pctPronto, backgroundColor: '#2E7D32' }]} />
                )}
            </View>
        );
    };



    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8C6239" />
                <Text style={styles.loadingText}>Carregando painel principal...</Text>
            </SafeAreaView>
        );
    }

    const totalAtivas = metrics.osAguardando + metrics.osEmConserto;

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <ScrollView 
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8C6239" />
                }
            >
                {/* ─── CABEÇALHO ────────────────────────────────────────────────── */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.welcomeText}>Olá, Aguinaldo</Text>
                        <Text style={styles.dateText}>{formatarDataHoje()}</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.btnSync} 
                        onPress={() => {
                            setLoading(true);
                            carregarDados();
                        }}
                    >
                        <Ionicons name="sync-outline" size={20} color="#8C6239" />
                    </TouchableOpacity>
                </View>

                {/* ─── CARD FINANCEIRO DIÁRIO ───────────────────────────────────── */}
                <MetricCard 
                    title="Caixa de Hoje"
                    value={formatarReal(metrics.faturamentoHoje)}
                    subtitle="Sinais de novas OS + vendas rápidas de balcão"
                    iconName="cash-outline"
                    isHighlight={true}
                    onPress={() => router.push('/(tabs)/caixa')}
                />

                {/* ─── GRADE DE METRICAS OPERACIONAIS ───────────────────────────── */}
                <View style={styles.metricsRow}>
                    <View style={{ flex: 1, marginRight: 6 }}>
                        <MetricCard 
                            title="OS em Execução"
                            value={totalAtivas}
                            subtitle={`${metrics.osAguardando} aguardam | ${metrics.osEmConserto} conserto`}
                            iconName="construct-outline"
                            style={{ flex: 1 }}
                            onPress={() => router.push('/(tabs)/ordens?status=em_conserto')}
                        />
                    </View>
                    <View style={{ flex: 1, marginLeft: 6 }}>
                        <MetricCard 
                            title="Retirada Pendente"
                            value={metrics.osPronto}
                            subtitle="Aguardando retirada do cliente"
                            iconName="checkmark-circle-outline"
                            style={{ flex: 1 }}
                            onPress={() => router.push('/(tabs)/ordens?status=pronto')}
                        />
                    </View>
                </View>

                {/* ─── DISTRIBUIÇÃO DAS ORDENS ATIVAS ────────────────────────────── */}
                {(metrics.osAguardando + metrics.osEmConserto + metrics.osPronto) > 0 && (
                    <View style={styles.distribOSCard}>
                        <Text style={styles.distribTitle}>Produção da Sapataria</Text>
                        {renderDistribuiOS()}
                        <View style={styles.legendContainer}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#8D6E1A' }]} />
                                <Text style={styles.legendText}>Aguardando ({metrics.osAguardando})</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#B85C14' }]} />
                                <Text style={styles.legendText}>Conserto ({metrics.osEmConserto})</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#2E7D32' }]} />
                                <Text style={styles.legendText}>Pronto ({metrics.osPronto})</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* ─── AÇÕES RÁPIDAS ────────────────────────────────────────────── */}
                <Text style={styles.sectionTitle}>Ações Rápidas</Text>
                <View style={styles.quickActionsContainer}>
                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => router.push('/os/nova')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.actionIconWrapper}>
                            <Ionicons name="add-circle-outline" size={24} color="#8C6239" />
                        </View>
                        <Text style={styles.actionButtonText}>Nova OS</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => router.push('/(tabs)/vendas')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.actionIconWrapper}>
                            <Ionicons name="cart-outline" size={24} color="#8C6239" />
                        </View>
                        <Text style={styles.actionButtonText}>Venda Direta</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => router.push('/(tabs)/caixa')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.actionIconWrapper}>
                            <Ionicons name="wallet-outline" size={24} color="#8C6239" />
                        </View>
                        <Text style={styles.actionButtonText}>Caixa</Text>
                    </TouchableOpacity>
                </View>

                {/* ─── ORDENS RECENTES ─────────────────────────────────────────── */}
                <Text style={styles.sectionTitle}>Serviços Recentes</Text>
                {recentOS.length > 0 ? (
                    <View style={styles.recentOSWrapper}>
                        {recentOS.map((os) => (
                            <OSItemCard 
                                key={os.id} 
                                os={os} 
                                onPress={() => router.push(`/os/${os.id}`)}
                            />
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyRecentOS}>
                        <Ionicons name="document-text-outline" size={38} color="#9A8E85" />
                        <Text style={styles.emptyText}>Nenhuma ordem cadastrada ainda.</Text>
                        <TouchableOpacity 
                            style={styles.emptyBtn}
                            onPress={() => router.push('/os/nova')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.emptyBtnText}>Criar Primeira OS</Text>
                        </TouchableOpacity>
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FAF9F6', // Off-white quente
    },
    container: {
        flex: 1,
        backgroundColor: '#FAF9F6',
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 30,
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

    // ─── Cabeçalho ───────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2C2520', // Café escuro
    },
    dateText: {
        fontSize: 13,
        color: '#7A7067', // Café claro/cinza quente
        marginTop: 3,
    },
    btnSync: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2DCD5',
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },

    // ─── Grade Operacional ───────────────────────────────────────────────────
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        marginBottom: 16,
    },

    // ─── Distribuição OS ─────────────────────────────────────────────────────
    distribOSCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    distribTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#2C2520',
        marginBottom: 12,
        letterSpacing: 0.3,
    },
    statusBarWrapper: {
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FAF9F6',
        flexDirection: 'row',
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },
    statusBarSegment: {
        height: '100%',
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    legendText: {
        fontSize: 10,
        color: '#7A7067',
        fontWeight: '500',
    },

    // ─── Ações Rápidas ───────────────────────────────────────────────────────
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#8C6239', // Destaque Cognac
        marginTop: 10,
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    quickActionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    actionIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F5F2EB',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#2C2520',
    },

    // ─── Serviços Recentes ───────────────────────────────────────────────────
    recentOSWrapper: {
        marginBottom: 10,
    },
    emptyRecentOS: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },
    emptyText: {
        color: '#9A8E85',
        fontSize: 13,
        marginVertical: 10,
        fontStyle: 'italic',
    },
    emptyBtn: {
        backgroundColor: '#8C6239',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        marginTop: 4,
    },
    emptyBtnText: {
        color: '#FAF9F6',
        fontSize: 13,
        fontWeight: 'bold',
    },
});