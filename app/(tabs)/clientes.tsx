import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Modal,
    Alert,
    ScrollView,
    Platform,
    Pressable,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
    getClientes,
    addCliente,
    updateCliente,
    deleteCliente,
} from '../../src/services/clienteService';
import { getOrdensByClienteId } from '../../src/services/ordemServicoService';
import { Cliente, OrdemServico } from '../../src/types';
import {
    formatarTelefone,
    aplicarMascaraTelefone,
    limparMascaraTelefone,
} from '../../src/utils/format';
import StatusBadge from '../../src/components/StatusBadge';

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ClientesScreen() {
    const router = useRouter();

    // ── Estados gerais ────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [searchText, setSearchText] = useState('');

    // ── Modal Adicionar/Editar ─────────────────────────────────────────────────
    const [modalFormVisible, setModalFormVisible] = useState(false);
    const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
    const [formNome, setFormNome] = useState('');
    const [formWhatsapp, setFormWhatsapp] = useState('');
    const [salvando, setSalvando] = useState(false);

    // ── Modal Histórico ────────────────────────────────────────────────────────
    const [modalHistoricoVisible, setModalHistoricoVisible] = useState(false);
    const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
    const [historico, setHistorico] = useState<OrdemServico[]>([]);
    const [loadingHistorico, setLoadingHistorico] = useState(false);

    // ── Carregar dados ─────────────────────────────────────────────────────────
    const carregarDados = async () => {
        try {
            const lista = await getClientes();
            setClientes(lista);
        } catch (e) {
            console.error('Erro ao buscar clientes:', e);
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

    // ── Filtrar lista ──────────────────────────────────────────────────────────
    const clientesFiltrados = clientes.filter((c) => {
        const text = searchText.trim().toLowerCase();
        if (!text) return true;
        return (
            c.nome.toLowerCase().includes(text) ||
            c.whatsapp.replace(/\D/g, '').includes(text.replace(/\D/g, ''))
        );
    });

    // ── Abrir modal formulário ─────────────────────────────────────────────────
    const abrirModalNovo = () => {
        setClienteEditando(null);
        setFormNome('');
        setFormWhatsapp('');
        setModalFormVisible(true);
    };

    const abrirModalEditar = (cliente: Cliente) => {
        setClienteEditando(cliente);
        setFormNome(cliente.nome);
        setFormWhatsapp(formatarTelefone(cliente.whatsapp));
        setModalFormVisible(true);
    };

    // ── Salvar cliente ─────────────────────────────────────────────────────────
    const salvarCliente = async () => {
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
                await updateCliente(clienteEditando.id, {
                    nome: nomeTrimmed,
                    whatsapp: wppDigitos,
                });
                setClientes((prev) =>
                    prev.map((c) =>
                        c.id === clienteEditando.id
                            ? { ...c, nome: nomeTrimmed, whatsapp: wppDigitos }
                            : c
                    )
                );
            } else {
                const novo = await addCliente(nomeTrimmed, wppDigitos);
                setClientes((prev) => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
            }
            setModalFormVisible(false);
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível salvar o cliente. Tente novamente.');
        } finally {
            setSalvando(false);
        }
    };

    // ── Excluir cliente ────────────────────────────────────────────────────────
    const confirmarExclusao = (cliente: Cliente) => {
        Alert.alert(
            'Excluir Cliente',
            `Tem certeza que deseja excluir "${cliente.nome}"?\n\nAs ordens de serviço vinculadas não serão removidas.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCliente(cliente.id);
                            setClientes((prev) => prev.filter((c) => c.id !== cliente.id));
                        } catch (e) {
                            Alert.alert('Erro', 'Não foi possível excluir o cliente.');
                        }
                    },
                },
            ]
        );
    };

    // ── Abrir histórico ────────────────────────────────────────────────────────
    const abrirHistorico = async (cliente: Cliente) => {
        setClienteSelecionado(cliente);
        setHistorico([]);
        setLoadingHistorico(true);
        setModalHistoricoVisible(true);
        try {
            const ordens = await getOrdensByClienteId(cliente.id);
            setHistorico(ordens);
        } catch (e) {
            console.error('Erro ao buscar histórico:', e);
        } finally {
            setLoadingHistorico(false);
        }
    };

    // ── Renderizar card do cliente ─────────────────────────────────────────────
    const renderCliente = ({ item }: { item: Cliente }) => (
        <TouchableOpacity
            style={styles.clientCard}
            activeOpacity={0.7}
            onPress={() => abrirHistorico(item)}
        >
            {/* Barra lateral cognac */}
            <View style={styles.cardAccent} />

            {/* Avatar inicial */}
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                    {item.nome.trim().charAt(0).toUpperCase()}
                </Text>
            </View>

            {/* Informações */}
            <View style={styles.cardInfo}>
                <Text style={styles.cardNome} numberOfLines={1}>{item.nome}</Text>
                <View style={styles.cardWhatsappRow}>
                    <Ionicons name="logo-whatsapp" size={13} color="#25D366" style={{ marginRight: 4 }} />
                    <Text style={styles.cardWhatsapp}>
                        {formatarTelefone(item.whatsapp) || 'Sem telefone'}
                    </Text>
                </View>
            </View>

            {/* Ações */}
            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.actionEdit]}
                    onPress={() => abrirModalEditar(item)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="create-outline" size={18} color="#8C6239" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.actionDelete]}
                    onPress={() => confirmarExclusao(item)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="trash-outline" size={18} color="#C0392B" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    // ── Renderizar card de OS no histórico ─────────────────────────────────────
    const renderOSCard = ({ item }: { item: OrdemServico }) => {
        const total = item.sinal + item.saldo;
        return (
            <TouchableOpacity
                style={styles.osCard}
                onPress={() => {
                    setModalHistoricoVisible(false);
                    router.push(`/os/${item.id}`);
                }}
                activeOpacity={0.7}
            >
                <View style={styles.osCardHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.osCardData}>{formatarData(item.createdAt)}</Text>
                        <Text style={styles.osCardItens} numberOfLines={1}>
                            {item.itens.length} {item.itens.length === 1 ? 'item' : 'itens'} — {item.itens.map(i => i.descricao).join(', ')}
                        </Text>
                    </View>
                    <StatusBadge status={item.status} />
                </View>
                <View style={styles.osCardFooter}>
                    <Text style={styles.osCardTotal}>
                        Total: <Text style={styles.osCardTotalVal}>{formatarReal(total)}</Text>
                    </Text>
                    <Ionicons name="chevron-forward-outline" size={14} color="#9A8E85" />
                </View>
            </TouchableOpacity>
        );
    };

    // ── Loading inicial ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8C6239" />
                <Text style={styles.loadingText}>Carregando clientes...</Text>
            </SafeAreaView>
        );
    }

    // ── Tela principal ─────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
            <View style={styles.container}>

                {/* BARRA DE PESQUISA */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputWrapper}>
                        <Ionicons name="search-outline" size={20} color="#9A8E85" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar por nome ou telefone..."
                            placeholderTextColor="#9A8E85"
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchText('')}>
                                <Ionicons name="close-circle" size={18} color="#9A8E85" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* CONTADOR */}
                <View style={styles.counterRow}>
                    <Text style={styles.counterText}>
                        {clientesFiltrados.length}{' '}
                        {clientesFiltrados.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
                    </Text>
                </View>

                {/* LISTA DE CLIENTES */}
                <FlatList
                    data={clientesFiltrados}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8C6239" />
                    }
                    renderItem={renderCliente}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={52} color="#E2DCD5" />
                            <Text style={styles.emptyTitle}>Nenhum Cliente Encontrado</Text>
                            <Text style={styles.emptySubtitle}>
                                {searchText.trim().length > 0
                                    ? 'Tente alterar o termo buscado.'
                                    : 'Comece adicionando seu primeiro cliente.'}
                            </Text>
                            {searchText.trim().length === 0 && (
                                <TouchableOpacity
                                    style={styles.btnEmptyCreate}
                                    onPress={abrirModalNovo}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.btnEmptyCreateText}>Adicionar Cliente</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />

                {/* FAB */}
                <TouchableOpacity style={styles.fab} onPress={abrirModalNovo} activeOpacity={0.8}>
                    <Ionicons name="person-add-outline" size={24} color="#FAF9F6" />
                </TouchableOpacity>
            </View>

            {/* ═══════════════════════════════════════════════════════════════════
                MODAL — FORMULÁRIO (ADICIONAR / EDITAR)
            ═══════════════════════════════════════════════════════════════════ */}
            <Modal
                visible={modalFormVisible}
                animationType="slide"
                transparent
                statusBarTranslucent
                onRequestClose={() => !salvando && setModalFormVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior="padding"
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={0}
                >
                    <View style={styles.modalOverlay}>
                        <Pressable style={styles.modalBackdrop} onPress={() => !salvando && setModalFormVisible(false)} />
                        <View style={styles.modalSheet}>
                            {/* Handle */}
                            <View style={styles.modalHandle} />

                            {/* Título */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {clienteEditando ? 'Editar Cliente' : 'Novo Cliente'}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => !salvando && setModalFormVisible(false)}
                                    style={styles.modalCloseBtn}
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
                            <View style={styles.modalFooter}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.modalBtnCancel]}
                                    onPress={() => setModalFormVisible(false)}
                                    disabled={salvando}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.modalBtnSave, salvando && { opacity: 0.7 }]}
                                    onPress={salvarCliente}
                                    disabled={salvando}
                                    activeOpacity={0.8}
                                >
                                    {salvando ? (
                                        <ActivityIndicator size="small" color="#FAF9F6" />
                                    ) : (
                                        <Text style={styles.modalBtnSaveText}>
                                            {clienteEditando ? 'Salvar Alterações' : 'Adicionar Cliente'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ═══════════════════════════════════════════════════════════════════
                MODAL — HISTÓRICO DO CLIENTE
            ═══════════════════════════════════════════════════════════════════ */}
            <Modal
                visible={modalHistoricoVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalHistoricoVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setModalHistoricoVisible(false)} />
                    <View style={[styles.modalSheet, styles.modalSheetTall]}>
                        {/* Handle */}
                        <View style={styles.modalHandle} />

                        {/* Cabeçalho com avatar */}
                        <View style={styles.historicoHeader}>
                            <View style={styles.historicoAvatar}>
                                <Text style={styles.historicoAvatarText}>
                                    {clienteSelecionado?.nome.trim().charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.historicoNome} numberOfLines={1}>
                                    {clienteSelecionado?.nome}
                                </Text>
                                <View style={styles.cardWhatsappRow}>
                                    <Ionicons name="logo-whatsapp" size={13} color="#25D366" style={{ marginRight: 4 }} />
                                    <Text style={styles.historicoTelefone}>
                                        {formatarTelefone(clienteSelecionado?.whatsapp || '')}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => setModalHistoricoVisible(false)}
                                style={styles.modalCloseBtn}
                            >
                                <Ionicons name="close" size={22} color="#7A7067" />
                            </TouchableOpacity>
                        </View>

                        {/* Separador */}
                        <View style={styles.separator} />

                        {/* Subtítulo */}
                        <View style={styles.historicoSubtitleRow}>
                            <Ionicons name="time-outline" size={16} color="#8C6239" style={{ marginRight: 6 }} />
                            <Text style={styles.historicoSubtitle}>
                                Histórico de Ordens de Serviço
                            </Text>
                        </View>

                        {/* Lista de OS */}
                        {loadingHistorico ? (
                            <View style={styles.historicoLoading}>
                                <ActivityIndicator size="large" color="#8C6239" />
                                <Text style={styles.loadingText}>Buscando histórico...</Text>
                            </View>
                        ) : historico.length === 0 ? (
                            <View style={styles.historicoVazio}>
                                <Ionicons name="document-text-outline" size={44} color="#E2DCD5" />
                                <Text style={styles.historicoVazioText}>Nenhuma OS encontrada</Text>
                                <Text style={styles.historicoVazioSub}>
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
        </SafeAreaView>
    );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FAF9F6',
    },
    container: {
        flex: 1,
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
        marginTop: 12,
    },

    // ── Pesquisa ────────────────────────────────────────────────────────────
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 6,
        backgroundColor: '#FAF9F6',
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: '#2C2520',
        fontSize: 14,
        padding: 0,
    },

    // ── Contador ────────────────────────────────────────────────────────────
    counterRow: {
        paddingHorizontal: 16,
        paddingBottom: 10,
        paddingTop: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#E2DCD5',
    },
    counterText: {
        fontSize: 12,
        color: '#9A8E85',
        fontWeight: '500',
    },

    // ── Lista ───────────────────────────────────────────────────────────────
    listContent: {
        padding: 16,
        paddingBottom: 90,
        gap: 10,
    },

    // ── Card do Cliente ─────────────────────────────────────────────────────
    clientCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        overflow: 'hidden',
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    cardAccent: {
        width: 4,
        alignSelf: 'stretch',
        backgroundColor: '#8C6239',
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#F3EDE7',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#8C6239',
    },
    cardInfo: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 10,
    },
    cardNome: {
        fontSize: 15,
        fontWeight: '700',
        color: '#2C2520',
        marginBottom: 3,
    },
    cardWhatsappRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardWhatsapp: {
        fontSize: 12,
        color: '#7A7067',
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 10,
        gap: 6,
    },
    actionBtn: {
        width: 34,
        height: 34,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionEdit: {
        backgroundColor: '#F3EDE7',
    },
    actionDelete: {
        backgroundColor: '#FDF2F2',
    },

    // ── Estado Vazio ─────────────────────────────────────────────────────────
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 24,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2C2520',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 13,
        color: '#9A8E85',
        textAlign: 'center',
        lineHeight: 18,
    },
    btnEmptyCreate: {
        backgroundColor: '#8C6239',
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 6,
        marginTop: 20,
    },
    btnEmptyCreateText: {
        color: '#FAF9F6',
        fontSize: 13,
        fontWeight: 'bold',
    },

    // ── FAB ─────────────────────────────────────────────────────────────────
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#8C6239',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#8C6239',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },

    // ── Modal base ───────────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(44,37,32,0.45)',
    },
    modalSheet: {
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
    modalSheetTall: {
        maxHeight: '88%',
        flex: 0,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E2DCD5',
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 6,
    },

    // ── Modal formulário ─────────────────────────────────────────────────────
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0EBE5',
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#2C2520',
    },
    modalCloseBtn: {
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
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 20,
        gap: 10,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBtnCancel: {
        backgroundColor: '#F0EBE5',
    },
    modalBtnCancelText: {
        color: '#7A7067',
        fontWeight: '600',
        fontSize: 14,
    },
    modalBtnSave: {
        backgroundColor: '#8C6239',
    },
    modalBtnSaveText: {
        color: '#FAF9F6',
        fontWeight: '700',
        fontSize: 14,
    },

    // ── Modal histórico ──────────────────────────────────────────────────────
    historicoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        gap: 12,
    },
    historicoAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3EDE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    historicoAvatarText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#8C6239',
    },
    historicoNome: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2C2520',
        marginBottom: 3,
    },
    historicoTelefone: {
        fontSize: 13,
        color: '#7A7067',
    },
    separator: {
        height: 1,
        backgroundColor: '#F0EBE5',
        marginHorizontal: 20,
    },
    historicoSubtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    historicoSubtitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#8C6239',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    historicoLoading: {
        padding: 40,
        alignItems: 'center',
    },
    historicoVazio: {
        alignItems: 'center',
        padding: 40,
    },
    historicoVazioText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#2C2520',
        marginTop: 14,
        marginBottom: 6,
    },
    historicoVazioSub: {
        fontSize: 12,
        color: '#9A8E85',
        textAlign: 'center',
        lineHeight: 18,
    },

    // ── Card de OS no histórico ──────────────────────────────────────────────
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
