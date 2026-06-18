import { collection, addDoc, getDocs, query, orderBy, Timestamp, where, limit, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { CatalogoServico, OrdemServico, FechamentoCaixa, StatusOS, FormaPagamento } from '../types';

// Coleções do Firestore
const ORDENS_COL = 'ordens_servico';
const VENDAS_COL = 'vendas_diretas';
const FECHAMENTOS_COL = 'fechamentos_caixa';


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

// ─── Tipos da Venda Direta ───────────────────────────────────────────────────
export interface ItemVenda {
    descricao: string;
    valor: number;
}

export interface VendaDiretaDoc {
    id: string;
    itens: ItemVenda[];
    valor_total: number;
    formaPagamento: 'dinheiro' | 'pix' | 'cartao';
    createdAt: Timestamp;
}

// ─── Salvar Venda Direta ──────────────────────────────────────────────────────
export async function salvarVendaDireta(
    itens: ItemVenda[],
    formaPagamento: 'dinheiro' | 'pix' | 'cartao'
): Promise<string> {
    try {
        const valor_total = itens.reduce((sum, item) => sum + item.valor, 0);
        const docRef = await addDoc(collection(db, VENDAS_COL), {
            itens,
            valor_total,
            formaPagamento,
            createdAt: Timestamp.now(),
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao salvar venda direta:', error);
        throw error;
    }
}

// ─── Buscar Vendas do Dia ─────────────────────────────────────────────────────
export async function getVendasDoDia(): Promise<VendaDiretaDoc[]> {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startTimestamp = Timestamp.fromDate(startOfToday);

        const q = query(
            collection(db, VENDAS_COL),
            where('createdAt', '>=', startTimestamp),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const vendas: VendaDiretaDoc[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            vendas.push({
                id: doc.id,
                itens: data.itens || [],
                valor_total: data.valor_total || data.valor || 0,
                formaPagamento: data.formaPagamento || 'dinheiro',
                createdAt: data.createdAt,
            });
        });
        return vendas;
    } catch (error) {
        console.error('Erro ao buscar vendas do dia:', error);
        throw error;
    }
}

// ─── Dados Consolidados do Caixa do Dia ──────────────────────────────────────
export interface DadosCaixaDoDia {
    totalDinheiro: number;
    totalPix: number;
    totalCartao: number;
    totalGeral: number;
    quantidadeOS: number;
    quantidadeVendas: number;
}

export async function getDadosCaixaDoDia(): Promise<DadosCaixaDoDia> {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startTimestamp = Timestamp.fromDate(startOfToday);

        let totalDinheiro = 0;
        let totalPix = 0;
        let totalCartao = 0;
        let quantidadeOS = 0;
        let quantidadeVendas = 0;

        const somar = (forma: string, valor: number) => {
            if (forma === 'dinheiro') totalDinheiro += valor;
            else if (forma === 'pix') totalPix += valor;
            else if (forma === 'cartao') totalCartao += valor;
        };

        // 1. OS abertas hoje — sinal pago na entrada
        const qOSHoje = query(
            collection(db, ORDENS_COL),
            where('createdAt', '>=', startTimestamp)
        );
        const snapOSHoje = await getDocs(qOSHoje);
        snapOSHoje.forEach((doc) => {
            const data = doc.data();
            const sinal = data.sinal || 0;
            if (sinal > 0) {
                quantidadeOS++;
                somar(data.formaPagamentoSinal || 'dinheiro', sinal);
            }
        });

        // 2. OS entregues hoje — saldo recebido na retirada
        const qOSEntregues = query(
            collection(db, ORDENS_COL),
            where('status', '==', 'entregue'),
            where('updatedAt', '>=', startTimestamp)
        );
        const snapEntregues = await getDocs(qOSEntregues);
        snapEntregues.forEach((doc) => {
            const data = doc.data();
            const saldo = data.saldo || 0;
            if (saldo > 0) {
                // Usa a mesma forma de pagamento do sinal como aproximação
                somar(data.formaPagamentoSinal || 'dinheiro', saldo);
            }
        });

        // 3. Vendas diretas de hoje
        const qVendas = query(
            collection(db, VENDAS_COL),
            where('createdAt', '>=', startTimestamp)
        );
        const snapVendas = await getDocs(qVendas);
        snapVendas.forEach((doc) => {
            const data = doc.data();
            const valor = data.valor_total || data.valor || 0;
            if (valor > 0) {
                quantidadeVendas++;
                somar(data.formaPagamento || 'dinheiro', valor);
            }
        });

        return {
            totalDinheiro,
            totalPix,
            totalCartao,
            totalGeral: totalDinheiro + totalPix + totalCartao,
            quantidadeOS,
            quantidadeVendas,
        };
    } catch (error) {
        console.error('Erro ao calcular dados do caixa do dia:', error);
        throw error;
    }
}

// ─── Fechar Caixa ─────────────────────────────────────────────────────────────
export async function fecharCaixa(
    dados: Omit<FechamentoCaixa, 'id' | 'data'>
): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, FECHAMENTOS_COL), {
            ...dados,
            data: Timestamp.now(),
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao fechar caixa:', error);
        throw error;
    }
}

// ─── Histórico de Fechamentos ─────────────────────────────────────────────────
export async function getHistoricoFechamentos(limitCount: number = 30): Promise<FechamentoCaixa[]> {
    try {
        const q = query(
            collection(db, FECHAMENTOS_COL),
            orderBy('data', 'desc'),
            limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        const fechamentos: FechamentoCaixa[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            fechamentos.push({
                id: doc.id,
                data: data.data,
                totalDinheiro: data.totalDinheiro || 0,
                totalPix: data.totalPix || 0,
                totalCartao: data.totalCartao || 0,
                totalGeral: data.totalGeral || 0,
                quantidadeOS: data.quantidadeOS || 0,
                quantidadeVendas: data.quantidadeVendas || 0,
            });
        });
        return fechamentos;
    } catch (error) {
        console.error('Erro ao buscar histórico de fechamentos:', error);
        throw error;
    }
}

// ─── Buscar OS por ID ────────────────────────────────────────────────────────
export async function getOSById(id: string): Promise<OrdemServico | null> {
    try {
        const docRef = doc(db, ORDENS_COL, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            } as OrdemServico;
        }
        return null;
    } catch (error) {
        console.error('Erro ao buscar OS por ID:', error);
        throw error;
    }
}

// ─── Atualizar Status da OS ──────────────────────────────────────────────────
export async function atualizarStatusOS(
    osId: string,
    novoStatus: StatusOS,
    formaPagamentoSaldo?: FormaPagamento
): Promise<void> {
    try {
        const osRef = doc(db, ORDENS_COL, osId);
        const updates: any = {
            status: novoStatus,
            updatedAt: Timestamp.now(),
        };
        if (formaPagamentoSaldo) {
            updates.formaPagamentoSaldo = formaPagamentoSaldo;
        }
        await updateDoc(osRef, updates);
    } catch (error) {
        console.error('Erro ao atualizar status da OS:', error);
        throw error;
    }
}
