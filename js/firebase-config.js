import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAwywvboQgWqkrZlbwrUPdaUq-gLnWM64E",
  authDomain: "plataforma-ssa-3130e.firebaseapp.com",
  projectId: "plataforma-ssa-3130e",
  storageBucket: "plataforma-ssa-3130e.firebasestorage.app",
  messagingSenderId: "850671249674",
  appId: "1:850671249674:web:53a115408f8006745c32f3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { 
  db, 
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot
};
