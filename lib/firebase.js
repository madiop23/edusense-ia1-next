// Configuration et initialisation de Firebase
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDf3_FoyuowFj2AgAqXrx7Hkj00uCTGAO8",
  authDomain: "edusense-ia1.firebaseapp.com",
  projectId: "edusense-ia1",
  storageBucket: "edusense-ia1.firebasestorage.app",
  messagingSenderId: "600263150028",
  appId: "1:600263150028:web:4aea216cd41aa22754b569"
};

// App principale (où l'admin est connecté)
const app = initializeApp(firebaseConfig);

// App secondaire (pour créer des comptes sans déconnecter l'admin)
const secondaryApp = getApps().find((a) => a.name === "Secondary")
  || initializeApp(firebaseConfig, "Secondary");

export const auth = getAuth(app);
export const db = getFirestore(app);
export const secondaryAuth = getAuth(secondaryApp);

export default app;