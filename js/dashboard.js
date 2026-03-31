import { db, collection, query, orderBy, onSnapshot } from './firebase-config.js';
import { escapeHtml, formatDate, showToast, checkAuth } from './utils.js';
import { getCurrentUser, logout } from './auth.js';

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let allCourses = [];
let userProgress = {};
let currentFilter = 'all';
let searchTerm = '';
let notifications = [];
let unsubscribeCourses = null;

// ============================================
// INICIALIZAÇÃO
// ============================================

export async function initDashboard() {
  console.log("🚀 Iniciando dashboard...");
  
  // Verificar autenticação
  if (!checkAuth()) return;
  
  const user = getCurrentUser();
  console.log("👤 Utilizador:", user);
  
  if (!user || user.type !== 'colaborador') {
    console.log("❌ Não é colaborador, redirecionando...");
    window.location.href = 'login.html';
    return;
  }
  
  // Configurar UI com nome do utilizador
  const userNameDisplay = document.getElementById('userNameDisplay');
  const userAvatar = document.getElementById('userAvatar');
  const welcomeMessage = document.getElementById('welcomeMessage');
  
  if (userNameDisplay) userNameDisplay.textContent = user.name;
  if (userAvatar) userAvatar.textContent = user.name.charAt(0).toUpperCase();
  if (welcomeMessage) welcomeMessage.innerHTML = `Bem-vindo de volta, ${user.name}! 👋`;
  
  // Configurar event listeners
  setupEventListeners();
  
  // Carregar progresso
  loadUserProgress();
  
  // Carregar formações
  await loadCourses();
  
  // Verificar se há curso concluído para marcar
  verificarCursoConcluido();
}

// ============================================
// CARREGAR FORMAÇÕES EM TEMPO REAL
// ============================================

async function loadCourses() {
  const loadingDiv = document.getElementById('loading');
  const coursesGrid = document.getElementById('coursesGrid');
  
  if (!loadingDiv || !coursesGrid) {
    console.error("❌ Elementos do DOM não encontrados");
    return;
  }
  
  loadingDiv.style.display = 'block';
  coursesGrid.style.display = 'none';
  
  try {
    console.log("📡 A conectar ao Firebase...");
    
    // Usar onSnapshot para atualizações em tempo real
    unsubscribeCourses = onSnapshot(
      query(collection(db, 'formacoes'), orderBy('dataTimestamp', 'desc')),
      (querySnapshot) => {
        console.log("✅ Formações recebidas:", querySnapshot.size);
        
        allCourses = [];
        querySnapshot.forEach((doc) => {
          allCourses.push({ id: doc.id, ...doc.data() });
        });
        
        console.log("📚 Total de formações carregadas:", allCourses.length);
        
        // Atualizar estatísticas e renderizar
        updateUserStats();
        renderCourses();
        
        // Esconder loading e mostrar grid
        loadingDiv.style.display = 'none';
        coursesGrid.style.display = 'grid';
        
        // Notificação de boas-vindas (apenas uma vez)
        const user = getCurrentUser();
        if (user && !localStorage.getItem(`welcome_${user.name}`)) {
          addNotification(`Bem-vindo à plataforma de formação! Explore os cursos disponíveis.`);
          localStorage.setItem(`welcome_${user.name}`, 'true');
        }
      },
      (error) => {
        console.error('❌ Erro ao carregar formações:', error);
        loadingDiv.innerHTML = '❌ Erro ao carregar formações. <button onclick="location.reload()">Tentar novamente</button>';
      }
    );
    
  } catch (error) {
    console.error('❌ Erro:', error);
    loadingDiv.innerHTML = '❌ Erro ao carregar formações. <button onclick="location.reload()">Tentar novamente</button>';
  }
}

// ============================================
// PROGRESSO DO UTILIZADOR
// ============================================

function loadUserProgress() {
  const user = getCurrentUser();
  if (!user) return;
  
  const saved = localStorage.getItem(`progress_${user.name}`);
  if (saved) {
    try {
      userProgress = JSON.parse(saved);
      console.log("📊 Progresso carregado:", userProgress);
    } catch(e) {
      console.error("Erro ao carregar progresso:", e);
      userProgress = {};
    }
  } else {
    userProgress = {};
    console.log("📊 Sem progresso salvo");
  }
}

function saveUserProgress() {
  const user = getCurrentUser();
  if (!user) return;
  
  localStorage.setItem(`progress_${user.name}`, JSON.stringify(userProgress));
  console.log("💾 Progresso salvo");
}

// ============================================
// ESTATÍSTICAS
// ============================================

function updateUserStats() {
  let completed = 0;
  let inProgress = 0;
  
  allCourses.forEach(curso => {
    const progress = userProgress[curso.id];
    if (progress && progress.completed === true) {
      completed++;
    } else if (progress && progress.modulesCompleted > 0) {
      inProgress++;
    }
  });
  
  const coursesCompletedEl = document.getElementById('coursesCompleted');
  const coursesInProgressEl = document.getElementById('coursesInProgress');
  const certificatesCountEl = document.getElementById('certificatesCount');
  
  if (coursesCompletedEl) coursesCompletedEl.textContent = completed;
  if (coursesInProgressEl) coursesInProgressEl.textContent = inProgress;
  if (certificatesCountEl) certificatesCountEl.textContent = completed;
  
  console.log(`📊 Estatísticas: ${completed} concluídas, ${inProgress} em andamento`);
}

// ============================================
// CÁLCULO DE PROGRESSO
// ============================================

function calculateCourseProgress(curso) {
  const progress = userProgress[curso.id];
  if (progress && progress.completed) return 100;
  if (progress && progress.modulesCompleted) {
    const totalModules = curso.modulos?.length || 1;
    return Math.round((progress.modulesCompleted / totalModules) * 100);
  }
  return 0;
}

function isCourseCompleted(cursoId) {
  const progress = userProgress[cursoId];
  return progress && progress.completed === true;
}

export function markCourseCompleted(cursoId, cursoNome) {
  console.log("🏆 Marcando curso como concluído:", cursoId, cursoNome);
  
  if (!userProgress[cursoId]) {
    userProgress[cursoId] = { modulesCompleted: 0, completed: false };
  }
  userProgress[cursoId].completed = true;
  userProgress[cursoId].completedAt = new Date().toISOString();
  
  saveUserProgress();
  renderCourses();
  updateUserStats();
  addNotification(`🎉 Parabéns! Concluiu a formação "${cursoNome}"!`);
}

// ============================================
// NOTIFICAÇÕES
// ============================================

function addNotification(message) {
  notifications.unshift({
    id: Date.now(),
    message: message,
    time: new Date().toLocaleString('pt-PT'),
    read: false
  });
  
  // Manter apenas últimas 50 notificações
  if (notifications.length > 50) notifications.pop();
  
  updateNotificationBadge();
  renderNotifications();
  
  // Guardar notificações
  const user = getCurrentUser();
  if (user) {
    localStorage.setItem(`notifications_${user.name}`, JSON.stringify(notifications));
  }
}

function updateNotificationBadge() {
  const unread = notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notificationBadge');
  if (badge) {
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';
  }
}

function renderNotifications() {
  const container = document.getElementById('notificationsList');
  if (!container) return;
  
  if (notifications.length === 0) {
    container.innerHTML = '<div class="notification-item">Sem notificações</div>';
    return;
  }
  
  container.innerHTML = notifications.slice(0, 10).map(n => `
    <div class="notification-item" onclick="window.markNotificationRead(${n.id})">
      <div class="notification-title">${escapeHtml(n.message)}</div>
      <div class="notification-time">${escapeHtml(n.time)}</div>
    </div>
  `).join('');
}

window.markNotificationRead = (id) => {
  const notification = notifications.find(n => n.id === id);
  if (notification) notification.read = true;
  updateNotificationBadge();
  renderNotifications();
};

function loadNotifications() {
  const user = getCurrentUser();
  if (!user) return;
  
  const saved = localStorage.getItem(`notifications_${user.name}`);
  if (saved) {
    try {
      notifications = JSON.parse(saved);
      updateNotificationBadge();
      renderNotifications();
    } catch(e) {
      console.error("Erro ao carregar notificações:", e);
    }
  }
}

// ============================================
// FILTROS E PESQUISA
// ============================================

function filterCourses() {
  let filtered = [...allCourses];
  
  // Aplicar filtro por status
  filtered = filtered.filter(curso => {
    const progress = calculateCourseProgress(curso);
    const completed = progress === 100;
    switch(currentFilter) {
      case 'concluidas': return completed;
      case 'em_andamento': return progress > 0 && progress < 100;
      default: return true;
    }
  });
  
  // Aplicar pesquisa
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(curso => 
      curso.nome?.toLowerCase().includes(term) ||
      curso.descricao?.toLowerCase().includes(term)
    );
  }
  
  return filtered;
}

// ============================================
// RENDERIZAR CURSOS
// ============================================

function renderCourses() {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;
  
  const filtered = filterCourses();
  console.log(`🎨 Renderizando ${filtered.length} cursos (total: ${allCourses.length})`);
  
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📚</div>
        <h4>Nenhuma formação encontrada</h4>
        <p>Tente ajustar os filtros ou aguarde novas atribuições.</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = filtered.map(curso => {
    const progress = calculateCourseProgress(curso);
    const completed = progress === 100;
    const modulesCount = curso.modulos?.length || 0;
    const isStarted = progress > 0 && !completed;
    
    let btnText = '📖 Iniciar';
    let btnClass = '';
    if (completed) {
      btnText = '🎓 Ver Certificado';
      btnClass = 'btn-completed';
    } else if (isStarted) {
      btnText = '▶ Continuar';
      btnClass = 'btn-continue';
    }
    
    // Determinar ícone da capa
    let iconClass = 'book-open';
    if (curso.categoria === 'video') iconClass = 'video';
    if (curso.categoria === 'documento') iconClass = 'file-alt';
    
    return `
      <div class="course-card" onclick="window.entrarFormacao('${curso.id}')">
        <div class="course-cover">
          <i class="fas fa-${iconClass}"></i>
          <span class="course-badge">${escapeHtml(curso.duracao || '30 min')}</span>
        </div>
        <div class="course-body">
          <div class="course-category">${escapeHtml(curso.categoria || 'Formação')}</div>
          <div class="course-title">${escapeHtml(curso.nome || 'Formação')}</div>
          <div class="course-desc">${escapeHtml((curso.descricao || 'Curso de formação profissional.').substring(0, 100))}${curso.descricao?.length > 100 ? '...' : ''}</div>
          <div class="course-meta">
            <span><i class="fas fa-layer-group"></i> ${modulesCount} módulos</span>
            <span><i class="fas fa-question-circle"></i> ${curso.perguntas?.length || 0} questões</span>
          </div>
          ${!completed ? `
            <div class="course-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
              </div>
              <div class="progress-text">${progress}% concluído</div>
            </div>
          ` : `
            <div style="margin-top: 12px; color: var(--success); font-size: 12px;">
              <i class="fas fa-check-circle"></i> Concluído em ${userProgress[curso.id]?.completedAt ? formatDate(userProgress[curso.id].completedAt) : ''}
            </div>
          `}
          <div class="btn-start ${btnClass}">
            ${btnText}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// NAVEGAÇÃO
// ============================================

window.entrarFormacao = (cursoId) => {
  console.log("🎓 Entrando na formação:", cursoId);
  localStorage.setItem('cursoAtualId', cursoId);
  window.location.href = 'formacao_colaborador.html';
};

function verificarCursoConcluido() {
  const cursoConcluido = localStorage.getItem('cursoConcluido');
  if (cursoConcluido) {
    console.log("🎓 Curso concluído detectado:", cursoConcluido);
    const curso = allCourses.find(c => c.id === cursoConcluido);
    if (curso) {
      markCourseCompleted(cursoConcluido, curso.nome);
    } else {
      markCourseCompleted(cursoConcluido, 'Formação');
    }
    localStorage.removeItem('cursoConcluido');
  }
}

// ============================================
// MODAIS
// ============================================

window.openProfileModal = () => {
  const user = getCurrentUser();
  if (!user) return;
  
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const profileSince = document.getElementById('profileSince');
  const profileModal = document.getElementById('profileModal');
  
  if (profileName) profileName.textContent = user.name;
  if (profileEmail) profileEmail.textContent = `${user.name}@birkenstock.pt`;
  if (profileSince) profileSince.textContent = '2024';
  if (profileModal) profileModal.classList.add('show');
};

window.closeProfileModal = () => {
  const modal = document.getElementById('profileModal');
  if (modal) modal.classList.remove('show');
};

window.openCompletedModal = () => {
  const modal = document.getElementById('completedModal');
  const completedList = document.getElementById('completedList');
  
  if (!modal || !completedList) return;
  
  const completedCourses = allCourses.filter(curso => isCourseCompleted(curso.id));
  
  if (completedCourses.length === 0) {
    completedList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--birkenstock-gray);">Nenhuma formação concluída ainda.</div>';
  } else {
    completedList.innerHTML = completedCourses.map(curso => `
      <div style="display: flex; align-items: center; gap: 16px; padding: 12px; border-bottom: 1px solid var(--border);">
        <div style="width: 40px; height: 40px; background: var(--success-bg); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
          <i class="fas fa-check-circle" style="color: var(--success); font-size: 20px;"></i>
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 600;">${escapeHtml(curso.nome)}</div>
          <div style="font-size: 12px; color: var(--birkenstock-gray);">Concluído em ${userProgress[curso.id]?.completedAt ? formatDate(userProgress[curso.id].completedAt) : ''}</div>
        </div>
        <button onclick="window.entrarFormacao('${curso.id}')" style="background: var(--birkenstock-blue); color: white; border: none; padding: 6px 16px; border-radius: 20px; cursor: pointer;">Ver</button>
      </div>
    `).join('');
  }
  modal.classList.add('show');
};

window.closeCompletedModal = () => {
  const modal = document.getElementById('completedModal');
  if (modal) modal.classList.remove('show');
};

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      renderCourses();
    });
  }
  
  // Filter buttons
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderCourses();
    });
  });
  
  // User dropdown
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userDropdown = document.getElementById('userDropdown');
  const notificationBtn = document.getElementById('notificationBtn');
  const notificationsPanel = document.getElementById('notificationsPanel');
  
  if (userMenuBtn) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (userDropdown) userDropdown.classList.toggle('show');
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
  
  // Fechar dropdowns ao clicar fora
  document.addEventListener('click', () => {
    if (userDropdown) userDropdown.classList.remove('show');
    if (notificationsPanel) notificationsPanel.classList.remove('show');
  });
  
  // Logout button
  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Deseja sair da plataforma?')) {
        logout();
      }
    });
  }
}

// ============================================
// INICIAR
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log("📄 Dashboard carregado");
  initDashboard();
});

// Exportar funções globais
window.entrarFormacao = entrarFormacao;
window.markNotificationRead = markNotificationRead;
