import { collection, addDoc, getDocs, query, orderBy, Timestamp, where, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Cliente, CatalogoServico, OrdemServico } from '../types';

// Coleções do Firestore
const CLIENTES_COL = 'clientes';
const CATALOGO_COL = 'catalogo_servicos';
const ORDENS_COL = 'ordens_servico';
const VENDAS_COL = 'vendas_diretas';

// ─── Clientes ────────────────────────────────────────────────────────────────
export async function getClientes(): Promise<Cliente[]> {
    try {
        const querySnapshot = await getDocs(query(collection(db, CLIENTES_COL), orderBy('nome')));
        const clientes: Cliente[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            clientes.push({
                id: doc.id,
                nome: data.nome || '',
                whatsapp: data.whatsapp || '',
            });
        });
        return clientes;
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        throw error;
    }
}

export async function addCliente(nome: string, whatsapp: string): Promise<Cliente> {
    try {
        const docRef = await addDoc(collection(db, CLIENTES_COL), {
            nome,
            whatsapp,
            createdAt: Timestamp.now(),
        });
        return {
            id: docRef.id,
            nome,
            whatsapp,
        };
    } catch (error) {
        console.error('Erro ao adicionar cliente:', error);
        throw error;
    }
}

// ─── Catálogo de Serviços ────────────────────────────────────────────────────
export async function getCatalogo(): Promise<CatalogoServico[]> {
    try {
        const querySnapshot = await getDocs(query(collection(db, CATALOGO_COL), orderBy('descricao')));
        const catalogo: CatalogoServico[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            catalogo.push({
                id: doc.id,
                descricao: data.descricao || '',
                valorPadrao: data.valorPadrao || 0,
                ativo: data.ativo !== undefined ? data.ativo : true,
            });
        });
        return catalogo;
    } catch (error) {
        console.error('Erro ao buscar catálogo de serviços:', error);
        throw error;
    }
}

export async function addServicoCatalogo(descricao: string, valorPadrao: number): Promise<CatalogoServico> {
    try {
        const docRef = await addDoc(collection(db, CATALOGO_COL), {
            descricao,
            valorPadrao,
            ativo: true,
            createdAt: Timestamp.now(),
        });
        return {
            id: docRef.id,
            descricao,
            valorPadrao,
            ativo: true,
        };
    } catch (error) {
        console.error('Erro ao adicionar serviço ao catálogo:', error);
        throw error;
    }
}

// ─── Upload de Mídia (Firebase Storage) ───────────────────────────────────────
export async function uploadFoto(uri: string): Promise<string> {
    try {
        // Obtém o blob local de forma robusta via XMLHttpRequest (evita bugs de leitura de file:// no Android)
        const blob: Blob = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = function () {
                resolve(xhr.response);
            };
            xhr.onerror = function (e) {
                console.error('Erro ao ler arquivo local da imagem:', e);
                reject(new TypeError("Erro de rede ao ler imagem local"));
            };
            xhr.responseType = "blob";
            xhr.open("GET", uri, true);
            xhr.send(null);
        });

        // Gera um nome único de arquivo no bucket
        const uniqueId = Math.random().toString(36).substring(2, 11);
        const filename = `fotos_os/${Date.now()}_${uniqueId}.jpg`;
        const storageRef = ref(storage, filename);

        // Upload do blob
        await uploadBytes(storageRef, blob);

        // Retorna a URL pública de download
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (error) {
        console.error('Erro ao realizar upload da foto:', error);
        throw error;
    }
}

// ─── Salvar Ordem de Serviço ─────────────────────────────────────────────────
export async function salvarOS(os: Omit<OrdemServico, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, ORDENS_COL), {
            ...os,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao salvar OS:', error);
        throw error;
    }
}

// ─── Métricas do Dashboard ───────────────────────────────────────────────────
export interface DashboardMetrics {
    faturamentoHoje: number;
    osAguardando: number;
    osEmConserto: number;
    osPronto: number;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startTimestamp = Timestamp.fromDate(startOfToday);

        // 1. Consultar todas as OS ativas (não entregues)
        const qAtivas = query(collection(db, ORDENS_COL), where('status', '!=', 'entregue'));
        const snapAtivas = await getDocs(qAtivas);
        
        let osAguardando = 0;
        let osEmConserto = 0;
        let osPronto = 0;

        snapAtivas.forEach((doc) => {
            const status = doc.data().status;
            if (status === 'aguardando') osAguardando++;
            else if (status === 'em_conserto') osEmConserto++;
            else if (status === 'pronto') osPronto++;
        });

        // 2. Faturamento de Hoje: Sinal de OS abertas hoje
        const qOSHoje = query(collection(db, ORDENS_COL), where('createdAt', '>=', startTimestamp));
        const snapOSHoje = await getDocs(qOSHoje);
        let faturamentoHoje = 0;
        snapOSHoje.forEach((doc) => {
            faturamentoHoje += doc.data().sinal || 0;
        });

        // 3. Faturamento de Hoje: Saldo de OS entregues hoje (pagas na retirada)
        const qOSEntreguesHoje = query(
            collection(db, ORDENS_COL), 
            where('status', '==', 'entregue'), 
            where('updatedAt', '>=', startTimestamp)
        );
        const snapOSEntreguesHoje = await getDocs(qOSEntreguesHoje);
        snapOSEntreguesHoje.forEach((doc) => {
            faturamentoHoje += doc.data().saldo || 0;
        });

        // 4. Faturamento de Hoje: Vendas Diretas (Balcão) feitas hoje
        const qVendasHoje = query(collection(db, VENDAS_COL), where('createdAt', '>=', startTimestamp));
        const snapVendasHoje = await getDocs(qVendasHoje);
        snapVendasHoje.forEach((doc) => {
            faturamentoHoje += doc.data().valor || doc.data().valor_total || 0;
        });

        return {
            faturamentoHoje,
            osAguardando,
            osEmConserto,
            osPronto
        };
    } catch (error) {
        console.error('Erro ao calcular métricas do dashboard:', error);
        throw error;
    }
}

// ─── Buscar Ordens Recentes ──────────────────────────────────────────────────
export async function getRecentOS(limitCount: number): Promise<OrdemServico[]> {
    try {
        const q = query(collection(db, ORDENS_COL), orderBy('createdAt', 'desc'), limit(limitCount));
        const querySnapshot = await getDocs(q);
        const ordens: OrdemServico[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            ordens.push({
                id: doc.id,
                ...data
            } as OrdemServico);
        });
        return ordens;
    } catch (error) {
        console.error('Erro ao buscar OS recentes:', error);
        throw error;
    }
}

// ─── Buscar Todas as Ordens ──────────────────────────────────────────────────
export async function getOrdens(): Promise<OrdemServico[]> {
    try {
        const q = query(collection(db, ORDENS_COL), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const ordens: OrdemServico[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            ordens.push({
                id: doc.id,
                ...data
            } as OrdemServico);
        });
        return ordens;
    } catch (error) {
        console.error('Erro ao buscar todas as ordens de serviço:', error);
        throw error;
    }
}
