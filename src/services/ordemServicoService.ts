import { collection, addDoc, getDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, Timestamp, limit, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { OrdemServico, FormaPagamento, StatusOS } from '../types';
import { reloadSignal } from '../utils/reloadSignal';

const ORDENS_COL = 'ordens_servico';

//salvar OS(Ordem de Serviço)
export async function salvarOS(os: Omit<OrdemServico, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, ORDENS_COL), {
        ...os,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });
    reloadSignal.markAllDirty();
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
    reloadSignal.markAllDirty();
}

// atualizar dados gerais da OS
export async function atualizarOS(osId: string, dadosAtualizados: Partial<Omit<OrdemServico, 'id' | 'createdAt'>>): Promise<void> {
    const osRef = doc(db, ORDENS_COL, osId);
    await updateDoc(osRef, {
        ...dadosAtualizados,
        updatedAt: Timestamp.now(),
    });
    reloadSignal.markAllDirty();
}

// deletar OS
export async function deletarOS(osId: string): Promise<void> {
    const osRef = doc(db, ORDENS_COL, osId);
    await deleteDoc(osRef);
    reloadSignal.markAllDirty();
}

// buscar OS por clienteId
export async function getOrdensByClienteId(clienteId: string): Promise<OrdemServico[]> {
    const q = query(
        collection(db, ORDENS_COL),
        where('clienteId', '==', clienteId),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OrdemServico));
}
