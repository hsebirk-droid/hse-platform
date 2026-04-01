// ============================================
// AUTH - GESTÃO DE AUTENTICAÇÃO
// ============================================

// Dados de exemplo (em produção, viriam do Firebase)
const COLABORADORES_EXAMPLE = [
  { user: "joao.silva", pass: "123456", nome: "João Silva", email: "joao.silva@birkenstock.pt", matricula: "001" },
  { user: "maria.santos", pass: "123456", nome: "Maria Santos", email: "maria.santos@birkenstock.pt", matricula: "002" },
  { user: "pedro.oliveira", pass: "123456", nome: "Pedro Oliveira", email: "pedro.oliveira@birkenstock.pt", matricula: "003" }
];

const ADMIN_PASS = "SSA2024admin";

export async function loginColaborador(user, pass) {
  console.log("🔐 Login colaborador:", user);
  
  if (!user || !pass) {
    console.log("❌ Utilizador ou password vazios");
    return false;
  }
  
  // Simular delay de rede
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const found = COLABORADORES_EXAMPLE.find(c => 
    c.user === user.toLowerCase().trim() && c.pass === pass
  );
  
  if (found) {
    localStorage.setItem('usuarioAtivo', user.toLowerCase().trim());
    localStorage.setItem('usuarioNome', found.nome);
    localStorage.setItem('usuarioEmail', found.email);
    localStorage.setItem('usuarioMatricula', found.matricula);
    console.log("✅ Login bem sucedido para:", found.nome);
    return true;
  }
  
  console.log("❌ Utilizador ou password incorretos");
  return false;
}

export function loginAdmin(password) {
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

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.loginColaborador = loginColaborador;
  window.loginAdmin = loginAdmin;
  window.getCurrentUser = getCurrentUser;
  window.isAdmin = isAdmin;
  window.isAuthenticated = isAuthenticated;
  window.logout = logout;
}