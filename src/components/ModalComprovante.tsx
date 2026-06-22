import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Linking,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';

interface ModalComprovanteProps {
    visible: boolean;
    titulo: string;
    textoComprovante: string;
    /** Telefone do cliente (apenas números) para pré-preencher o WhatsApp */
    telefoneWhatsApp?: string;
    /** Chamado quando o usuário pressiona "Imprimir" */
    onImprimir: () => void;
    /** Chamado quando o usuário fecha o modal */
    onFechar: () => void;
}

export default function ModalComprovante({
    visible,
    titulo,
    textoComprovante,
    telefoneWhatsApp,
    onImprimir,
    onFechar,
}: ModalComprovanteProps) {
    const [compartilhando, setCompartilhando] = useState(false);

    // ─── Enviar por WhatsApp ───────────────────────────────────────────────────
    const handleWhatsApp = () => {
        const mensagem = encodeURIComponent(textoComprovante);
        let url: string;
        if (telefoneWhatsApp) {
            const numLimpo = telefoneWhatsApp.replace(/\D/g, '');
            const fone = numLimpo.startsWith('55') ? numLimpo : `55${numLimpo}`;
            url = `https://wa.me/${fone}?text=${mensagem}`;
        } else {
            url = `https://wa.me/?text=${mensagem}`;
        }
        Linking.openURL(url).catch(() => {
            Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
        });
    };

    // ─── Compartilhar / Baixar ─────────────────────────────────────────────────
    const handleCompartilhar = async () => {
        try {
            setCompartilhando(true);
            const fileName = `comprovante_${Date.now()}.txt`;
            const file = new File(Paths.cache, fileName);
            file.write(textoComprovante);
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Indisponível', 'O compartilhamento não está disponível neste dispositivo.');
                return;
            }
            await Sharing.shareAsync(file.uri, {
                mimeType: 'text/plain',
                dialogTitle: 'Compartilhar Comprovante',
                UTI: 'public.plain-text',
            });
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível compartilhar o comprovante.');
        } finally {
            setCompartilhando(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            statusBarTranslucent={true}
            onRequestClose={onFechar}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>

                    {/* ─── CABEÇALHO ───────────────────────────────────────────── */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Ionicons name="receipt-outline" size={22} color="#8C6239" />
                            <Text style={styles.headerTitle}>{titulo}</Text>
                        </View>
                        <TouchableOpacity onPress={onFechar} style={styles.btnClose} activeOpacity={0.7}>
                            <Ionicons name="close" size={22} color="#7A7067" />
                        </TouchableOpacity>
                    </View>

                    {/* ─── PAPEL TÉRMICO ───────────────────────────────────────── */}
                    <View style={styles.paperWrapper}>
                        {/* Borda serrilhada no topo */}
                        <View style={styles.paperTear} />
                        <ScrollView
                            style={styles.paperScroll}
                            contentContainerStyle={styles.paperContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={styles.paperText} selectable>
                                {textoComprovante}
                            </Text>
                        </ScrollView>
                        {/* Borda serrilhada na base */}
                        <View style={styles.paperTear} />
                    </View>

                    {/* ─── AÇÕES ───────────────────────────────────────────────── */}
                    <View style={styles.actionsContainer}>

                        {/* WhatsApp */}
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnWhatsApp]}
                            onPress={handleWhatsApp}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
                            <Text style={styles.actionBtnText}>WhatsApp</Text>
                        </TouchableOpacity>

                        {/* Compartilhar/Baixar */}
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnShare]}
                            onPress={handleCompartilhar}
                            activeOpacity={0.8}
                            disabled={compartilhando}
                        >
                            {compartilhando ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Ionicons
                                    name={Platform.OS === 'ios' ? 'share-outline' : 'download-outline'}
                                    size={20}
                                    color="#FFFFFF"
                                />
                            )}
                            <Text style={styles.actionBtnText}>
                                {Platform.OS === 'ios' ? 'Compartilhar' : 'Baixar'}
                            </Text>
                        </TouchableOpacity>

                        {/* Imprimir */}
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnPrint]}
                            onPress={onImprimir}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="print-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.actionBtnText}>Imprimir</Text>
                        </TouchableOpacity>

                    </View>

                    {/* ─── FECHAR ──────────────────────────────────────────────── */}
                    <TouchableOpacity
                        style={styles.btnFechar}
                        onPress={onFechar}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.btnFecharText}>Fechar</Text>
                    </TouchableOpacity>

                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(20,15,10,0.82)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#FAF9F6',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingBottom: 30,
    },

    // ─── Cabeçalho ───────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#E2DCD5',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#2C2520',
        letterSpacing: 0.2,
    },
    btnClose: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#F0EDE8',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ─── Papel Térmico ───────────────────────────────────────────────────────
    paperWrapper: {
        marginHorizontal: 20,
        marginVertical: 16,
        maxHeight: 320,
        // Sombra para o efeito de papel
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 5,
    },
    paperTear: {
        height: 8,
        backgroundColor: '#FFFEF9',
        // Borda serrilhada simulada com borderStyle (apenas Android)
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#D4CFC8',
    },
    paperScroll: {
        backgroundColor: '#FFFEF9',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#D4CFC8',
    },
    paperContent: {
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    paperText: {
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        fontSize: 12,
        lineHeight: 18,
        color: '#1A1410',
        letterSpacing: 0.3,
    },

    // ─── Botões de Ação ──────────────────────────────────────────────────────
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        gap: 10,
        marginBottom: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        gap: 5,
    },
    actionBtnWhatsApp: {
        backgroundColor: '#25D366',
    },
    actionBtnShare: {
        backgroundColor: '#1565C0',
    },
    actionBtnPrint: {
        backgroundColor: '#6D4C41',
    },
    actionBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    // ─── Fechar ──────────────────────────────────────────────────────────────
    btnFechar: {
        marginHorizontal: 20,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: '#F0EDE8',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },
    btnFecharText: {
        color: '#7A7067',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
});
