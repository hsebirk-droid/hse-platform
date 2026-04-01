import { db, collection, getDocs, query, where } from './firebase-config.js';

export async function loginColaborador(user, pass) {
  console.log("🔐 Login colaborador:", user);
  
  if (!user || !pass) {
    console.log("❌ Utilizador ou password vazios");
    return false;
  }
  
  try {
    const q = query(collection(db, 'colaboradores'), where('user', '==', user.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log("❌ Utilizador não encontrado");
      return false;
    }
    
    let found = false;
    let userData = null;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.pass === pass) {
        found = true;
        userData = data;
      }
    });
    
    if (found && userData) {
      localStorage.setItem('usuarioAtivo', user.toLowerCase().trim());
      localStorage.setItem('usuarioNome', userData.user);
      localStorage.setItem('usuarioEmail', userData.email || '');
      localStorage.setItem('usuarioMatricula', userData.matricula || '');
      console.log("✅ Login bem sucedido para:", userData.user);
      return true;
    }
    
    console.log("❌ Password incorreta");
    return false;
  } catch (error) {
    console.error('Erro no login:', error);
    return false;
  }
}

export function loginAdmin(password) {
  const ADMIN_PASS = 'SSA2024admin';
  if (password === ADMIN_PASS) {
    localStorage.setItem('usuarioAdmin', 'admin');
    return true;
  }
  return false;
}

export function getCurrentUser() {
  const colaborador = localStorage.getItem('usuarioAtivo');
  const admin = localStorage.getItem('usuarioAdmin');
  const nome = localStorage.getItem('usuarioNome') || colaborador;
  const email = localStorage.getItem('usuarioEmail') || '';
  const matricula = localStorage.getItem('usuarioMatricula') || '';
  
  console.log("getCurrentUser - colaborador:", colaborador);
  console.log("getCurrentUser - admin:", admin);
  
  if (admin) return { type: 'admin', name: 'Administrador', email: '', matricula: '' };
  if (colaborador) return { type: 'colaborador', name: nome, email: email, matricula: matricula };
  return null;
}

export function isAdmin() {
  return localStorage.getItem('usuarioAdmin') !== null;
}

export function isAuthenticated() {
  return localStorage.getItem('usuarioAtivo') !== null || localStorage.getItem('usuarioAdmin') !== null;
}

export function logout() {
  localStorage.removeItem('usuarioAtivo');
  localStorage.removeItem('usuarioAdmin');
  localStorage.removeItem('usuarioNome');
  localStorage.removeItem('usuarioEmail');
  localStorage.removeItem('usuarioMatricula');
  localStorage.removeItem('cursoAtualId');
  localStorage.removeItem('cursoConcluido');
  window.location.href = 'login.html';
}
