import { db, collection, getDocs, query, where } from './firebase-config.js';

// Login do colaborador
export async function loginColaborador(user, pass) {
  console.log("🔐 Tentando login para:", user);
  
  try {
    // Verificar se o Firebase está acessível
    if (!db) {
      console.error("❌ Firebase não inicializado");
      return false;
    }
    
    // Buscar colaborador pelo nome de utilizador (case insensitive)
    const userLower = user.toLowerCase().trim();
    const q = query(collection(db, 'colaboradores'), where('user', '==', userLower));
    const querySnapshot = await getDocs(q);
    
    console.log("📋 Colaboradores encontrados:", querySnapshot.size);
    
    if (querySnapshot.empty) {
      console.log("❌ Nenhum colaborador encontrado com o nome:", userLower);
      return false;
    }
    
    let found = false;
    let userData = null;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log("👤 Verificando colaborador:", data.user);
      console.log("   Password fornecida:", pass);
      console.log("   Password guardada:", data.pass);
      console.log("   Comparação:", data.pass === pass ? "✅ IGUAL" : "❌ DIFERENTE");
      
      if (data.pass === pass) {
        found = true;
        userData = data;
        console.log("✅ Login bem-sucedido para:", data.user);
      }
    });
    
    if (found && userData) {
      // Guardar na localStorage
      localStorage.setItem('usuarioAtivo', userLower);
      localStorage.setItem('usuarioNome', userData.user);
      localStorage.setItem('usuarioEmail', userData.email || '');
      localStorage.setItem('usuarioMatricula', userData.matricula || '');
      
      console.log("💾 Dados guardados na localStorage");
      return true;
    }
    
    console.log("❌ Login falhou: password incorreta para o utilizador:", userLower);
    return false;
    
  } catch (error) {
    console.error('❌ Erro no login:', error);
    console.error('Detalhes do erro:', error.message);
    return false;
  }
}

// Login do administrador (password hardcoded, não visível na interface)
export function loginAdmin(password) {
  // A password está apenas no código, não é mostrada na interface
  const ADMIN_PASS = 'SSA2024admin';
  console.log("🔐 Tentando login admin...");
  
  if (password === ADMIN_PASS) {
    localStorage.setItem('usuarioAdmin', 'admin');
    localStorage.setItem('usuarioNome', 'Administrador');
    console.log("✅ Login admin bem-sucedido");
    return true;
  }
  
  console.log("❌ Login admin falhou - password incorreta");
  return false;
}

// Obter utilizador atual
export function getCurrentUser() {
  const colaborador = localStorage.getItem('usuarioAtivo');
  const admin = localStorage.getItem('usuarioAdmin');
  const nome = localStorage.getItem('usuarioNome') || colaborador;
  
  console.log("👤 getCurrentUser - colaborador:", colaborador, "admin:", admin);
  
  if (admin) return { type: 'admin', name: 'Administrador' };
  if (colaborador) return { type: 'colaborador', name: nome || colaborador };
  return null;
}

// Verificar se é admin
export function isAdmin() {
  return localStorage.getItem('usuarioAdmin') !== null;
}

// Logout
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
