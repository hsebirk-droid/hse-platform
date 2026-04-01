import { db, collection, getDocs } from './firebase-config.js';
import { escapeHtml, showToast } from './utils.js';
import { getCurrentUser, logout } from './auth.js';

let allCourses = [];
let currentUser = null;

// Inicialização principal
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Dashboard iniciado");
  
  // Verificar login
  const usuarioAtivo = localStorage.getItem('usuarioAtivo');
  const usuarioAdmin = localStorage.getItem('usuarioAdmin');
  
  console.log("Usuario ativo:", usuarioAtivo);
  console.log("Admin:", usuarioAdmin);
  
  if (!usuarioAtivo && !usuarioAdmin) {
    window.location.href = 'login.html';
    return;
  }
  
  if (usuarioAdmin) {
    window.location.href = 'admin.html';
    return;
  }
  
  if (!usuarioAtivo) {
    window.location.href = 'login.html';
    return;
  }
  
  // Obter dados do utilizador
  currentUser = getCurrentUser();
  console.log("Utilizador:", currentUser);
  
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }
  
  // Mostrar nome do utilizador
  const userNameDisplay = document.getElementById('userNameDisplay');
  const userAvatar = document.getElementById('userAvatar');
  const welcomeMessage = document.getElementById('welcomeMessage');
  
  if (userNameDisplay) userNameDisplay.textContent = currentUser.name;
  if (userAvatar) userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
  if (welcomeMessage) welcomeMessage.innerHTML = `Bem-vindo de volta, ${currentUser.name}! 👋`;
  
  // Carregar formações
  await carregarFormacoes();
  
  // Configurar botão sair
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Deseja sair?')) {
        logout();
      }
    });
  }
  
  // Configurar botão de perfil
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userDropdown = document.getElementById('userDropdown');
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    });
    
    document.addEventListener('click', () => {
      userDropdown.classList.remove('show');
    });
  }
  
  // Configurar perfil
  window.openProfileModal = () => {
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const modal = document.getElementById('profileModal');
    
    if (profileName) profileName.textContent = currentUser.name;
    if (profileEmail) profileEmail.textContent = `${currentUser.name}@birkenstock.pt`;
    if (modal) modal.classList.add('show');
  };
  
  window.closeProfileModal = () => {
    const modal = document.getElementById('profileModal');
    if (modal) modal.classList.remove('show');
  };
});

// Função para carregar formações
async function carregarFormacoes() {
  const loadingDiv = document.getElementById('loading');
  const coursesGrid = document.getElementById('coursesGrid');
  
  if (!loadingDiv || !coursesGrid) {
    console.error("Elementos não encontrados");
    return;
  }
  
  loadingDiv.style.display = 'block';
  coursesGrid.style.display = 'none';
  loadingDiv.innerHTML = '📚 A carregar formações...';
  
  try {
    console.log("Buscando formações no Firebase...");
    
    const querySnapshot = await getDocs(collection(db, 'formacoes'));
    
    console.log("Total de formações encontradas:", querySnapshot.size);
    
    allCourses = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log("Formação:", data.nome);
      allCourses.push({ id: doc.id, ...data });
    });
    
    // Atualizar estatísticas
    atualizarEstatisticas();
    
    // Mostrar cursos
    mostrarCursos();
    
    loadingDiv.style.display = 'none';
    coursesGrid.style.display = 'grid';
    
  } catch (error) {
    console.error("Erro:", error);
    loadingDiv.innerHTML = `❌ Erro: ${error.message}<br><button onclick="location.reload()">Tentar novamente</button>`;
  }
}

// Função para atualizar estatísticas
function atualizarEstatisticas() {
  const total = allCourses.length;
  const completedEl = document.getElementById('coursesCompleted');
  const inProgressEl = document.getElementById('coursesInProgress');
  
  if (completedEl) completedEl.textContent = total;
  if (inProgressEl) inProgressEl.textContent = 0;
}

// Função para mostrar cursos
function mostrarCursos() {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;
  
  if (allCourses.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📚</div>
        <h4>Nenhuma formação encontrada</h4>
        <p>Não há formações disponíveis no momento.</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = allCourses.map(curso => {
    const modulesCount = curso.modulos?.length || 0;
    const questionsCount = curso.perguntas?.length || 0;
    
    return `
      <div class="course-card" onclick="window.entrarFormacao('${curso.id}')">
        <div class="course-cover">
          <i class="fas fa-book-open"></i>
          <span class="course-badge">${escapeHtml(curso.duracao || '30 min')}</span>
        </div>
        <div class="course-body">
          <div class="course-title">${escapeHtml(curso.nome || 'Formação')}</div>
          <div class="course-desc">${escapeHtml((curso.descricao || 'Curso de formação profissional.').substring(0, 100))}</div>
          <div class="course-meta">
            <span><i class="fas fa-layer-group"></i> ${modulesCount} módulos</span>
            <span><i class="fas fa-question-circle"></i> ${questionsCount} questões</span>
          </div>
          <div class="btn-start">📖 Iniciar</div>
        </div>
      </div>
    `;
  }).join('');
  
  console.log("Cursos mostrados:", allCourses.length);
}

// Função global para entrar na formação
window.entrarFormacao = (cursoId) => {
  console.log("Entrar na formação:", cursoId);
  localStorage.setItem('cursoAtualId', cursoId);
  window.location.href = 'formacao_colaborador.html';
};
