
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAz6W-gIsRZzYh3Ue39prRgAJyAP6zzwrE",
    authDomain: "annona-1f7f7.firebaseapp.com",
    projectId: "annona-1f7f7",
    storageBucket: "annona-1f7f7.firebasestorage.app",
    messagingSenderId: "263477402010",
    appId: "1:263477402010:web:33c60ccad6f3deac8f8223"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);