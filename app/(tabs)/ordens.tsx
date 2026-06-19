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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getOrdens } from '../../src/services/ordemServicoService';
import { OrdemServico, StatusOS } from '../../src/types';
import OSItemCard from '../../src/components/OSItemCard';

type FiltroStatus = 'todos' | StatusOS;

export default function ListaOrdens() {
    const router = useRouter();

    // ─── Estados ─────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [ordens, setOrdens] = useState<OrdemServico[]>([]);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<FiltroStatus>('todos');

    // ─── Carregar Dados ──────────────────────────────────────────────────────
    const carregarDados = async () => {
        try {
            const listaOrdens = await getOrdens();
            setOrdens(listaOrdens);
        } catch (error) {
            console.error('Erro ao buscar ordens de serviço:', error);
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

    // ─── Lógica de Filtro e Busca ──────────────────────────────────────────
    const getOrdensFiltradas = () => {
        return ordens.filter((os) => {
            // Filtro por Status
            const matchStatus = statusFilter === 'todos' || os.status === statusFilter;

            // Filtro por Texto (Nome do cliente ou ID da OS)
            const text = searchText.trim().toLowerCase();
            const matchText = 
                !text || 
                os.clienteNome.toLowerCase().includes(text) || 
                os.id.toLowerCase().includes(text) ||
                (os.clienteTelefone && os.clienteTelefone.includes(text));

            return matchStatus && matchText;
        });
    };

    // Contador de ordens por status para exibir nos Chips
    const getCountStatus = (status: FiltroStatus) => {
        if (status === 'todos') return ordens.length;
        return ordens.filter(os => os.status === status).length;
    };

    // ─── Renderização dos Chips de Filtro ────────────────────────────────────
    const renderFiltroChip = (status: FiltroStatus, label: string) => {
        const isActive = statusFilter === status;
        const count = getCountStatus(status);

        return (
            <TouchableOpacity
                key={status}
                style={[
                    styles.chip,
                    isActive ? styles.chipActive : styles.chipInactive
                ]}
                onPress={() => setStatusFilter(status)}
                activeOpacity={0.7}
            >
                <Text style={[
                    styles.chipText,
                    isActive ? styles.chipTextActive : styles.chipTextInactive
                ]}>
                    {label} ({count})
                </Text>
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8C6239" />
                <Text style={styles.loadingText}>Carregando ordens de serviço...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
            <View style={styles.container}>
                
                {/* BARRA DE PESQUISA */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputWrapper}>
                        <Ionicons name="search-outline" size={20} color="#9A8E85" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar por cliente ou código..."
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

                {/* FILTROS (CHIPS ROLÁVEIS HORIZONTALMENTE) */}
                <View style={styles.chipsContainer}>
                    <FlatList
                        data={[
                            { status: 'todos' as const, label: 'Todas' },
                            { status: 'aguardando' as const, label: 'Aguardando' },
                            { status: 'em_conserto' as const, label: 'Em Conserto' },
                            { status: 'pronto' as const, label: 'Prontas' },
                            { status: 'entregue' as const, label: 'Entregues' }
                        ]}
                        keyExtractor={(item) => item.status}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.chipsScrollContent}
                        renderItem={({ item }) => renderFiltroChip(item.status, item.label)}
                    />
                </View>

                {/* LISTAGEM DE ORDENS */}
                <FlatList
                    data={getOrdensFiltradas()}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8C6239" />
                    }
                    renderItem={({ item }) => (
                        <OSItemCard 
                            os={item}
                            onPress={() => router.push(`/os/${item.id}`)}
                        />
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={48} color="#E2DCD5" />
                            <Text style={styles.emptyTitle}>Nenhuma Ordem Encontrada</Text>
                            <Text style={styles.emptySubtitle}>
                                {searchText.trim().length > 0 
                                    ? 'Experimente alterar o termo digitado ou os filtros selecionados.' 
                                    : 'Ainda não há nenhuma ordem cadastrada nesta categoria.'}
                            </Text>
                            {searchText.trim().length === 0 && statusFilter === 'todos' && (
                                <TouchableOpacity 
                                    style={styles.btnEmptyCreate}
                                    onPress={() => router.push('/os/nova')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.btnEmptyCreateText}>Criar Nova OS</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />

                {/* BOTÃO FLUTUANTE (FAB) */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => router.push('/os/nova')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={28} color="#FAF9F6" />
                </TouchableOpacity>

            </View>
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
    
    // ─── Pesquisa ────────────────────────────────────────────────────────────
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

    // ─── Chips de Filtro ─────────────────────────────────────────────────────
    chipsContainer: {
        backgroundColor: '#FAF9F6',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E2DCD5',
    },
    chipsScrollContent: {
        paddingHorizontal: 16,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chipInactive: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },
    chipActive: {
        backgroundColor: '#8C6239', // Couro Cognac
    },
    chipText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    chipTextInactive: {
        color: '#7A7067',
    },
    chipTextActive: {
        color: '#FAF9F6',
    },

    // ─── Lista ───────────────────────────────────────────────────────────────
    listContent: {
        padding: 16,
        paddingBottom: 85, // Espaço extra para o FAB não cobrir os cards
    },
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
        marginTop: 15,
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
        paddingHorizontal: 20,
        borderRadius: 6,
        marginTop: 18,
    },
    btnEmptyCreateText: {
        color: '#FAF9F6',
        fontSize: 13,
        fontWeight: 'bold',
    },

    // ─── Botão Flutuante (FAB) ────────────────────────────────────────────────
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#8C6239', // Couro Cognac
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#8C6239',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
});