import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Servico } from '../types';
import { formatarReal } from '../utils/format';

interface ItemOSFormCardProps {
    index: number;
    descricao: string;
    onChangeDescricao: (text: string) => void;
    onRemoveItem: () => void;
    fotosEntrada: string[];
    onTakePhoto: (photoIndex: number) => void;
    onRemovePhoto: (photoIndex: number) => void;
    servicos: Servico[];
    onAddServicoClick: () => void;
    onRemoveServico: (servicoIndex: number) => void;
}

export default function ItemOSFormCard({
    index,
    descricao,
    onChangeDescricao,
    onRemoveItem,
    fotosEntrada,
    onTakePhoto,
    onRemovePhoto,
    servicos,
    onAddServicoClick,
    onRemoveServico
}: ItemOSFormCardProps) {
    const [fotoZoom, setFotoZoom] = useState<string | null>(null);

    return (
        <View style={styles.card}>
            {/* Modal de Zoom da Foto */}
            <Modal
                visible={!!fotoZoom}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setFotoZoom(null)}
            >
                <View style={styles.zoomOverlay}>
                    <TouchableOpacity 
                        style={styles.zoomCloseBtn}
                        onPress={() => setFotoZoom(null)}
                    >
                        <Ionicons name="close" size={30} color="#FFFFFF" />
                    </TouchableOpacity>
                    {fotoZoom && (
                        <Image source={{ uri: fotoZoom }} style={styles.zoomImage} />
                    )}
                </View>
            </Modal>

            {/* Header do Item */}
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Item #{index + 1}</Text>
                <TouchableOpacity onPress={onRemoveItem} style={styles.btnRemoverItem}>
                    <Ionicons name="close-circle-outline" size={24} color="#C0392B" />
                </TouchableOpacity>
            </View>

            {/* Descrição */}
            <TextInput
                style={styles.inputDescricao}
                placeholder="Descrição (ex: Sapato Social Preto, Bota de Camurça...)"
                placeholderTextColor="#9A8E85"
                value={descricao}
                onChangeText={onChangeDescricao}
            />

            {/* Fotos de Entrada (Máximo 3) */}
            <Text style={styles.subLabel}>Fotos de Entrada (Máximo 3)</Text>
            <View style={styles.photoContainer}>
                {fotosEntrada.map((photoUri, photoIndex) => (
                    <View key={photoIndex} style={styles.photoSlot}>
                        <TouchableOpacity 
                            style={{ flex: 1 }} 
                            onPress={() => setFotoZoom(photoUri)}
                            activeOpacity={0.9}
                        >
                            <Image source={{ uri: photoUri }} style={styles.photoImage} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.btnDeletePhoto}
                            onPress={() => onRemovePhoto(photoIndex)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="close-circle" size={20} color="#C0392B" />
                        </TouchableOpacity>
                    </View>
                ))}
                
                {fotosEntrada.length < 3 && (
                    <TouchableOpacity 
                        style={[styles.photoSlot, styles.btnTakePhoto]}
                        onPress={() => onTakePhoto(fotosEntrada.length)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="camera-outline" size={24} color="#8C6239" />
                        <Text style={styles.takePhotoText}>Tirar Foto</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Serviços do Item */}
            <View style={styles.servicosHeaderRow}>
                <Text style={styles.subLabel}>Serviços deste Item</Text>
                <TouchableOpacity 
                    style={styles.btnAdicionarServico}
                    onPress={onAddServicoClick}
                    activeOpacity={0.7}
                >
                    <Ionicons name="construct-outline" size={14} color="#8C6239" />
                    <Text style={styles.btnAdicionarServicoText}>+ Serviço</Text>
                </TouchableOpacity>
            </View>

            {servicos.length > 0 ? (
                <View style={styles.servicosListWrapper}>
                    {servicos.map((serv, servIndex) => (
                        <View key={serv.id} style={styles.servicoItemRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.servicoDescText}>{serv.descricao}</Text>
                                <Text style={styles.servicoValorText}>{formatarReal(serv.valor)}</Text>
                            </View>
                            <TouchableOpacity 
                                onPress={() => onRemoveServico(servIndex)}
                                style={styles.btnDeleteServico}
                            >
                                <Ionicons name="trash-outline" size={16} color="#C0392B" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            ) : (
                <Text style={styles.noDataText}>Nenhum serviço adicionado para este item.</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#2C2520',
    },
    btnRemoverItem: {
        padding: 2,
    },
    inputDescricao: {
        backgroundColor: '#FAF9F6',
        borderRadius: 6,
        height: 42,
        paddingHorizontal: 12,
        color: '#2C2520',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        marginBottom: 12,
    },
    subLabel: {
        fontSize: 12,
        color: '#8C6239',
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 10,
    },
    photoContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 4,
    },
    photoSlot: {
        width: '31%',
        aspectRatio: 1.0,
        backgroundColor: '#FAF9F6',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        overflow: 'hidden',
        marginRight: 6,
        marginBottom: 8,
    },
    btnTakePhoto: {
        justifyContent: 'center',
        alignItems: 'center',
        borderStyle: 'dashed',
        padding: 10,
    },
    takePhotoText: {
        color: '#7A7067',
        fontSize: 10,
        marginTop: 4,
        fontWeight: '500',
    },
    photoImage: {
        flex: 1,
        resizeMode: 'cover',
    },
    btnDeletePhoto: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    servicosHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
    },
    btnAdicionarServico: {
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: '#8C6239',
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: '#FFFFFF',
    },
    btnAdicionarServicoText: {
        color: '#8C6239',
        fontSize: 11,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    servicosListWrapper: {
        marginTop: 8,
        backgroundColor: '#FAF9F6',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        overflow: 'hidden',
    },
    servicoItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E2DCD5',
    },
    servicoDescText: {
        color: '#2C2520',
        fontSize: 13,
        fontWeight: '500',
    },
    servicoValorText: {
        color: '#8C6239',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    btnDeleteServico: {
        padding: 6,
    },
    noDataText: {
        fontSize: 13,
        color: '#9A8E85',
        fontStyle: 'italic',
        textAlign: 'center',
        marginVertical: 10,
    },
    
    // Zoom Modal
    zoomOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    zoomCloseBtn: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        right: 20,
        zIndex: 10,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 25,
    },
    zoomImage: {
        width: '95%',
        height: '80%',
        resizeMode: 'contain',
    },
});
