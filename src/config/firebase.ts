import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyDa853yy4X8tcTs-IajzVC-nlIbYVjOI08",
    authDomain: "appsapataria.firebaseapp.com",
    projectId: "appsapataria",
    storageBucket: "appsapataria.firebasestorage.app",
    messagingSenderId: "8386301767",
    appId: "1:8386301767:web:b616821f8f661116288662"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);