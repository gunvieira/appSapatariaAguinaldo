import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatarReal } from '../utils/format';

interface MetodoPagCardProps {
    icone: string;
    label: string;
    valor: number;
    corFundo: string;
    corIcone: string;
    corTexto: string;
}

export default function MetodoPagCard({
    icone,
    label,
    valor,
    corFundo,
    corIcone,
    corTexto,
}: MetodoPagCardProps) {
    return (
        <View style={[styles.card, { backgroundColor: corFundo }]}>
            <View style={[styles.iconWrapper, { backgroundColor: corIcone + '22' }]}>
                <Ionicons name={icone as any} size={18} color={corIcone} />
            </View>
            <Text style={[styles.label, { color: corTexto }]}>{label}</Text>
            <Text style={styles.valor}>{formatarReal(valor)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        borderRadius: 12,
        padding: 12,
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },
    iconWrapper: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        color: '#7A7067',
        marginBottom: 4,
    },
    valor: {
        fontSize: 14,
        fontWeight: '800',
        color: '#8C6239',
    },
});
