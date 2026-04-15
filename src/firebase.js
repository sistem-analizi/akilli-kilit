import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// konfigirasyonlar, firebase sitesinde var
const firebaseConfig = {
  apiKey: "AIzaSyBf1PyJnLqu2T8X8tw3iHSMxEp3yZJmwWA",
  authDomain: "deneme-66ca9.firebaseapp.com",
  databaseURL: "https://deneme-66ca9-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "deneme-66ca9",
  storageBucket: "deneme-66ca9.firebasestorage.app",
  messagingSenderId: "622238134482",
  appId: "1:622238134482:web:af16bf14307e93e8583d0b"
};


const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);