import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getOrdensByClienteId } from '../services/ordemServicoService';
import { Cliente, OrdemServico } from '../types';
import StatusBadge from './StatusBadge';
import { formatarTelefone } from '../utils/format';

function formatarReal(valor: number): string {
    if (!valor || isNaN(valor)) return 'R$ 0,00';
    const [inteiro, decimal] = valor.toFixed(2).split('.');
    const formatadoInteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `R$ ${formatadoInteiro},${decimal}`;
}

function formatarData(ts: any): string {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface ModalClienteHistoricoProps {
    visible: boolean;
    cliente: Cliente | null;
    onClose: () => void;
    onNavigateToOS: (osId: string) => void;
}

export default function ModalClienteHistorico({
    visible,
    cliente,
    onClose,
    onNavigateToOS,
}: ModalClienteHistoricoProps) {
    const [historico, setHistorico] = useState<OrdemServico[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && cliente) {
            carregarHistorico(cliente.id);
        }
    }, [visible, cliente]);

    const carregarHistorico = async (clienteId: string) => {
        setHistorico([]);
        setLoading(true);
        try {
            const ordens = await getOrdensByClienteId(clienteId);
            setHistorico(ordens);
        } catch (e) {
            console.error('Erro ao buscar histórico:', e);
            Alert.alert('Erro', 'Não foi possível carregar o histórico do cliente.');
        } finally {
            setLoading(false);
        }
    };

    const renderOSCard = ({ item }: { item: OrdemServico }) => {
        const total = item.sinal + item.saldo;
        return (
            <TouchableOpacity
                style={styles.osCard}
                onPress={() => {
                    onClose();
                    onNavigateToOS(item.id);
                }}
                activeOpacity={0.7}
            >
                <View style={styles.osCardHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.osCardData}>{formatarData(item.createdAt)}</Text>
                        <Text style={styles.osCardItens} numberOfLines={1}>
                            {item.itens.length} {item.itens.length === 1 ? 'item' : 'itens'} —{' '}
                            {item.itens.map(i => i.descricao).join(', ')}
                        </Text>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
                <View style={styles.osCardFooter}>
                    <Text style={styles.osCardTotal}>
                        Total:{' '}
                        <Text style={styles.osCardTotalVal}>{formatarReal(total)}</Text>
                    </Text>
                    <Ionicons name="chevron-forward-outline" size={14} color="#9A8E85" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                <View style={[styles.sheet, styles.sheetTall]}>
                    {/* Handle */}
                    <View style={styles.handle} />

                    {/* Cabeçalho com avatar */}
                    <View style={styles.header}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {cliente?.nome.trim().charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.nome} numberOfLines={1}>{cliente?.nome}</Text>
                            <View style={styles.whatsappRow}>
                                <Ionicons name="logo-whatsapp" size={13} color="#25D366" style={{ marginRight: 4 }} />
                                <Text style={styles.telefone}>
                                    {formatarTelefone(cliente?.whatsapp || '')}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color="#7A7067" />
                        </TouchableOpacity>
                    </View>

                    {/* Separador */}
                    <View style={styles.separator} />

                    {/* Subtítulo */}
                    <View style={styles.subtitleRow}>
                        <Ionicons name="time-outline" size={16} color="#8C6239" style={{ marginRight: 6 }} />
                        <Text style={styles.subtitle}>Histórico de Ordens de Serviço</Text>
                    </View>

                    {/* Lista de OS */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#8C6239" />
                            <Text style={styles.loadingText}>Buscando histórico...</Text>
                        </View>
                    ) : historico.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={44} color="#E2DCD5" />
                            <Text style={styles.emptyTitle}>Nenhuma OS encontrada</Text>
                            <Text style={styles.emptySub}>
                                Este cliente ainda não possui ordens de serviço vinculadas.
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={historico}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                            renderItem={renderOSCard}
                        />
                    )}
                </View>
            </View>
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
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    sheetTall: {
        maxHeight: '88%',
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
        paddingHorizontal: 20,
        paddingVertical: 14,
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3EDE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#8C6239',
    },
    nome: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2C2520',
        marginBottom: 3,
    },
    whatsappRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    telefone: {
        fontSize: 13,
        color: '#7A7067',
    },
    closeBtn: {
        padding: 4,
    },
    separator: {
        height: 1,
        backgroundColor: '#F0EBE5',
        marginHorizontal: 20,
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#8C6239',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        color: '#7A7067',
        fontSize: 14,
        marginTop: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#2C2520',
        marginTop: 14,
        marginBottom: 6,
    },
    emptySub: {
        fontSize: 12,
        color: '#9A8E85',
        textAlign: 'center',
        lineHeight: 18,
    },
    osCard: {
        backgroundColor: '#FAF9F6',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        padding: 12,
        marginBottom: 10,
    },
    osCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    osCardData: {
        fontSize: 11,
        color: '#9A8E85',
        marginBottom: 2,
    },
    osCardItens: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2C2520',
    },
    osCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    osCardTotal: {
        fontSize: 12,
        color: '#9A8E85',
    },
    osCardTotalVal: {
        color: '#8C6239',
        fontWeight: 'bold',
    },
});
