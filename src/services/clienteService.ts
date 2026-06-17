import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Cliente } from '../types';

const CLIENTES_COL = 'clientes';

//getDocs
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

//addDoc
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

//updateDoc
export async function updateCliente(id: string, dadosAtualizados: Partial<Omit<Cliente, 'id'>>): Promise<void> {
    try {
        const clienteRef = doc(db, CLIENTES_COL, id);
        await updateDoc(clienteRef, {
            ...dadosAtualizados,
            updatedAt: Timestamp.now()
        });
        console.log('Cliente atualizado com sucesso');
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        throw error;
    }
}

//deleteDoc
export async function deleteCliente(id: string): Promise<void> {
    try {
        const clienteRef = doc(db, CLIENTES_COL, id);
        await deleteDoc(clienteRef);
        console.log('Cliente removido com sucesso');
    } catch (error) {
        console.error('Erro ao deletar cliente:', error);
        throw error;
    }
}