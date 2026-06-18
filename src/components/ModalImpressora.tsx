import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    PermissionsAndroid,
    Platform,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';

interface ModalImpressoraProps {
    visible: boolean;
    onClose: () => void;
    onSelectDevice: (device: BluetoothDevice) => void;
    macSalvo?: string; // MAC da impressora já salva — para destacar na lista
}

export default function ModalImpressora({
    visible,
    onClose,
    onSelectDevice,
    macSalvo,
}: ModalImpressoraProps) {
    const [carregandoPareados, setCarregandoPareados] = useState(false);
    const [buscandoNovos, setBuscandoNovos] = useState(false);
    const [devices, setDevices] = useState<BluetoothDevice[]>([]);

    // Carrega dispositivos já pareados assim que o modal abre
    useEffect(() => {
        if (visible) {
            carregarPareados();
        } else {
            setDevices([]);
        }
    }, [visible]);

    const carregarPareados = async () => {
        setCarregandoPareados(true);
        try {
            const enabled = await RNBluetoothClassic.isBluetoothEnabled();
            if (!enabled) {
                Alert.alert(
                    'Bluetooth Desligado',
                    'Ligue o Bluetooth do celular e tente novamente.'
                );
                return;
            }
            const pareados = await RNBluetoothClassic.getBondedDevices();
            setDevices(pareados);
        } catch (err) {
            console.error('Erro ao listar dispositivos pareados:', err);
        } finally {
            setCarregandoPareados(false);
        }
    };

    const solicitarPermissoes = async (): Promise<boolean> => {
        if (Platform.OS !== 'android') return true;
        if (Platform.Version >= 31) {
            // Android 12+ requer BLUETOOTH_SCAN e BLUETOOTH_CONNECT
            const resultado = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ]);
            return (
                resultado['android.permission.BLUETOOTH_CONNECT'] ===
                PermissionsAndroid.RESULTS.GRANTED
            );
        }
        // Android < 12 usa apenas localização para BT
        const resultado = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return resultado === PermissionsAndroid.RESULTS.GRANTED;
    };

    const handleBuscarNovos = async () => {
        const temPermissao = await solicitarPermissoes();
        if (!temPermissao) {
            Alert.alert(
                'Permissão Negada',
                'O aplicativo precisa de permissão de localização para buscar dispositivos Bluetooth.'
            );
            return;
        }

        setBuscandoNovos(true);
        try {
            const enabled = await RNBluetoothClassic.isBluetoothEnabled();
            if (!enabled) {
                Alert.alert('Bluetooth Desligado', 'Ligue o Bluetooth e tente novamente.');
                return;
            }
            const descobertos = await RNBluetoothClassic.startDiscovery();
            // Mescla pareados + descobertos e deduplica por MAC address
            const todos = [...devices, ...descobertos];
            const unicos = Array.from(
                new Map(todos.map((d) => [d.address, d])).values()
            );
            setDevices(unicos);
        } catch (err) {
            console.error('Erro ao descobrir dispositivos:', err);
            Alert.alert('Erro', 'Falha ao buscar novos dispositivos. Tente novamente.');
        } finally {
            setBuscandoNovos(false);
        }
    };

    const renderDevice = ({ item }: { item: BluetoothDevice }) => {
        const isSalvo = item.address === macSalvo;
        return (
            <TouchableOpacity
                style={[styles.deviceCard, isSalvo && styles.deviceCardSalvo]}
                onPress={() => onSelectDevice(item)}
                activeOpacity={0.7}
            >
                <View style={styles.deviceLeft}>
                    <View style={[styles.deviceIconWrapper, isSalvo && styles.deviceIconWrapperSalvo]}>
                        <Ionicons
                            name="print-outline"
                            size={22}
                            color={isSalvo ? '#FAF9F6' : '#8C6239'}
                        />
                    </View>
                    <View style={styles.deviceTexts}>
                        <Text style={styles.deviceName} numberOfLines={1}>
                            {item.name || 'Dispositivo sem nome'}
                        </Text>
                        <Text style={styles.deviceAddress}>{item.address}</Text>
                        {isSalvo && (
                            <Text style={styles.deviceSalvoLabel}>✓ Impressora salva</Text>
                        )}
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9A8E85" />
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Handle visual */}
                    <View style={styles.handle} />

                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Impressora Bluetooth</Text>
                            <Text style={styles.subtitle}>Selecione a impressora para imprimir</Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close" size={24} color="#7A7067" />
                        </TouchableOpacity>
                    </View>

                    {/* Lista de dispositivos */}
                    <View style={styles.listWrapper}>
                        <View style={styles.listHeaderRow}>
                            <Text style={styles.listLabel}>
                                {carregandoPareados
                                    ? 'Carregando...'
                                    : `${devices.length} dispositivo(s) encontrado(s)`}
                            </Text>
                            <TouchableOpacity
                                style={styles.btnRefresh}
                                onPress={carregarPareados}
                                disabled={carregandoPareados}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="refresh-outline" size={16} color="#8C6239" />
                            </TouchableOpacity>
                        </View>

                        {carregandoPareados ? (
                            <View style={styles.loadingWrapper}>
                                <ActivityIndicator color="#8C6239" />
                                <Text style={styles.loadingText}>Buscando impressoras...</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={devices}
                                keyExtractor={(item) => item.address}
                                renderItem={renderDevice}
                                style={styles.flatList}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.flatListContent}
                                ListEmptyComponent={
                                    <View style={styles.emptyWrapper}>
                                        <Ionicons name="print-outline" size={42} color="#E2DCD5" />
                                        <Text style={styles.emptyText}>
                                            Nenhuma impressora pareada encontrada.{'\n'}
                                            Pare a impressora nas configurações do celular e tente novamente.
                                        </Text>
                                    </View>
                                }
                            />
                        )}
                    </View>

                    {/* Botão buscar novos dispositivos (descoberta ativa) */}
                    <TouchableOpacity
                        style={[styles.btnBuscar, buscandoNovos && styles.btnBuscarDisabled]}
                        onPress={handleBuscarNovos}
                        disabled={buscandoNovos}
                        activeOpacity={0.8}
                    >
                        {buscandoNovos ? (
                            <>
                                <ActivityIndicator color="#8C6239" size="small" />
                                <Text style={styles.btnBuscarText}>
                                    Buscando novos dispositivos...
                                </Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="bluetooth-outline" size={18} color="#8C6239" />
                                <Text style={styles.btnBuscarText}>Buscar novos dispositivos</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(44, 37, 32, 0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        maxHeight: '82%',
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
        marginTop: 10,
        marginBottom: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0EBE5',
    },
    title: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#2C2520',
    },
    subtitle: {
        fontSize: 12,
        color: '#9A8E85',
        marginTop: 3,
    },
    closeBtn: {
        padding: 4,
    },
    listWrapper: {
        flex: 1,
        minHeight: 180,
    },
    listHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 8,
    },
    listLabel: {
        fontSize: 12,
        color: '#9A8E85',
        fontWeight: '600',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    btnRefresh: {
        padding: 4,
    },
    loadingWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 30,
    },
    loadingText: {
        color: '#7A7067',
        fontSize: 13,
    },
    flatList: {
        flex: 1,
    },
    flatListContent: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    deviceCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E2DCD5',
    },
    deviceCardSalvo: {
        borderColor: '#8C6239',
        backgroundColor: '#FDF8F4',
    },
    deviceLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    deviceIconWrapper: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#F5F2EB',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    deviceIconWrapperSalvo: {
        backgroundColor: '#8C6239',
    },
    deviceTexts: {
        flex: 1,
    },
    deviceName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2C2520',
    },
    deviceAddress: {
        fontSize: 11,
        color: '#9A8E85',
        marginTop: 2,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    deviceSalvoLabel: {
        fontSize: 11,
        color: '#8C6239',
        fontWeight: '700',
        marginTop: 3,
    },
    emptyWrapper: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 24,
    },
    emptyText: {
        fontSize: 13,
        color: '#9A8E85',
        textAlign: 'center',
        lineHeight: 20,
        marginTop: 12,
    },
    btnBuscar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        margin: 16,
        marginTop: 8,
        paddingVertical: 13,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#8C6239',
        backgroundColor: '#FFFFFF',
    },
    btnBuscarDisabled: {
        borderColor: '#E2DCD5',
        backgroundColor: '#FAF9F6',
    },
    btnBuscarText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#8C6239',
    },
});