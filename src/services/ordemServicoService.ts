import { collection, addDoc, getDoc, getDocs, doc, updateDoc, query, orderBy, Timestamp, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { OrdemServico, FormaPagamento, StatusOS } from '../types';

const ORDENS_COL = 'ordens_servico';

//salvar OS(Ordem de Serviço)
export async function salvarOS(os: Omit<OrdemServico, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, ORDENS_COL), {
        ...os,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });
    return docRef.id;
}

// receber OS atuais
export async function getRecentOS(limitCount: number): Promise<OrdemServico[]> {
    const q = query(collection(db, ORDENS_COL), orderBy('createdAt', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrdemServico));
}

// buscar todas as OS
export async function getOrdens(): Promise<OrdemServico[]> {
    const q = query(collection(db, ORDENS_COL), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrdemServico));
}

// busca de OS por ID
export async function getOSById(id: string): Promise<OrdemServico | null> {
    const docSnap = await getDoc(doc(db, ORDENS_COL, id));
    return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as OrdemServico) : null;
}

// atualizar status da OS
export async function atualizarStatusOS(osId: string, novoStatus: StatusOS, formaPagamentoSaldo?: FormaPagamento): Promise<void> {
    const osRef = doc(db, ORDENS_COL, osId);
    const updates: Partial<OrdemServico> = {
        status: novoStatus,
        updatedAt: Timestamp.now(),
    };
    if (formaPagamentoSaldo) updates.formaPagamentoSaldo = formaPagamentoSaldo;
    await updateDoc(osRef, updates);
}