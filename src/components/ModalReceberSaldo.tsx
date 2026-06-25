import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormaPagamento } from '../types';
import { formatarReal } from '../utils/format';

interface ModalReceberSaldoProps {
    visible: boolean;
    saldo: number;
    onClose: () => void;
    onConfirm: (formaPagamento: FormaPagamento) => Promise<void>;
}

export default function ModalReceberSaldo({
    visible,
    saldo,
    onClose,
    onConfirm,
}: ModalReceberSaldoProps) {
    const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
    const [processando, setProcessando] = useState(false);

    const handleConfirmar = async () => {
        try {
            setProcessando(true);
            await onConfirm(formaPagamento);
        } finally {
            setProcessando(false);
        }
    };

    const formas: { key: FormaPagamento; label: string; icon: string }[] = [
        { key: 'dinheiro', label: 'Dinheiro', icon: 'cash-outline' },
        { key: 'pix', label: 'PIX', icon: 'qr-code-outline' },
        { key: 'cartão', label: 'Cartão', icon: 'card-outline' },
    ];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.handle} />

                    <Text style={styles.title}>Recebimento de Saldo</Text>
                    <Text style={styles.subtitle}>
                        Para entregar o calçado, registre o recebimento do saldo de:
                    </Text>
                    <Text style={styles.valorDestaque}>{formatarReal(saldo)}</Text>

                    <Text style={styles.labelForma}>Forma de Pagamento:</Text>
                    <View style={styles.formaRow}>
                        {formas.map((f) => (
                            <TouchableOpacity
                                key={f.key}
                                style={[
                                    styles.formaChip,
                                    formaPagamento === f.key && styles.formaChipActive,
                                ]}
                                onPress={() => setFormaPagamento(f.key)}
                                disabled={processando}
                            >
                                <Ionicons
                                    name={f.icon as any}
                                    size={16}
                                    color={formaPagamento === f.key ? '#FAF9F6' : '#7A7067'}
                                />
                                <Text
                                    style={[
                                        styles.formaText,
                                        formaPagamento === f.key && styles.formaTextActive,
                                    ]}
                                >
                                    {f.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.btnCancel}
                            onPress={onClose}
                            disabled={processando}
                        >
                            <Text style={styles.btnCancelText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.btnConfirm}
                            onPress={handleConfirmar}
                            disabled={processando}
                        >
                            {processando ? (
                                <ActivityIndicator size="small" color="#FAF9F6" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark" size={18} color="#FAF9F6" />
                                    <Text style={styles.btnConfirmText}>Confirmar Recebimento</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(44,37,32,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        padding: 24,
        paddingBottom: 36,
        shadowColor: '#2C2520',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 12,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#E2DCD5',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 19,
        fontWeight: 'bold',
        color: '#2C2520',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: '#7A7067',
        lineHeight: 20,
        marginBottom: 8,
    },
    valorDestaque: {
        fontSize: 34,
        fontWeight: '800',
        color: '#8C6239',
        letterSpacing: -1,
        marginBottom: 20,
    },
    labelForma: {
        fontSize: 12,
        fontWeight: '700',
        color: '#7A7067',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    formaRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 24,
    },
    formaChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E2DCD5',
        backgroundColor: '#FFFFFF',
        gap: 6,
    },
    formaChipActive: {
        backgroundColor: '#8C6239',
        borderColor: '#8C6239',
    },
    formaText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#7A7067',
    },
    formaTextActive: {
        color: '#FAF9F6',
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
    },
    btnCancel: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: '#F0EBE5',
    },
    btnCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#7A7067',
    },
    btnConfirm: {
        flex: 2,
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8C6239',
        gap: 8,
        shadowColor: '#8C6239',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
    },
    btnConfirmText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FAF9F6',
    },
});
