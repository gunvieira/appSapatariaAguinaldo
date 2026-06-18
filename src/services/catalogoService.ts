import { collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CatalogoServico } from '../types';

const CATALOGO_COL = 'catalogo_servicos';

// getCatalogo
export async function getCatalogo(): Promise<CatalogoServico[]> {
    try {
        const q = query(collection(db, CATALOGO_COL), orderBy('descricao'));
        const querySnapshot = await getDocs(q);

        // Uso do .map() é mais idiomático e performático do que forEach + push
        return querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                descricao: data.descricao || '',
                valorPadrao: data.valorPadrao || 0,
                ativo: data.ativo ?? true, // Nullish coalescing operator
            };
        });
    } catch (error) {
        console.error('Erro ao buscar catálogo de serviços:', error);
        throw error;
    }
}

// addCatalogo
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

// update
export async function updateServicoCatalogo(id: string, dadosAtualizados: Partial<Omit<CatalogoServico, 'id'>>): Promise<void> {
    try {
        const servicoRef = doc(db, CATALOGO_COL, id);
        await updateDoc(servicoRef, {
            ...dadosAtualizados,
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Erro ao atualizar serviço:', error);
        throw error;
    }
}


// soft delete(mais recomendado)
export async function inativarServicoCatalogo(id: string): Promise<void> {
    try {
        const servicoRef = doc(db, CATALOGO_COL, id);
        await updateDoc(servicoRef, {
            ativo: false,
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Erro ao inativar serviço:', error);
        throw error;
    }
}

// hard delete
export async function deleteServicoCatalogoPermanente(id: string): Promise<void> {
    try {
        const servicoRef = doc(db, CATALOGO_COL, id);
        await deleteDoc(servicoRef);
    } catch (error) {
        console.error('Erro ao deletar serviço permanentemente:', error);
        throw error;
    }
}