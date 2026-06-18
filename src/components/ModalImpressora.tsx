import React, { useState } from 'react';
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
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';

interface ModalImpressoraProps {
  visible: boolean;
  onClose: () => void;
  onSelectDevice: (device: BluetoothDevice) => void;
}

export default function ModalImpressora({ visible, onClose, onSelectDevice }: ModalImpressoraProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);

  // Função para solicitar permissões no Android
  const requestAccess = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      if (Platform.Version >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED;
      }
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const handleScan = async () => {
    const hasPermission = await requestAccess();
    if (!hasPermission) {
      Alert.alert('Permissão Negada', 'O aplicativo precisa de permissão para buscar dispositivos Bluetooth.');
      return;
    }

    setIsScanning(true);
    try {
      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        Alert.alert('Atenção', 'Por favor, ligue o Bluetooth do seu celular.');
        setIsScanning(false);
        return;
      }

      const paired = await RNBluetoothClassic.getBondedDevices();
      const discovered = await RNBluetoothClassic.startDiscovery();
      
      const allDevices = [...paired, ...discovered];
      const uniqueDevices = Array.from(new Map(allDevices.map(item => [item.address, item])).values());
      
      setDevices(uniqueDevices);
    } catch (err) {
      console.error('Erro ao buscar Bluetooth:', err);
      Alert.alert('Erro', 'Falha ao buscar dispositivos.');
    } finally {
      setIsScanning(false);
    }
  };

  const renderDevice = ({ item }: { item: BluetoothDevice }) => (
    <TouchableOpacity 
      style={styles.deviceCard}
      onPress={() => onSelectDevice(item)} 
    >
      <View style={styles.deviceInfo}>
        <Ionicons name="print-outline" size={24} color="#5D4037" />
        <View style={styles.deviceTexts}>
          <Text style={styles.deviceName}>{item.name || 'Dispositivo Desconhecido'}</Text>
          <Text style={styles.deviceAddress}>{item.address}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#8D6E63" />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Parear Impressora</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#5D4037" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.scanButton} 
            onPress={handleScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="bluetooth" size={20} color="#fff" style={styles.scanIcon} />
                <Text style={styles.scanButtonText}>Buscar Dispositivos</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.listContainer}>
            <Text style={styles.listSubtitle}>Dispositivos Encontrados:</Text>
            {devices.length === 0 && !isScanning ? (
              <Text style={styles.emptyText}>Nenhuma impressora encontrada.</Text>
            ) : (
              <FlatList
                data={devices}
                keyExtractor={(item) => item.address}
                renderItem={renderDevice}
                contentContainerStyle={styles.flatListContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FAF8F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '60%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3E2723',
  },
  closeButton: {
    padding: 4,
  },
  scanButton: {
    backgroundColor: '#8D6E63',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  scanIcon: {
    marginRight: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
  },
  listSubtitle: {
    fontSize: 14,
    color: '#795548',
    marginBottom: 12,
    fontWeight: '600',
  },
  flatListContent: {
    paddingBottom: 20,
  },
  deviceCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFEBE9',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceTexts: {
    marginLeft: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3E2723',
  },
  deviceAddress: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#A1887F',
    marginTop: 20,
    fontStyle: 'italic',
  },
});