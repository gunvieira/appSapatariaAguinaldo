import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Servico } from '../types';

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
    return (
        <View style={styles.card}>
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

            {/* Fotos de Entrada (Exige exatamente 2) */}
            <Text style={styles.subLabel}>Fotos de Entrada (Exige exatamente 2)</Text>
            <View style={styles.photoContainer}>
                {[0, 1].map((photoIndex) => {
                    const photoUri = fotosEntrada[photoIndex];
                    return (
                        <View key={photoIndex} style={styles.photoSlot}>
                            {photoUri ? (
                                <View style={{ flex: 1 }}>
                                    <Image source={{ uri: photoUri }} style={styles.photoImage} />
                                    <TouchableOpacity 
                                        style={styles.btnDeletePhoto}
                                        onPress={() => onRemovePhoto(photoIndex)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="close-circle" size={22} color="#C0392B" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    style={styles.btnTakePhoto}
                                    onPress={() => onTakePhoto(photoIndex)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="camera-outline" size={26} color="#8C6239" />
                                    <Text style={styles.takePhotoText}>Tirar Foto {photoIndex + 1}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}
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
                                <Text style={styles.servicoValorText}>R$ {serv.valor.toFixed(2)}</Text>
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
        justifyContent: 'space-between',
        marginTop: 4,
    },
    photoSlot: {
        width: '48%',
        aspectRatio: 1.2,
        backgroundColor: '#FAF9F6',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        overflow: 'hidden',
    },
    btnTakePhoto: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    takePhotoText: {
        color: '#7A7067',
        fontSize: 11,
        marginTop: 6,
        fontWeight: '500',
    },
    photoImage: {
        flex: 1,
        resizeMode: 'cover',
    },
    btnDeletePhoto: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 12,
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
});
