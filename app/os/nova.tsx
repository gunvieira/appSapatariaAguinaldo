import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { 
    uploadFoto, 
    salvarOS 
} from '../../src/config/firebaseServices';
import {getClientes, addCliente} from '../../src/services/clienteService';
import { getCatalogo, addServicoCatalogo} from '../../src/services/catalogoService';
import { Cliente, CatalogoServico, Servico } from '../../src/types';
import ClienteCard from '../../src/components/ClienteCard';
import ItemOSFormCard from '../../src/components/ItemOSFormCard';

export default function NovaOS() {
    const router = useRouter();
    
    // ─── Estados Principais ──────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [saveProgress, setSaveProgress] = useState('');
    
    // Cliente
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
    const [searchClienteText, setSearchClienteText] = useState('');
    const [showClienteList, setShowClienteList] = useState(false);
    const [showNovoClienteModal, setShowNovoClienteModal] = useState(false);
    const [novoClienteNome, setNovoClienteNome] = useState('');
    const [novoClienteWhatsapp, setNovoClienteWhatsapp] = useState('');
    
    // Itens da OS
    const [itens, setItens] = useState<Array<{
        id: string;
        descricao: string;
        servicos: Servico[];
        fotosEntrada: string[]; // URIs locais temporárias
    }>>([]);

    // Financeiro & Gerais
    const [sinal, setSinal] = useState('');
    const [formaPagamentoSinal, setFormaPagamentoSinal] = useState<'dinheiro' | 'pix' | 'cartao'>('pix');
    const [observacao, setObservacao] = useState('');

    // Catálogo & Modal de Serviços
    const [catalogo, setCatalogo] = useState<CatalogoServico[]>([]);
    const [showServicoModal, setShowServicoModal] = useState(false);
    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
    const [showNovoServicoForm, setShowNovoServicoForm] = useState(false);
    const [novoServicoDescricao, setNovoServicoDescricao] = useState('');
    const [novoServicoValor, setNovoServicoValor] = useState('');
    const [servicoManualDescricao, setServicoManualDescricao] = useState('');
    const [servicoManualValor, setServicoManualValor] = useState('');

    // Câmera
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
    const [activePhotoTarget, setActivePhotoTarget] = useState<{ itemIndex: number; photoIndex: number } | null>(null);
    const cameraRef = useRef<CameraView>(null);

    // ─── Efeitos de Carregamento Inicial ──────────────────────────────────────
    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const [listaClientes, listaCatalogo] = await Promise.all([
                getClientes(),
                getCatalogo()
            ]);
            setClientes(listaClientes);
            setCatalogo(listaCatalogo);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível carregar os dados iniciais do banco.');
        } finally {
            setLoading(false);
        }
    };

    // ─── Gerenciamento de Clientes ───────────────────────────────────────────
    const filtrarClientes = () => {
        if (!searchClienteText.trim()) return [];
        return clientes.filter(c => 
            c.nome.toLowerCase().includes(searchClienteText.toLowerCase()) || 
            c.whatsapp.includes(searchClienteText)
        );
    };

    const handleSelectCliente = (cliente: Cliente) => {
        setSelectedCliente(cliente);
        setSearchClienteText('');
        setShowClienteList(false);
    };

    const handleCriarCliente = async () => {
        if (!novoClienteNome.trim() || !novoClienteWhatsapp.trim()) {
            Alert.alert('Aviso', 'Preencha todos os campos do cliente.');
            return;
        }
        try {
            setLoading(true);
            const novoCliente = await addCliente(novoClienteNome.trim(), novoClienteWhatsapp.trim());
            
            setClientes(prev => [novoCliente, ...prev].sort((a, b) => a.nome.localeCompare(b.nome)));
            setSelectedCliente(novoCliente);
            
            setNovoClienteNome('');
            setNovoClienteWhatsapp('');
            setShowNovoClienteModal(false);
            Alert.alert('Sucesso', 'Cliente cadastrado com sucesso!');
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível cadastrar o cliente.');
        } finally {
            setLoading(false);
        }
    };

    // ─── Gerenciamento de Itens da OS ────────────────────────────────────────
    const handleAdicionarItem = () => {
        const novoItem = {
            id: Math.random().toString(36).substring(2, 9),
            descricao: '',
            servicos: [],
            fotosEntrada: []
        };
        setItens(prev => [...prev, novoItem]);
    };

    const handleRemoverItem = (index: number) => {
        setItens(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateItemDescricao = (index: number, text: string) => {
        setItens(prev => {
            const copy = [...prev];
            copy[index].descricao = text;
            return copy;
        });
    };

    // ─── Fluxo da Câmera & Fotos ─────────────────────────────────────────────
    const handleAbrirCamera = async (itemIndex: number, photoIndex: number) => {
        if (!cameraPermission) {
            const res = await requestCameraPermission();
            if (!res.granted) {
                Alert.alert('Permissão Necessária', 'É preciso autorizar o acesso à câmera para fotografar o calçado.');
                return;
            }
        } else if (!cameraPermission.granted) {
            const res = await requestCameraPermission();
            if (!res.granted) {
                Alert.alert('Permissão Necessária', 'É preciso autorizar o acesso à câmera nas configurações do sistema.');
                return;
            }
        }
        setActivePhotoTarget({ itemIndex, photoIndex });
        setShowCameraModal(true);
    };

    const tirarFoto = async () => {
        if (cameraRef.current && activePhotoTarget) {
            try {
                setLoading(true);
                const options = { quality: 0.85, skipProcessing: false };
                const photo = await cameraRef.current.takePictureAsync(options);
                
                if (photo && photo.uri) {
                    const manipResult = await ImageManipulator.manipulateAsync(
                        photo.uri,
                        [{ resize: { width: 1000 } }],
                        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                    );

                    const { itemIndex, photoIndex } = activePhotoTarget;
                    
                    setItens(prev => {
                        const copy = [...prev];
                        const fotos = [...copy[itemIndex].fotosEntrada];
                        fotos[photoIndex] = manipResult.uri;
                        copy[itemIndex].fotosEntrada = fotos;
                        return copy;
                    });
                    
                    setShowCameraModal(false);
                    setActivePhotoTarget(null);
                }
            } catch (error) {
                Alert.alert('Erro', 'Não foi possível capturar a foto.');
            } finally {
                setLoading(false);
            }
        }
    };

    const removerFoto = (itemIndex: number, photoIndex: number) => {
        setItens(prev => {
            const copy = [...prev];
            const fotos = [...copy[itemIndex].fotosEntrada];
            fotos.splice(photoIndex, 1);
            copy[itemIndex].fotosEntrada = fotos;
            return copy;
        });
    };

    // ─── Seleção e Gerenciamento de Serviços ───────────────────────────────
    const handleAbrirServicoModal = (itemIndex: number) => {
        setActiveItemIndex(itemIndex);
        setShowServicoModal(true);
    };

    const handleAdicionarServicoItem = (servicoCatalogo: CatalogoServico) => {
        if (activeItemIndex === null) return;
        
        const novoServico: Servico = {
            id: servicoCatalogo.id,
            descricao: servicoCatalogo.descricao,
            valor: servicoCatalogo.valorPadrao
        };

        setItens(prev => {
            const copy = [...prev];
            const item = copy[activeItemIndex];
            if (!item.servicos.some(s => s.id === servicoCatalogo.id)) {
                item.servicos = [...item.servicos, novoServico];
            }
            return copy;
        });
        
        setShowServicoModal(false);
        setActiveItemIndex(null);
    };

    const handleAdicionarServicoManual = () => {
        if (activeItemIndex === null) return;
        if (!servicoManualDescricao.trim() || !servicoManualValor.trim()) {
            Alert.alert('Aviso', 'Preencha a descrição e valor do serviço manual.');
            return;
        }

        const valorNum = parseFloat(servicoManualValor.replace(',', '.'));
        if (isNaN(valorNum) || valorNum <= 0) {
            Alert.alert('Aviso', 'Digite um valor numérico válido.');
            return;
        }

        const novoServico: Servico = {
            id: `manual_${Date.now()}`,
            descricao: servicoManualDescricao.trim(),
            valor: valorNum
        };

        setItens(prev => {
            const copy = [...prev];
            copy[activeItemIndex].servicos = [...copy[activeItemIndex].servicos, novoServico];
            return copy;
        });

        setServicoManualDescricao('');
        setServicoManualValor('');
        setShowServicoModal(false);
        setActiveItemIndex(null);
    };

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
            
            setCatalogo(prev => [novoServico, ...prev].sort((a, b) => a.descricao.localeCompare(b.descricao)));
            
            setNovoServicoDescricao('');
            setNovoServicoValor('');
            setShowNovoServicoForm(false);
            Alert.alert('Sucesso', 'Serviço adicionado ao catálogo!');
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível adicionar o serviço ao catálogo.');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoverServicoItem = (itemIndex: number, servicoIndex: number) => {
        setItens(prev => {
            const copy = [...prev];
            copy[itemIndex].servicos = copy[itemIndex].servicos.filter((_, i) => i !== servicoIndex);
            return copy;
        });
    };

    // ─── Cálculos Financeiros ────────────────────────────────────────────────
    const calcularTotalOS = () => {
        return itens.reduce((sum, item) => {
            const totalItem = item.servicos.reduce((sSum, serv) => sSum + serv.valor, 0);
            return sum + totalItem;
        }, 0);
    };

    const getSaldoRestante = () => {
        const total = calcularTotalOS();
        const sinalNum = parseFloat(sinal.replace(',', '.')) || 0;
        const saldo = total - sinalNum;
        return saldo < 0 ? 0 : saldo;
    };

    // ─── Salvar no Banco ─────────────────────────────────────────────────────
    const handleSalvarOS = async () => {
        if (!selectedCliente) {
            Alert.alert('Aviso', 'Por favor, selecione ou cadastre um cliente.');
            return;
        }
        if (itens.length === 0) {
            Alert.alert('Aviso', 'Adicione pelo menos 1 item na Ordem de Serviço.');
            return;
        }

        for (let i = 0; i < itens.length; i++) {
            const item = itens[i];
            if (!item.descricao.trim()) {
                Alert.alert('Aviso', `Por favor, preencha a descrição do item ${i + 1}.`);
                return;
            }
            if (item.servicos.length === 0) {
                Alert.alert('Aviso', `Adicione pelo menos 1 serviço ao item "${item.descricao}".`);
                return;
            }
            const fotosTiradas = item.fotosEntrada.filter(uri => !!uri);
            if (fotosTiradas.length !== 2) {
                Alert.alert(
                    'Fotos Obrigatórias',
                    `É obrigatório capturar exatamente 2 fotos de entrada para o item: "${item.descricao || `Item ${i + 1}`}".`
                );
                return;
            }
        }

        try {
            setLoading(true);
            const totalItens = itens.length;
            const sinalNum = parseFloat(sinal.replace(',', '.')) || 0;
            const saldoNum = getSaldoRestante();

            const itensProntos = [];

            for (let i = 0; i < totalItens; i++) {
                const item = itens[i];
                const urlsUploaded: string[] = [];
                
                for (let j = 0; j < item.fotosEntrada.length; j++) {
                    const localUri = item.fotosEntrada[j];
                    setSaveProgress(`Enviando foto ${j + 1}/2 do item ${i + 1} de ${totalItens}...`);
                    
                    const storageUrl = await uploadFoto(localUri);
                    urlsUploaded.push(storageUrl);
                }

                itensProntos.push({
                    id: item.id,
                    descricao: item.descricao.trim(),
                    servicos: item.servicos,
                    fotosEntrada: urlsUploaded,
                    fotosSaida: []
                });
            }

            setSaveProgress('Gravando dados no banco de dados...');

            const dadosOS = {
                clienteId: selectedCliente.id,
                clienteNome: selectedCliente.nome,
                clienteTelefone: selectedCliente.whatsapp,
                status: 'aguardando' as const,
                itens: itensProntos,
                sinal: sinalNum,
                saldo: saldoNum,
                formaPagamentoSinal,
                observacao: observacao.trim()
            };

            await salvarOS(dadosOS);

            Alert.alert('Sucesso', 'Ordem de Serviço criada com sucesso!', [
                {
                    text: 'OK',
                    onPress: () => {
                        router.replace('/(tabs)/ordens');
                    }
                }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Erro ao Salvar', 'Ocorreu um erro ao realizar o upload das fotos ou ao salvar a OS.');
        } finally {
            setLoading(false);
            setSaveProgress('');
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#FAF9F6' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                
                {/* ─── SEÇÃO CLIENTE ───────────────────────────────────────────── */}
                <Text style={styles.sectionTitle}>Cliente</Text>
                {selectedCliente ? (
                    <ClienteCard 
                        nome={selectedCliente.nome}
                        whatsapp={selectedCliente.whatsapp}
                        onRemove={() => setSelectedCliente(null)}
                    />
                ) : (
                    <View style={styles.searchClienteContainer}>
                        <View style={styles.searchInputWrapper}>
                            <Ionicons name="search-outline" size={20} color="#9A8E85" style={styles.searchIcon} />
                            <TextInput
                                style={styles.inputSearchCliente}
                                placeholder="Buscar por Nome ou Telefone..."
                                placeholderTextColor="#9A8E85"
                                value={searchClienteText}
                                onChangeText={(text) => {
                                    setSearchClienteText(text);
                                    setShowClienteList(true);
                                }}
                                onFocus={() => setShowClienteList(true)}
                            />
                            {searchClienteText.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchClienteText('')}>
                                    <Ionicons name="close-circle" size={18} color="#9A8E85" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {showClienteList && filtrarClientes().length > 0 && (
                            <View style={styles.dropdownList}>
                                {filtrarClientes().map((c) => (
                                    <TouchableOpacity 
                                        key={c.id} 
                                        style={styles.dropdownItem}
                                        onPress={() => handleSelectCliente(c)}
                                    >
                                        <Text style={styles.dropdownItemName}>{c.nome}</Text>
                                        <Text style={styles.dropdownItemPhone}>{c.whatsapp}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <TouchableOpacity 
                            style={styles.btnNovoCliente}
                            onPress={() => setShowNovoClienteModal(true)}
                        >
                            <Ionicons name="person-add-outline" size={18} color="#8C6239" />
                            <Text style={styles.btnNovoClienteText}>Novo Cliente</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ─── SEÇÃO ITENS DA OS ───────────────────────────────────────── */}
                <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Calçados / Itens</Text>
                    <TouchableOpacity style={styles.btnAdicionarItem} onPress={handleAdicionarItem}>
                        <Ionicons name="add-circle-outline" size={18} color="#8C6239" />
                        <Text style={styles.btnAdicionarItemText}>Adicionar Item</Text>
                    </TouchableOpacity>
                </View>

                {itens.map((item, itemIndex) => (
                    <ItemOSFormCard 
                        key={item.id}
                        index={itemIndex}
                        descricao={item.descricao}
                        onChangeDescricao={(text) => handleUpdateItemDescricao(itemIndex, text)}
                        onRemoveItem={() => handleRemoverItem(itemIndex)}
                        fotosEntrada={item.fotosEntrada}
                        onTakePhoto={(photoIndex) => handleAbrirCamera(itemIndex, photoIndex)}
                        onRemovePhoto={(photoIndex) => removerFoto(itemIndex, photoIndex)}
                        servicos={item.servicos}
                        onAddServicoClick={() => handleAbrirServicoModal(itemIndex)}
                        onRemoveServico={(servicoIndex) => handleRemoverServicoItem(itemIndex, servicoIndex)}
                    />
                ))}

                {itens.length === 0 && (
                    <View style={styles.emptyItensWrapper}>
                        <Ionicons name="copy-outline" size={44} color="#9A8E85" />
                        <Text style={styles.emptyItensText}>Nenhum item adicionado ainda.</Text>
                        <Text style={styles.emptyItensSubText}>Clique no botão acima para adicionar um calçado.</Text>
                    </View>
                )}

                {/* ─── FINANCEIRO & DETALHES GERAIS ─────────────────────────────── */}
                <Text style={styles.sectionTitle}>Resumo e Pagamento de Sinal</Text>
                <View style={styles.financeCard}>
                    
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Valor Total:</Text>
                        <Text style={styles.totalValue}>R$ {calcularTotalOS().toFixed(2)}</Text>
                    </View>

                    <View style={styles.rowBetween}>
                        <View style={{ width: '48%' }}>
                            <Text style={styles.inputLabel}>Sinal (Entrada R$):</Text>
                            <TextInput
                                style={styles.financeInput}
                                placeholder="0,00"
                                placeholderTextColor="#9A8E85"
                                keyboardType="numeric"
                                value={sinal}
                                onChangeText={setSinal}
                            />
                        </View>
                        <View style={{ width: '48%' }}>
                            <Text style={styles.inputLabel}>Saldo Restante:</Text>
                            <View style={styles.saldoReadOnlyBox}>
                                <Text style={styles.saldoReadOnlyText}>R$ {getSaldoRestante().toFixed(2)}</Text>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.inputLabel}>Forma de Pagamento do Sinal:</Text>
                    <View style={styles.pagamentoGroup}>
                        {(['dinheiro', 'pix', 'cartao'] as const).map((forma) => (
                            <TouchableOpacity
                                key={forma}
                                style={[
                                    styles.pagamentoBtn,
                                    formaPagamentoSinal === forma && styles.pagamentoBtnActive
                                ]}
                                onPress={() => setFormaPagamentoSinal(forma)}
                            >
                                <Text style={[
                                    styles.pagamentoBtnText,
                                    formaPagamentoSinal === forma && styles.pagamentoBtnTextActive
                                ]}>
                                    {forma.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.inputLabel}>Observações Gerais:</Text>
                    <TextInput
                        style={[styles.financeInput, { height: 80, textAlignVertical: 'top' }]}
                        placeholder="Escreva alguma observação relevante sobre o serviço ou calçado..."
                        placeholderTextColor="#9A8E85"
                        multiline
                        numberOfLines={3}
                        value={observacao}
                        onChangeText={setObservacao}
                    />
                </View>

                {/* BOTÃO SALVAR */}
                <TouchableOpacity 
                    style={styles.btnSalvarOS}
                    onPress={handleSalvarOS}
                    activeOpacity={0.8}
                >
                    <Text style={styles.btnSalvarOSText}>Salvar Ordem de Serviço</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* ─── MODAL: NOVO CLIENTE ───────────────────────────────────────── */}
            <Modal
                visible={showNovoClienteModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowNovoClienteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Cadastrar Novo Cliente</Text>
                        
                        <Text style={styles.inputLabel}>Nome Completo:</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Ex: João da Silva"
                            placeholderTextColor="#9A8E85"
                            value={novoClienteNome}
                            onChangeText={setNovoClienteNome}
                        />

                        <Text style={styles.inputLabel}>WhatsApp/Telefone:</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Ex: 11999999999"
                            placeholderTextColor="#9A8E85"
                            keyboardType="phone-pad"
                            value={novoClienteWhatsapp}
                            onChangeText={setNovoClienteWhatsapp}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={[styles.modalBtn, { backgroundColor: '#FAF9F6', borderWidth: 1, borderColor: '#E2DCD5' }]}
                                onPress={() => setShowNovoClienteModal(false)}
                            >
                                <Text style={[styles.modalBtnText, { color: '#7A7067' }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalBtn, { backgroundColor: '#8C6239' }]}
                                onPress={handleCriarCliente}
                            >
                                <Text style={[styles.modalBtnText, { color: '#FAF9F6' }]}>Salvar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── MODAL: SELECIONAR / GERENCIAR SERVIÇOS ─────────────────────── */}
            <Modal
                visible={showServicoModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    setShowServicoModal(false);
                    setShowNovoServicoForm(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { height: 550, maxHeight: '85%', width: '90%' }]}>
                        <View style={styles.modalBoxHeader}>
                            <Text style={styles.modalTitle}>Selecionar Serviço</Text>
                            <TouchableOpacity onPress={() => {
                                setShowServicoModal(false);
                                setShowNovoServicoForm(false);
                            }}>
                                <Ionicons name="close-outline" size={26} color="#2C2520" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                            
                            {/* FORM DE CRIAR SERVIÇO NO CATÁLOGO */}
                            {!showNovoServicoForm ? (
                                <TouchableOpacity 
                                    style={styles.btnToggleNewService}
                                    onPress={() => setShowNovoServicoForm(true)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="add" size={18} color="#8C6239" />
                                    <Text style={styles.btnToggleNewServiceText}>Gerenciar Catálogo: Novo Serviço</Text>
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
                                    />
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="Valor padrão (ex: 45.00)"
                                        placeholderTextColor="#9A8E85"
                                        keyboardType="numeric"
                                        value={novoServicoValor}
                                        onChangeText={setNovoServicoValor}
                                    />

                                    <View style={styles.rowBetween}>
                                        <TouchableOpacity 
                                            style={[styles.smallBtn, { backgroundColor: '#FAF9F6', borderWidth: 1, borderColor: '#E2DCD5' }]}
                                            onPress={() => setShowNovoServicoForm(false)}
                                        >
                                            <Text style={[styles.smallBtnText, { color: '#7A7067' }]}>Voltar</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.smallBtn, { backgroundColor: '#8C6239' }]}
                                            onPress={handleCriarServicoCatalogo}
                                        >
                                            <Text style={[styles.smallBtnText, { color: '#FAF9F6' }]}>Salvar Catálogo</Text>
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
                                        onPress={() => handleAdicionarServicoItem(c)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.catalogoItemDesc}>{c.descricao}</Text>
                                            <Text style={styles.catalogoItemPrice}>R$ {c.valorPadrao.toFixed(2)}</Text>
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
                                />
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Preço R$ (ex: 20.00)"
                                    placeholderTextColor="#9A8E85"
                                    keyboardType="numeric"
                                    value={servicoManualValor}
                                    onChangeText={setServicoManualValor}
                                />
                                <TouchableOpacity 
                                    style={styles.btnAdicionarManual}
                                    onPress={handleAdicionarServicoManual}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.btnAdicionarManualText}>Adicionar Serviço Sob Medida</Text>
                                </TouchableOpacity>
                            </View>

                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ─── MODAL: CÂMERA EM TELA CHEIA (SEM COMPONENTES FILHOS) ────────── */}
            <Modal
                visible={showCameraModal}
                animationType="slide"
                transparent={false}
                onRequestClose={() => {
                    setShowCameraModal(false);
                    setActivePhotoTarget(null);
                }}
            >
                <View style={styles.cameraContainer}>
                    <CameraView
                        ref={cameraRef}
                        style={StyleSheet.absoluteFillObject}
                        facing={cameraFacing}
                    />
                    
                    {/* Elementos na Câmera posicionados de forma absoluta no topo e embaixo */}
                    <View style={styles.cameraOverlay}>
                        {/* Top header */}
                        <View style={styles.cameraHeader}>
                            <TouchableOpacity 
                                style={styles.cameraHeaderBtn}
                                onPress={() => {
                                    setShowCameraModal(false);
                                    setActivePhotoTarget(null);
                                }}
                            >
                                <Ionicons name="close" size={28} color="#FFFFFF" />
                            </TouchableOpacity>
                            <Text style={styles.cameraTitle}>
                                Foto {activePhotoTarget ? activePhotoTarget.photoIndex + 1 : 1}
                            </Text>
                            <TouchableOpacity 
                                style={styles.cameraHeaderBtn}
                                onPress={() => setCameraFacing(prev => prev === 'back' ? 'front' : 'back')}
                            >
                                <Ionicons name="camera-reverse-outline" size={26} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Bottom controls */}
                        <View style={styles.cameraBottomBar}>
                            <TouchableOpacity style={styles.shutterBtn} onPress={tirarFoto} activeOpacity={0.8}>
                                <View style={styles.shutterBtnInner} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── OVERLAY DE PROCESSO DE SALVAR ─────────────────────────────── */}
            {loading && saveProgress.length > 0 && (
                <View style={styles.progressOverlay}>
                    <View style={styles.progressBox}>
                        <ActivityIndicator size="large" color="#8C6239" />
                        <Text style={styles.progressText}>{saveProgress}</Text>
                    </View>
                </View>
            )}

            {/* Loading global spinner */}
            {loading && saveProgress.length === 0 && (
                <View style={styles.progressOverlay}>
                    <ActivityIndicator size="large" color="#8C6239" />
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF9F6',
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#8C6239',
        marginTop: 20,
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    inputLabel: {
        fontSize: 13,
        color: '#7A7067',
        marginBottom: 6,
        marginTop: 10,
    },
    noDataText: {
        fontSize: 13,
        color: '#9A8E85',
        fontStyle: 'italic',
        textAlign: 'center',
        marginVertical: 10,
    },

    // ─── Clientes ────────────────────────────────────────────────────────────
    searchClienteContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAF9F6',
        borderRadius: 6,
        paddingHorizontal: 10,
        height: 44,
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },
    searchIcon: {
        marginRight: 8,
    },
    inputSearchCliente: {
        flex: 1,
        color: '#2C2520',
        fontSize: 14,
        padding: 0,
    },
    dropdownList: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        marginTop: 4,
        maxHeight: 150,
        overflow: 'scroll',
    },
    dropdownItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#FAF9F6',
    },
    dropdownItemName: {
        fontSize: 14,
        color: '#2C2520',
        fontWeight: '500',
    },
    dropdownItemPhone: {
        fontSize: 12,
        color: '#7A7067',
        marginTop: 2,
    },
    btnNovoCliente: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#8C6239',
        borderStyle: 'dashed',
    },
    btnNovoClienteText: {
        color: '#8C6239',
        fontSize: 13,
        fontWeight: 'bold',
        marginLeft: 6,
    },

    // ─── Itens da OS ─────────────────────────────────────────────────────────
    btnAdicionarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    btnAdicionarItemText: {
        color: '#8C6239',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 4,
    },
    emptyItensWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 35,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        borderStyle: 'dashed',
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        marginBottom: 20,
    },
    emptyItensText: {
        color: '#7A7067',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 10,
    },
    emptyItensSubText: {
        color: '#9A8E85',
        fontSize: 12,
        marginTop: 4,
    },

    // ─── Financeiro ──────────────────────────────────────────────────────────
    financeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        marginBottom: 20,
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FDFBF7',
        borderRadius: 8,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2C2520',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#8C6239',
    },
    financeInput: {
        backgroundColor: '#FAF9F6',
        borderRadius: 6,
        height: 44,
        paddingHorizontal: 12,
        color: '#2C2520',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        marginBottom: 10,
    },
    saldoReadOnlyBox: {
        backgroundColor: '#FAF9F6',
        borderRadius: 6,
        height: 44,
        paddingHorizontal: 12,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2DCD5',
        marginBottom: 10,
    },
    saldoReadOnlyText: {
        color: '#C0392B',
        fontSize: 15,
        fontWeight: 'bold',
    },
    pagamentoGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 8,
    },
    pagamentoBtn: {
        flex: 1,
        height: 40,
        backgroundColor: '#FAF9F6',
        borderWidth: 1,
        borderColor: '#E2DCD5',
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 3,
    },
    pagamentoBtnActive: {
        borderColor: '#8C6239',
        backgroundColor: '#FAF2EB',
    },
    pagamentoBtnText: {
        color: '#7A7067',
        fontSize: 12,
        fontWeight: 'bold',
    },
    pagamentoBtnTextActive: {
        color: '#8C6239',
    },
    btnSalvarOS: {
        backgroundColor: '#8C6239',
        borderRadius: 8,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#8C6239',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    btnSalvarOSText: {
        color: '#FAF9F6',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },

    // ─── Modais Geral ────────────────────────────────────────────────────────
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
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 18,
    },
    modalBtn: {
        flex: 1,
        height: 44,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 5,
    },
    modalBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
    },

    // ─── Modal Serviços Adicionais ───────────────────────────────────────────
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
        marginBottom: 6,
    },
    smallBtn: {
        height: 38,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 3,
    },
    smallBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    modalSubLabel: {
        fontSize: 12,
        color: '#8C6239',
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 12,
    },
    catalogoItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E2DCD5',
    },
    catalogoItemDesc: {
        color: '#2C2520',
        fontSize: 14,
        fontWeight: '500',
    },
    catalogoItemPrice: {
        color: '#8C6239',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
    },
    modalDivider: {
        height: 1,
        backgroundColor: '#E2DCD5',
        marginVertical: 15,
    },
    btnAdicionarManual: {
        backgroundColor: '#8C6239',
        height: 38,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 6,
    },
    btnAdicionarManualText: {
        color: '#FAF9F6',
        fontSize: 12,
        fontWeight: 'bold',
    },

    // ─── Câmera ──────────────────────────────────────────────────────────────
    cameraContainer: {
        flex: 1,
        backgroundColor: '#000000',
    },
    cameraOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'space-between',
        padding: 20,
    },
    cameraHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Platform.OS === 'ios' ? 40 : 20,
    },
    cameraHeaderBtn: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    cameraTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    cameraBottomBar: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    shutterBtn: {
        width: 74,
        height: 74,
        borderRadius: 37,
        borderWidth: 4,
        borderColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    shutterBtnInner: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#FFFFFF',
    },

    // ─── Progresso de Salvar ──────────────────────────────────────────────────
    progressOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(44, 37, 32, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    progressBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 25,
        alignItems: 'center',
        width: '80%',
        borderWidth: 1,
        borderColor: '#E2DCD5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    progressText: {
        color: '#2C2520',
        fontSize: 14,
        marginTop: 15,
        textAlign: 'center',
        fontWeight: '500',
    },
});