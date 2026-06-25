import { collection, addDoc, getDocs, query, orderBy, Timestamp, limit, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { FechamentoCaixa, DadosCaixaDoDia } from '../types';
import { reloadSignal } from '../utils/reloadSignal';


const FECHAMENTOS_COL = 'fechamentos_caixa';
const ORDENS_COL = 'ordens_servico';
const VENDAS_COL = 'vendas_diretas';

export async function fecharCaixa(dados: Omit<FechamentoCaixa, 'id' | 'data'>): Promise<string> {
    const docRef = await addDoc(collection(db, FECHAMENTOS_COL), {
        ...dados,
        data: Timestamp.now(),
    });
    reloadSignal.markAllDirty();
    return docRef.id;
}

export async function getHistoricoFechamentos(limitCount: number = 30): Promise<FechamentoCaixa[]> {
    const q = query(collection(db, FECHAMENTOS_COL), orderBy('data', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as FechamentoCaixa));
}

// pegar dados do caixa
export async function getDadosCaixaDoDia(): Promise<DadosCaixaDoDia> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startTimestamp = Timestamp.fromDate(startOfToday);

    let totalDinheiro = 0; let totalPix = 0; let totalCartao = 0;
    let quantidadeOS = 0; let quantidadeVendas = 0;

    const somar = (forma: string, valor: number) => {
        if (forma === 'dinheiro') totalDinheiro += valor;
        else if (forma === 'pix') totalPix += valor;
        else if (forma === 'cartão' || forma === 'cartao') totalCartao += valor;
    };

    // OS Abertas Hoje (Sinal)
    const snapOSHoje = await getDocs(query(collection(db, ORDENS_COL), where('createdAt', '>=', startTimestamp)));
    snapOSHoje.docs.forEach((doc) => {
        const data = doc.data();
        if (data.sinal > 0) {
            quantidadeOS++;
            somar(data.formaPagamentoSinal || 'dinheiro', data.sinal);
        }
    });

    // OS Entregues Hoje (Saldo)
    const snapEntregues = await getDocs(query(collection(db, ORDENS_COL), where('status', '==', 'entregue'), where('updatedAt', '>=', startTimestamp)));
    snapEntregues.docs.forEach((doc) => {
        const data = doc.data();
        if (data.saldo > 0) {
            somar(data.formaPagamentoSaldo || data.formaPagamentoSinal || 'dinheiro', data.saldo);
        }
    });

    // Vendas de Hoje
    const snapVendas = await getDocs(query(collection(db, VENDAS_COL), where('createdAt', '>=', startTimestamp)));
    snapVendas.docs.forEach((doc) => {
        const data = doc.data();
        const valor = data.valor_total || data.valor || 0;
        if (valor > 0) {
            quantidadeVendas++;
            somar(data.formaPagamento || 'dinheiro', valor);
        }
    });

    return { totalDinheiro, totalPix, totalCartao, totalGeral: totalDinheiro + totalPix + totalCartao, quantidadeOS, quantidadeVendas };
}