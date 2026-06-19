import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

// Upload de Mídia (Firebase Storage)
export async function uploadFoto(uri: string): Promise<string> {
    const blob: Blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new TypeError("Erro de rede ao ler imagem local"));
        xhr.responseType = "blob";
        xhr.open("GET", uri, true);
        xhr.send(null);
    });

    const uniqueId = Math.random().toString(36).substring(2, 11);
    const storageRef = ref(storage, `fotos_os/${Date.now()}_${uniqueId}.jpg`);
    
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
}
