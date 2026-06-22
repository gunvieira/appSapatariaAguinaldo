import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import { OrdemServico } from '../types';
import { formatarTelefone, formatarReal } from '../utils/format';

interface OSItemCardProps {
    os: OrdemServico;
    onPress: () => void;
}

export default function OSItemCard({ os, onPress }: OSItemCardProps) {
    // Calcula o valor total (sinal + saldo)
    const valorTotal = os.sinal + os.saldo;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <View style={{ flex: 1 }}>
                <View style={styles.headerRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.clientName} numberOfLines={1}>
                            {os.clienteNome}
                        </Text>
                        {os.clienteTelefone ? (
                            <Text style={styles.phoneText}>
                                {formatarTelefone(os.clienteTelefone)}
                            </Text>
                        ) : null}
                    </View>
                    <StatusBadge status={os.status} />
                </View>
                <Text style={styles.detailsText} numberOfLines={1}>
                    {os.itens.length} {os.itens.length === 1 ? 'item' : 'itens'} • {os.itens.map(i => i.descricao).join(', ')}
                </Text>
                <View style={styles.footerRow}>
                    <Text style={styles.totalLabel}>
                        Total: <Text style={styles.totalVal}>{formatarReal(valorTotal)}</Text>
                    </Text>
                    {os.sinal > 0 && (
                        <Text style={styles.sinalText}>
                            Sinal pago: {formatarReal(os.sinal)}
                        </Text>
                    )}
                </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color="#9A8E85" style={{ marginLeft: 10 }} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        marginBottom: 10,
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    clientName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2C2520',
    },
    phoneText: {
        fontSize: 11,
        color: '#7A7067',
        marginTop: 2,
    },
    detailsText: {
        fontSize: 12,
        color: '#7A7067',
        lineHeight: 16,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    totalLabel: {
        fontSize: 11,
        color: '#9A8E85',
    },
    totalVal: {
        color: '#8C6239', // Destaque em Cognac
        fontWeight: 'bold',
    },
    sinalText: {
        fontSize: 10,
        color: '#2E7D32', // Verde indicando pagamento de sinal
        fontWeight: '600',
    },
});
