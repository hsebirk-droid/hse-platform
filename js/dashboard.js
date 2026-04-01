import { db, collection, query, orderBy, onSnapshot } from './firebase-config.js';
import { escapeHtml, formatDate, showToast } from './utils.js';
import { getCurrentUser, logout } from './auth.js';

let allCourses = [];
let userProgress = {};
let currentFilter = 'all';
let searchTerm = '';
let currentUser = null;

export async function initDashboard() {
  console.log("🚀 Iniciando dashboard...");
  
  // Verificar autenticação
  const usuarioAtivo = localStorage.getItem('usuarioAtivo');
  const usuarioAdmin = localStorage.getItem('usuarioAdmin');
  
  console.log("📌 usuarioAtivo:", usuarioAtivo);
  console.log("📌 usuarioAdmin:", usuarioAdmin);
  
  // Se não há utilizador logado, redirecionar
  if (!usuarioAtivo && !usuarioAdmin) {
    console.log("❌ Nenhum utilizador logado");
    window.location.href = 'login.html';
    return;
  }
  
  // Se é admin, ir para admin.html
  if (usuarioAdmin) {
    console.log("👑 É admin, redirecionando");
    window.location.href = 'admin.html';
    return;
  }
  
  // Se não tem usuarioAtivo, redirecionar
  if (!usuarioAtivo) {
    console.log("❌ Sem usuarioAtivo");
    window.location.href = 'login.html';
    return;
  }
  
  // Obter dados do utilizador
  currentUser = getCurrentUser();
  console.log("👤 currentUser:", currentUser);
  
  if (!currentUser) {
    console.log("❌ currentUser é null");
    window.location.href = 'login.html';
    return;
  }
  
  // Configurar UI
  const userNameDisplay = document.getElementById('userNameDisplay');
  const userAvatar = document.getElementById('userAvatar');
  const welcomeMessage = document.getElementById('welcomeMessage');
  
  if (userNameDisplay) userNameDisplay.textContent = currentUser.name;
  if (userAvatar) userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
  if (welcomeMessage) welcomeMessage.innerHTML = `Bem-vindo de volta, ${currentUser.name}! 👋`;
  
  // Carregar progresso
  const saved = localStorage.getItem(`progress_${currentUser.name}`);
  if (saved) {
    try {
      userProgress = JSON.parse(saved);
    } catch(e) {
      userProgress = {};
    }
  }
  
  // Carregar formações
  await loadCourses();
  
  // Configurar eventos
  setupEventListeners();
}

async function loadCourses() {
  const loadingDiv = document.getElementById('loading');
  const coursesGrid = document.getElementById('coursesGrid');
  
  if (!loadingDiv || !coursesGrid) return;
  
  loadingDiv.style.display = 'block';
  coursesGrid.style.display = 'none';
  
  try {
    const q = query(collection(db, 'formacoes'), orderBy('dataTimestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      allCourses = [];
      querySnapshot.forEach((doc) => {
        allCourses.push({ id: doc.id, ...doc.data() });
      });
      
      console.log("✅ Formações carregadas:", allCourses.length);
      renderCourses();
      
      loadingDiv.style.display = 'none';
      coursesGrid.style.display = 'grid';
    }, (error) => {
      console.error('❌ Erro:', error);
      loadingDiv.innerHTML = '❌ Erro ao carregar formações. <button onclick="location.reload()">Tentar novamente</button>';
    });
  } catch (error) {
    console.error('❌ Erro:', error);
    loadingDiv.innerHTML = '❌ Erro ao carregar formações.';
  }
}

function calculateCourseProgress(curso) {
  const progress = userProgress[curso.id];
  if (progress?.completed) return 100;
  return 0;
}

function renderCourses() {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;
  
  if (allCourses.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📚</div>
        <h4>Nenhuma formação encontrada</h4>
        <p>Aguarde novas atribuições.</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = allCourses.map(curso => {
    const progress = calculateCourseProgress(curso);
    const completed = progress === 100;
    const modulesCount = curso.modulos?.length || 0;
    
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
            <span><i class="fas fa-question-circle"></i> ${curso.perguntas?.length || 0} questões</span>
          </div>
          <div class="btn-start">📖 Iniciar</div>
        </div>
      </div>
    `;
  }).join('');
}

window.entrarFormacao = (cursoId) => {
  localStorage.setItem('cursoAtualId', cursoId);
  window.location.href = 'formacao_colaborador.html';
};

function setupEventListeners() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Deseja sair da plataforma?')) {
        logout();
      }
    });
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});
function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      renderCourses();
    });
  }
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderCourses();
    });
  });
  
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userDropdown = document.getElementById('userDropdown');
  const notificationBtn = document.getElementById('notificationBtn');
  const notificationsPanel = document.getElementById('notificationsPanel');
  
  if (userMenuBtn) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
      if (notificationsPanel) notificationsPanel.classList.remove('show');
    });
  }
  
  if (notificationBtn) {
    notificationBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (notificationsPanel) notificationsPanel.classList.toggle('show');
      if (userDropdown) userDropdown.classList.remove('show');
    });
  }
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Deseja sair da plataforma?')) {
        logout();
      }
    });
  }
  
  // Fechar dropdowns ao clicar fora
  document.addEventListener('click', (e) => {
    if (userDropdown && !userMenuBtn?.contains(e.target)) {
      userDropdown.classList.remove('show');
    }
    if (notificationsPanel && !notificationBtn?.contains(e.target)) {
      notificationsPanel.classList.remove('show');
    }
  });
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});
