import { collection, addDoc, getDocs, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ItemVenda, VendaDiretaDoc, FormaPagamento } from '../types';

const VENDAS_COL = 'vendas_diretas';

// salvar venda
export async function salvarVendaDireta(itens: ItemVenda[], formaPagamento: FormaPagamento): Promise<string> {
    const valor_total = itens.reduce((sum, item) => sum + item.valor, 0);
    const docRef = await addDoc(collection(db, VENDAS_COL), {
        itens,
        valor_total,
        formaPagamento,
        createdAt: Timestamp.now(),
    });
    return docRef.id;
}

// pegar vendas do dia
export async function getVendasDoDia(): Promise<VendaDiretaDoc[]> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const q = query(
        collection(db, VENDAS_COL),
        where('createdAt', '>=', Timestamp.fromDate(startOfToday)),
        orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            itens: data.itens || [],
            valor_total: data.valor_total || data.valor || 0,
            formaPagamento: data.formaPagamento || 'dinheiro',
            createdAt: data.createdAt,
        } as VendaDiretaDoc;
    });
}