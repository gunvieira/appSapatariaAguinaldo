import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusOS } from '../types';

interface StatusBadgeProps {
    status: StatusOS;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    const getStatusStyle = () => {
        switch (status) {
            case 'aguardando':
                return { bg: '#FDF3D6', text: '#8D6E1A' };
            case 'em_conserto':
                return { bg: '#FBECE0', text: '#B85C14' };
            case 'pronto':
                return { bg: '#E8F5E9', text: '#2E7D32' };
            case 'entregue':
                return { bg: '#E3F2FD', text: '#1565C0' };
            default:
                return { bg: '#F5F5F5', text: '#707070' };
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'aguardando': return 'Aguardando';
            case 'em_conserto': return 'Em Conserto';
            case 'pronto': return 'Pronto';
            case 'entregue': return 'Entregue';
            default: return status;
        }
    };

    const stylesDetail = getStatusStyle();

    return (
        <View style={[styles.badge, { backgroundColor: stylesDetail.bg }]}>
            <View style={[styles.dot, { backgroundColor: stylesDetail.text }]} />
            <Text style={[styles.text, { color: stylesDetail.text }]}>
                {getStatusText()}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 5,
    },
    text: {
        fontSize: 10,
        fontWeight: 'bold',
    },
});
