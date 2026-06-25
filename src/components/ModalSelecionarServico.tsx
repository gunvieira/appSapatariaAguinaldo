import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addServicoCatalogo } from '../services/catalogoService';
import { CatalogoServico, Servico } from '../types';
import { formatarReal } from '../utils/format';

interface ModalSelecionarServicoProps {
    visible: boolean;
    onClose: () => void;
    catalogo: CatalogoServico[];
    onSelectServicoItem: (servicoCatalogo: CatalogoServico) => void;
    onSelectServicoManual: (descricao: string, valor: number) => void;
    onAddCatalogoSuccess: (novoServico: CatalogoServico) => void;
}

export default function ModalSelecionarServico({
    visible,
    onClose,
    catalogo,
    onSelectServicoItem,
    onSelectServicoManual,
    onAddCatalogoSuccess,
}: ModalSelecionarServicoProps) {
    const [loading, setLoading] = useState(false);
    const [showNovoServicoForm, setShowNovoServicoForm] = useState(false);

    // Form para criar serviço no catálogo
    const [novoServicoDescricao, setNovoServicoDescricao] = useState('');
    const [novoServicoValor, setNovoServicoValor] = useState('');

    // Form para serviço avulso/manual
    const [servicoManualDescricao, setServicoManualDescricao] = useState('');
    const [servicoManualValor, setServicoManualValor] = useState('');

    const handleCriarServicoCatalogo = async () => {
        if (!novoServicoDescricao.trim() || !novoServicoValor.trim()) {
            Alert.alert('Aviso', 'Preencha a descrição e o preço do serviço.');
            return;
        }

        const valorNum = parseFloat(novoServicoValor.replace(',', '.'));
        if (isNaN(valorNum) || valorNum <= 0) {
            Alert.alert('Aviso', 'Digite um valor numérico válido.');
            return;
        }

        try {
            setLoading(true);
            const novoServico = await addServicoCatalogo(novoServicoDescricao.trim(), valorNum);
            
            setNovoServicoDescricao('');
            setNovoServicoValor('');
            setShowNovoServicoForm(false);
            onAddCatalogoSuccess(novoServico);
            Alert.alert('Sucesso', 'Serviço adicionado ao catálogo!');
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível adicionar o serviço ao catálogo.');
        } finally {
            setLoading(false);
        }
    };

    const handleAdicionarServicoManual = () => {
        if (!servicoManualDescricao.trim() || !servicoManualValor.trim()) {
            Alert.alert('Aviso', 'Preencha a descrição e valor do serviço manual.');
            return;
        }

        const valorNum = parseFloat(servicoManualValor.replace(',', '.'));
        if (isNaN(valorNum) || valorNum <= 0) {
            Alert.alert('Aviso', 'Digite um valor numérico válido.');
            return;
        }

        onSelectServicoManual(servicoManualDescricao.trim(), valorNum);
        setServicoManualDescricao('');
        setServicoManualValor('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => {
                onClose();
                setShowNovoServicoForm(false);
            }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { height: 550, maxHeight: '85%', width: '90%' }]}>
                        <View style={styles.modalBoxHeader}>
                            <Text style={styles.modalTitle}>Selecionar Serviço</Text>
                            <TouchableOpacity onPress={() => {
                                onClose();
                                setShowNovoServicoForm(false);
                            }} disabled={loading}>
                                <Ionicons name="close-outline" size={26} color="#2C2520" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                            
                            {/* FORM DE CRIAR SERVIÇO NO CATÁLOGO */}
                            {!showNovoServicoForm ? (
                                <TouchableOpacity 
                                    style={styles.btnToggleNewService}
                                    onPress={() => setShowNovoServicoForm(true)}
                                    activeOpacity={0.7}
                                    disabled={loading}
                                >
                                    <Ionicons name="add" size={18} color="#8C6239" />
                                    <Text style={styles.btnToggleNewServiceText}>Novo Serviço</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.newServiceForm}>
                                    <Text style={styles.newServiceFormTitle}>Adicionar ao Catálogo Geral</Text>
                                    
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="Nome do conserto (ex: Meia Sola Borracha)"
                                        placeholderTextColor="#9A8E85"
                                        value={novoServicoDescricao}
                                        onChangeText={setNovoServicoDescricao}
                                        editable={!loading}
                                    />
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="Valor padrão (ex: 45.00)"
                                        placeholderTextColor="#9A8E85"
                                        keyboardType="numeric"
                                        value={novoServicoValor}
                                        onChangeText={setNovoServicoValor}
                                        editable={!loading}
                                    />

                                    <View style={styles.rowBetween}>
                                        <TouchableOpacity 
                                            style={[styles.smallBtn, { backgroundColor: '#FAF9F6', borderWidth: 1, borderColor: '#E2DCD5' }]}
                                            onPress={() => setShowNovoServicoForm(false)}
                                            disabled={loading}
                                        >
                                            <Text style={[styles.smallBtnText, { color: '#7A7067' }]}>Voltar</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.smallBtn, { backgroundColor: '#8C6239' }]}
                                            onPress={handleCriarServicoCatalogo}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <ActivityIndicator size="small" color="#FAF9F6" />
                                            ) : (
                                                <Text style={[styles.smallBtnText, { color: '#FAF9F6' }]}>Salvar Catálogo</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* LISTA DO CATÁLOGO EXISTENTE */}
                            <Text style={styles.modalSubLabel}>Catálogo de Serviços Disponíveis</Text>
                            {catalogo.length > 0 ? (
                                catalogo.filter(c => c.ativo).map((c) => (
                                    <TouchableOpacity 
                                        key={c.id} 
                                        style={styles.catalogoItemRow}
                                        onPress={() => {
                                            onSelectServicoItem(c);
                                            onClose();
                                        }}
                                        disabled={loading}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.catalogoItemDesc}>{c.descricao}</Text>
                                            <Text style={styles.catalogoItemPrice}>{formatarReal(c.valorPadrao)}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward-outline" size={16} color="#9A8E85" />
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={styles.noDataText}>O catálogo de serviços está vazio.</Text>
                            )}

                            <View style={styles.modalDivider} />

                            {/* SERVIÇO MANUAL (NÃO VAI PRO CATÁLOGO) */}
                            <Text style={styles.modalSubLabel}>Serviço Sob Medida (Avulso para esta OS)</Text>
                            <View style={styles.newServiceForm}>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Descrição (ex: Ajuste especial na fivela)"
                                    placeholderTextColor="#9A8E85"
                                    value={servicoManualDescricao}
                                    onChangeText={setServicoManualDescricao}
                                    editable={!loading}
                                />
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Preço R$ (ex: 20.00)"
                                    placeholderTextColor="#9A8E85"
                                    keyboardType="numeric"
                                    value={servicoManualValor}
                                    onChangeText={setServicoManualValor}
                                    editable={!loading}
                                />
                                <TouchableOpacity 
                                    style={styles.btnAdicionarManual}
                                    onPress={handleAdicionarServicoManual}
                                    activeOpacity={0.8}
                                    disabled={loading}
                                >
                                    <Text style={styles.btnAdicionarManualText}>Adicionar Serviço Sob Medida</Text>
                                </TouchableOpacity>
                            </View>

                        </ScrollView>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(44, 37, 32, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        width: '85%',
        borderWidth: 1,
        borderColor: '#E2DCD5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 5,
    },
    modalBoxHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E2DCD5',
        paddingBottom: 10,
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#8C6239',
    },
    modalInput: {
        backgroundColor: '#FAF9F6',
        borderRadius: 6,
        height: 44,
        paddingHorizontal: 12,
        color: '#2C2520',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        marginVertical: 8,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    smallBtn: {
        flex: 1,
        height: 38,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 4,
        marginTop: 5,
    },
    smallBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    btnToggleNewService: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#8C6239',
        borderRadius: 6,
        paddingVertical: 10,
        marginBottom: 15,
        backgroundColor: '#FAF2EB',
    },
    btnToggleNewServiceText: {
        color: '#8C6239',
        fontSize: 13,
        fontWeight: 'bold',
        marginLeft: 6,
    },
    newServiceForm: {
        backgroundColor: '#FAF9F6',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        marginBottom: 15,
    },
    newServiceFormTitle: {
        color: '#2C2520',
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    modalSubLabel: {
        fontSize: 12,
        color: '#8C6239',
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 5,
    },
    catalogoItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#FAF9F6',
    },
    catalogoItemDesc: {
        fontSize: 14,
        color: '#2C2520',
        fontWeight: '500',
    },
    catalogoItemPrice: {
        fontSize: 12,
        color: '#8C6239',
        fontWeight: 'bold',
        marginTop: 2,
    },
    noDataText: {
        fontSize: 13,
        color: '#9A8E85',
        fontStyle: 'italic',
        textAlign: 'center',
        marginVertical: 10,
    },
    modalDivider: {
        height: 1,
        backgroundColor: '#E2DCD5',
        marginVertical: 15,
    },
    btnAdicionarManual: {
        backgroundColor: '#8C6239',
        borderRadius: 6,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    btnAdicionarManualText: {
        color: '#FAF9F6',
        fontSize: 13,
        fontWeight: 'bold',
    },
});
