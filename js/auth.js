import { db, collection, getDocs, query, where } from './firebase-config.js';

export async function loginColaborador(user, pass) {
  console.log("🔐 Tentando login para:", user);
  
  try {
    const q = query(collection(db, 'colaboradores'), where('user', '==', user.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);
    
    console.log("📋 Colaboradores encontrados:", querySnapshot.size);
    
    let found = false;
    let userData = null;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log("👤 Verificando:", data.user, "| Password fornecida:", pass, "| Password guardada:", data.pass);
      
      if (data.pass === pass) {
        found = true;
        userData = data;
        console.log("✅ Login bem-sucedido para:", data.user);
      }
    });
    
    if (found && userData) {
      localStorage.setItem('usuarioAtivo', user.toLowerCase().trim());
      localStorage.setItem('usuarioNome', userData.user);
      localStorage.setItem('usuarioEmail', userData.email || '');
      localStorage.setItem('usuarioMatricula', userData.matricula || '');
      
      console.log("💾 Dados guardados na localStorage");
      return true;
    }
    
    console.log("❌ Login falhou: utilizador ou password incorretos");
    return false;
    
  } catch (error) {
    console.error('❌ Erro no login:', error);
    return false;
  }
}

export function loginAdmin(password) {
  const ADMIN_PASS = 'SSA2024admin';
  console.log("🔐 Tentando login admin...");
  
  if (password === ADMIN_PASS) {
    localStorage.setItem('usuarioAdmin', 'admin');
    localStorage.setItem('usuarioNome', 'Administrador');
    console.log("✅ Login admin bem-sucedido");
    return true;
  }
  
  console.log("❌ Login admin falhou");
  return false;
}

export function getCurrentUser() {
  const colaborador = localStorage.getItem('usuarioAtivo');
  const admin = localStorage.getItem('usuarioAdmin');
  const nome = localStorage.getItem('usuarioNome') || colaborador;
  
  console.log("👤 getCurrentUser - colaborador:", colaborador, "admin:", admin);
  
  if (admin) return { type: 'admin', name: 'Administrador' };
  if (colaborador) return { type: 'colaborador', name: nome || colaborador };
  return null;
}

export function isAdmin() {
  return localStorage.getItem('usuarioAdmin') !== null;
}

export function logout() {
  console.log("🚪 Fazendo logout...");
  localStorage.removeItem('usuarioAtivo');
  localStorage.removeItem('usuarioAdmin');
  localStorage.removeItem('usuarioNome');
  localStorage.removeItem('usuarioEmail');
  localStorage.removeItem('usuarioMatricula');
  localStorage.removeItem('cursoAtualId');
  localStorage.removeItem('cursoConcluido');
  window.location.href = 'login.html';
}
