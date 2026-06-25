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
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
    getClientes,
    deleteCliente,
} from '../../src/services/clienteService';
import { Cliente } from '../../src/types';
import { reloadSignal } from '../../src/utils/reloadSignal';
import ClienteListItem from '../../src/components/ClienteListItem';
import ModalClienteForm from '../../src/components/ModalClienteForm';
import ModalClienteHistorico from '../../src/components/ModalClienteHistorico';

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

    // ── Modal Histórico ────────────────────────────────────────────────────────
    const [modalHistoricoVisible, setModalHistoricoVisible] = useState(false);
    const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

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
            if (reloadSignal.clientes) {
                carregarDados();
                reloadSignal.clientes = false;
            }
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
        setModalFormVisible(true);
    };

    const abrirModalEditar = (cliente: Cliente) => {
        setClienteEditando(cliente);
        setModalFormVisible(true);
    };

    // ── Callback ao salvar ─────────────────────────────────────────────────────
    const handleSaveSuccess = (cliente: Cliente, isEdit: boolean) => {
        if (isEdit) {
            setClientes((prev) =>
                prev.map((c) => (c.id === cliente.id ? cliente : c))
            );
        } else {
            setClientes((prev) =>
                [...prev, cliente].sort((a, b) => a.nome.localeCompare(b.nome))
            );
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
    const abrirHistorico = (cliente: Cliente) => {
        setClienteSelecionado(cliente);
        setModalHistoricoVisible(true);
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
                    renderItem={({ item }) => (
                        <ClienteListItem
                            cliente={item}
                            onPress={() => abrirHistorico(item)}
                            onEdit={() => abrirModalEditar(item)}
                            onDelete={() => confirmarExclusao(item)}
                        />
                    )}
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

            {/* ─── MODAL: FORMULÁRIO (ADICIONAR / EDITAR) ─────────────────────── */}
            <ModalClienteForm
                visible={modalFormVisible}
                clienteEditando={clienteEditando}
                onClose={() => setModalFormVisible(false)}
                onSaveSuccess={handleSaveSuccess}
            />

            {/* ─── MODAL: HISTÓRICO DO CLIENTE ─────────────────────────────────── */}
            <ModalClienteHistorico
                visible={modalHistoricoVisible}
                cliente={clienteSelecionado}
                onClose={() => setModalHistoricoVisible(false)}
                onNavigateToOS={(osId) => router.push(`/os/${osId}`)}
            />
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
});
