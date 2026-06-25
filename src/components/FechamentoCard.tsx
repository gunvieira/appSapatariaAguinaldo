import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FechamentoCaixa } from '../types';
import { formatarReal } from '../utils/format';

function formatarDataCompleta(timestamp: any): string {
    if (!timestamp) return '';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${diasSemana[date.getDay()]}, ${date.getDate()} ${meses[date.getMonth()]}. ${date.getFullYear()}`;
    } catch {
        return '';
    }
}

function formatarHora(timestamp: any): string {
    if (!timestamp) return '';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

interface FechamentoCardProps {
    fechamento: FechamentoCaixa;
}

export default function FechamentoCard({ fechamento }: FechamentoCardProps) {
    const dataFormatada = formatarDataCompleta(fechamento.data);
    const hora = formatarHora(fechamento.data);

    return (
        <View style={styles.card}>
            {/* Cabeçalho */}
            <View style={styles.cardHeader}>
                <View style={styles.dataWrapper}>
                    <Ionicons name="calendar-outline" size={14} color="#8C6239" />
                    <Text style={styles.data}>{dataFormatada}</Text>
                </View>
                <Text style={styles.hora}>{hora}</Text>
            </View>

            {/* Total em destaque */}
            <Text style={styles.total}>{formatarReal(fechamento.totalGeral)}</Text>

            {/* Breakdown por forma de pagamento */}
            <View style={styles.breakdown}>
                {fechamento.totalDinheiro > 0 && (
                    <View style={styles.breakdownItem}>
                        <View style={[styles.breakdownDot, { backgroundColor: '#2E7D32' }]} />
                        <Text style={styles.breakdownText}>
                            Dinheiro:{' '}
                            <Text style={styles.breakdownValor}>{formatarReal(fechamento.totalDinheiro)}</Text>
                        </Text>
                    </View>
                )}
                {fechamento.totalPix > 0 && (
                    <View style={styles.breakdownItem}>
                        <View style={[styles.breakdownDot, { backgroundColor: '#1565C0' }]} />
                        <Text style={styles.breakdownText}>
                            PIX:{' '}
                            <Text style={styles.breakdownValor}>{formatarReal(fechamento.totalPix)}</Text>
                        </Text>
                    </View>
                )}
                {fechamento.totalCartao > 0 && (
                    <View style={styles.breakdownItem}>
                        <View style={[styles.breakdownDot, { backgroundColor: '#8D6E1A' }]} />
                        <Text style={styles.breakdownText}>
                            Cartão:{' '}
                            <Text style={styles.breakdownValor}>{formatarReal(fechamento.totalCartao)}</Text>
                        </Text>
                    </View>
                )}
            </View>

            {/* Rodapé com contadores */}
            <View style={styles.footer}>
                <View style={styles.chip}>
                    <Ionicons name="document-text-outline" size={11} color="#7A7067" />
                    <Text style={styles.chipText}>{fechamento.quantidadeOS} OS</Text>
                </View>
                <View style={styles.chip}>
                    <Ionicons name="cart-outline" size={11} color="#7A7067" />
                    <Text style={styles.chipText}>{fechamento.quantidadeVendas} vendas</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2DCD5',
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    dataWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    data: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2C2520',
    },
    hora: {
        fontSize: 12,
        color: '#9A8E85',
        backgroundColor: '#F5F2EB',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 5,
    },
    total: {
        fontSize: 24,
        fontWeight: '800',
        color: '#8C6239',
        letterSpacing: -0.5,
        marginBottom: 10,
    },
    breakdown: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    breakdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    breakdownDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    breakdownText: {
        fontSize: 12,
        color: '#7A7067',
    },
    breakdownValor: {
        fontWeight: '700',
        color: '#2C2520',
    },
    footer: {
        flexDirection: 'row',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#F0EBE5',
        paddingTop: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FAF9F6',
        borderRadius: 6,
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },
    chipText: {
        fontSize: 11,
        color: '#7A7067',
        fontWeight: '500',
    },
});
