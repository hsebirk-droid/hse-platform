// ============================================
// AUTENTICAÇÃO - VERSÃO SIMPLES
// ============================================

import { db, collection, getDocs, query, where } from './firebase-config.js';

// Login do colaborador
export async function loginColaborador(user, pass) {
  try {
    const q = query(collection(db, 'colaboradores'), where('user', '==', user.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);
    
    let found = false;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.pass === pass) {
        found = true;
        localStorage.setItem('usuarioAtivo', user.toLowerCase().trim());
      }
    });
    
    return found;
  } catch (error) {
    console.error('Erro no login:', error);
    return false;
  }
}

// Login do administrador
export function loginAdmin(password) {
  const ADMIN_PASS = 'SSA2024admin';
  if (password === ADMIN_PASS) {
    localStorage.setItem('usuarioAdmin', 'admin');
    return true;
  }
  return false;
}

// Obter utilizador atual
export function getCurrentUser() {
  const colaborador = localStorage.getItem('usuarioAtivo');
  const admin = localStorage.getItem('usuarioAdmin');
  if (admin) return { type: 'admin', name: 'Administrador' };
  if (colaborador) return { type: 'colaborador', name: colaborador };
  return null;
}

// Verificar se é admin
export function isAdmin() {
  return localStorage.getItem('usuarioAdmin') !== null;
}

// Logout
export function logout() {
  localStorage.removeItem('usuarioAtivo');
  localStorage.removeItem('usuarioAdmin');
  localStorage.removeItem('cursoAtualId');
  localStorage.removeItem('cursoConcluido');
  window.location.href = 'login.html';
}
