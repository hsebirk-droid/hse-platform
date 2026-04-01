import { db, collection, getDocs, query, where } from './firebase-config.js';

export async function loginColaborador(user, pass) {
  console.log("🔐 Login colaborador:", user);
  
  try {
    const q = query(collection(db, 'colaboradores'), where('user', '==', user.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log("❌ Utilizador não encontrado");
      return false;
    }
    
    let found = false;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.pass === pass) {
        found = true;
        localStorage.setItem('usuarioAtivo', user.toLowerCase().trim());
        localStorage.setItem('usuarioNome', data.user);
      }
    });
    
    return found;
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
  if (admin) return { type: 'admin', name: 'Administrador' };
  if (colaborador) return { type: 'colaborador', name: colaborador };
  return null;
}

export function isAdmin() {
  return localStorage.getItem('usuarioAdmin') !== null;
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
