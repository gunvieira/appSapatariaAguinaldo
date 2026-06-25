import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Cliente } from '../types';
import { formatarTelefone } from '../utils/format';

interface ClienteListItemProps {
    cliente: Cliente;
    onPress: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export default function ClienteListItem({ cliente, onPress, onEdit, onDelete }: ClienteListItemProps) {
    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={onPress}
        >
            {/* Barra lateral cognac */}
            <View style={styles.cardAccent} />

            {/* Avatar inicial */}
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                    {cliente.nome.trim().charAt(0).toUpperCase()}
                </Text>
            </View>

            {/* Informações */}
            <View style={styles.cardInfo}>
                <Text style={styles.cardNome} numberOfLines={1}>{cliente.nome}</Text>
                <View style={styles.whatsappRow}>
                    <Ionicons name="logo-whatsapp" size={13} color="#25D366" style={{ marginRight: 4 }} />
                    <Text style={styles.cardWhatsapp}>
                        {formatarTelefone(cliente.whatsapp) || 'Sem telefone'}
                    </Text>
                </View>
            </View>

            {/* Ações */}
            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.actionEdit]}
                    onPress={onEdit}
                    activeOpacity={0.7}
                >
                    <Ionicons name="create-outline" size={18} color="#8C6239" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.actionDelete]}
                    onPress={onDelete}
                    activeOpacity={0.7}
                >
                    <Ionicons name="trash-outline" size={18} color="#C0392B" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
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
    whatsappRow: {
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
});
