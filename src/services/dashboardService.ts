import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DashboardMetrics } from '../types';

const ORDENS_COL = 'ordens_servico';
const VENDAS_COL = 'vendas_diretas';

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startTimestamp = Timestamp.fromDate(startOfToday);

    const snapAtivas = await getDocs(query(collection(db, ORDENS_COL), where('status', '!=', 'entregue')));
    
    let osAguardando = 0; let osEmConserto = 0; let osPronto = 0;
    
    snapAtivas.docs.forEach((doc) => {
        const status = doc.data().status;
        if (status === 'aguardando') osAguardando++;
        else if (status === 'em_conserto') osEmConserto++;
        else if (status === 'pronto') osPronto++;
    });

    let faturamentoHoje = 0;

    const snapOSHoje = await getDocs(query(collection(db, ORDENS_COL), where('createdAt', '>=', startTimestamp)));
    snapOSHoje.docs.forEach(doc => { faturamentoHoje += doc.data().sinal || 0; });

    const snapOSEntreguesHoje = await getDocs(query(collection(db, ORDENS_COL), where('status', '==', 'entregue'), where('updatedAt', '>=', startTimestamp)));
    snapOSEntreguesHoje.docs.forEach(doc => { faturamentoHoje += doc.data().saldo || 0; });

    const snapVendasHoje = await getDocs(query(collection(db, VENDAS_COL), where('createdAt', '>=', startTimestamp)));
    snapVendasHoje.docs.forEach(doc => { faturamentoHoje += doc.data().valor_total || doc.data().valor || 0; });

    return { faturamentoHoje, osAguardando, osEmConserto, osPronto };
}