import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatarTelefone } from '../utils/format';

interface ClienteCardProps {
    nome: string;
    whatsapp: string;
    onRemove: () => void;
}

export default function ClienteCard({ nome, whatsapp, onRemove }: ClienteCardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.accentBar} />
            <View style={styles.infoWrapper}>
                <Text style={styles.nomeText}>{nome}</Text>
                <Text style={styles.whatsappText}>WhatsApp: {formatarTelefone(whatsapp)}</Text>
            </View>
            <TouchableOpacity 
                style={styles.btnRemover} 
                onPress={onRemove}
                activeOpacity={0.7}
            >
                <Ionicons name="trash-outline" size={20} color="#C0392B" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        overflow: 'hidden',
        paddingRight: 12,
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    accentBar: {
        width: 5,
        height: '100%',
        backgroundColor: '#8C6239', // Destaque lateral Cognac
    },
    infoWrapper: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    nomeText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#2C2520',
    },
    whatsappText: {
        fontSize: 12,
        color: '#7A7067',
        marginTop: 2,
    },
    btnRemover: {
        padding: 8,
        backgroundColor: '#FDF2F2',
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
