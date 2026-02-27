import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyB26bXGxj5TGfHIXjFijp1TmPfaJzMLEtE",
    authDomain: "swapchat001.firebaseapp.com",
    databaseURL: "https://swapchat001-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "swapchat001",
    storageBucket: "swapchat001.firebasestorage.app",
    messagingSenderId: "61862567020",
    appId: "1:61862567020:web:0d7d15d74b67fda23e0c49",
    measurementId: "G-WRE19Y2SXZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
