import { db, collection, query, orderBy, onSnapshot } from './firebase-config.js';
import { escapeHtml, formatDate, showToast } from './utils.js';
import { getCurrentUser, logout } from './auth.js';

let allCourses = [];
let userProgress = {};
let currentFilter = 'all';
let searchTerm = '';
let notifications = [];
let unsubscribeCourses = null;
let currentUser = null;

export async function initDashboard() {
  console.log("🚀 Iniciando dashboard...");
  
  // Verificar autenticação de forma segura
  const usuarioAtivo = localStorage.getItem('usuarioAtivo');
  const usuarioAdmin = localStorage.getItem('usuarioAdmin');
  
  console.log("👤 usuarioAtivo:", usuarioAtivo);
  console.log("👑 usuarioAdmin:", usuarioAdmin);
  
  // Se não há nenhum utilizador logado, redirecionar
  if (!usuarioAtivo && !usuarioAdmin) {
    console.log("❌ Nenhum utilizador logado, redirecionando para login");
    window.location.href = 'login.html';
    return;
  }
  
  // Se é admin, redirecionar para admin.html
  if (usuarioAdmin) {
    console.log("👑 É administrador, redirecionando para admin.html");
    window.location.href = 'admin.html';
    return;
  }
  
  // Se é colaborador, prosseguir
  if (!usuarioAtivo) {
    console.log("❌ Utilizador não encontrado, redirecionando");
    window.location.href = 'login.html';
    return;
  }
  
  currentUser = getCurrentUser();
  console.log("👤 Utilizador atual:", currentUser);
  
  if (!currentUser || currentUser.type !== 'colaborador') {
    console.log("❌ Não é colaborador, redirecionando...");
    window.location.href = 'login.html';
    return;
  }
  
  setupUI();
  loadUserProgress();
  loadNotifications();
  await loadCourses();
  setupEventListeners();
  verificarCursoConcluido();
}

function setupUI() {
  const userNameDisplay = document.getElementById('userNameDisplay');
  const userAvatar = document.getElementById('userAvatar');
  const welcomeMessage = document.getElementById('welcomeMessage');
  const profileAvatar = document.getElementById('profileAvatar');
  
  if (userNameDisplay) userNameDisplay.textContent = currentUser.name;
  if (userAvatar) userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
  if (profileAvatar) profileAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
  if (welcomeMessage) welcomeMessage.innerHTML = `Bem-vindo de volta, ${currentUser.name}! 👋`;
}

async function loadCourses() {
  const loadingDiv = document.getElementById('loading');
  const coursesGrid = document.getElementById('coursesGrid');
  
  if (!loadingDiv || !coursesGrid) return;
  
  loadingDiv.style.display = 'block';
  coursesGrid.style.display = 'none';
  
  try {
    unsubscribeCourses = onSnapshot(
      query(collection(db, 'formacoes'), orderBy('dataTimestamp', 'desc')),
      (querySnapshot) => {
        allCourses = [];
        querySnapshot.forEach((doc) => {
          allCourses.push({ id: doc.id, ...doc.data() });
        });
        
        console.log("✅ Formações carregadas:", allCourses.length);
        updateUserStats();
        renderCourses();
        
        loadingDiv.style.display = 'none';
        coursesGrid.style.display = 'grid';
      },
      (error) => {
        console.error('❌ Erro ao carregar formações:', error);
        loadingDiv.innerHTML = '❌ Erro ao carregar formações. <button onclick="location.reload()">Tentar novamente</button>';
      }
    );
  } catch (error) {
    console.error('❌ Erro:', error);
    loadingDiv.innerHTML = '❌ Erro ao carregar formações.';
  }
}

function loadUserProgress() {
  const saved = localStorage.getItem(`progress_${currentUser.name}`);
  if (saved) {
    try {
      userProgress = JSON.parse(saved);
    } catch(e) {
      userProgress = {};
    }
  } else {
    userProgress = {};
  }
}

function saveUserProgress() {
  localStorage.setItem(`progress_${currentUser.name}`, JSON.stringify(userProgress));
}

function calculateCourseProgress(curso) {
  const progress = userProgress[curso.id];
  if (progress?.completed) return 100;
  if (progress?.modulesCompleted) {
    const totalModules = curso.modulos?.length || 1;
    return Math.round((progress.modulesCompleted / totalModules) * 100);
  }
  return 0;
}

function updateUserStats() {
  let completed = 0;
  let inProgress = 0;
  
  allCourses.forEach(curso => {
    const progress = calculateCourseProgress(curso);
    if (progress === 100) completed++;
    else if (progress > 0) inProgress++;
  });
  
  const completedEl = document.getElementById('coursesCompleted');
  const inProgressEl = document.getElementById('coursesInProgress');
  const certificatesEl = document.getElementById('certificatesCount');
  
  if (completedEl) completedEl.textContent = completed;
  if (inProgressEl) inProgressEl.textContent = inProgress;
  if (certificatesEl) certificatesEl.textContent = completed;
}

export function markCourseCompleted(cursoId, cursoNome) {
  if (!userProgress[cursoId]) {
    userProgress[cursoId] = { modulesCompleted: 0, completed: false };
  }
  userProgress[cursoId].completed = true;
  userProgress[cursoId].completedAt = new Date().toISOString();
  
  saveUserProgress();
  updateUserStats();
  renderCourses();
  addNotification(`🎉 Parabéns! Concluiu a formação "${cursoNome}"!`);
}

function loadNotifications() {
  const saved = localStorage.getItem(`notifications_${currentUser.name}`);
  if (saved) {
    try {
      notifications = JSON.parse(saved);
      updateNotificationBadge();
      renderNotifications();
    } catch(e) {
      notifications = [];
    }
  } else {
    notifications = [];
  }
}

function saveNotifications() {
  localStorage.setItem(`notifications_${currentUser.name}`, JSON.stringify(notifications.slice(0, 50)));
}

function addNotification(message) {
  notifications.unshift({
    id: Date.now(),
    message: message,
    time: new Date().toLocaleString('pt-PT'),
    read: false
  });
  
  saveNotifications();
  updateNotificationBadge();
  renderNotifications();
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
  saveNotifications();
  updateNotificationBadge();
  renderNotifications();
};

function filterCourses() {
  let filtered = [...allCourses];
  
  filtered = filtered.filter(curso => {
    const progress = calculateCourseProgress(curso);
    const completed = progress === 100;
    switch(currentFilter) {
      case 'concluidas': return completed;
      case 'em_andamento': return progress > 0 && progress < 100;
      default: return true;
    }
  });
  
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(curso => 
      curso.nome?.toLowerCase().includes(term) ||
      curso.descricao?.toLowerCase().includes(term)
    );
  }
  
  return filtered;
}

function renderCourses() {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;
  
  const filtered = filterCourses();
  
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
    
    return `
      <div class="course-card" onclick="window.entrarFormacao('${curso.id}')">
        <div class="course-cover">
          <i class="fas fa-book-open"></i>
          <span class="course-badge">${escapeHtml(curso.duracao || '30 min')}</span>
        </div>
        <div class="course-body">
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
              <i class="fas fa-check-circle"></i> Concluído
            </div>
          `}
          <div class="btn-start ${btnClass}">${btnText}</div>
        </div>
      </div>
    `;
  }).join('');
}

window.entrarFormacao = (cursoId) => {
  localStorage.setItem('cursoAtualId', cursoId);
  window.location.href = 'formacao_colaborador.html';
};

function verificarCursoConcluido() {
  const cursoConcluido = localStorage.getItem('cursoConcluido');
  if (cursoConcluido) {
    const curso = allCourses.find(c => c.id === cursoConcluido);
    if (curso) {
      markCourseCompleted(cursoConcluido, curso.nome);
    }
    localStorage.removeItem('cursoConcluido');
  }
}

window.openProfileModal = () => {
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const profileSince = document.getElementById('profileSince');
  const modal = document.getElementById('profileModal');
  
  if (profileName) profileName.textContent = currentUser.name;
  if (profileEmail) profileEmail.textContent = `${currentUser.name}@birkenstock.pt`;
  if (profileSince) profileSince.textContent = '2024';
  if (modal) modal.classList.add('show');
};

window.closeProfileModal = () => {
  const modal = document.getElementById('profileModal');
  if (modal) modal.classList.remove('show');
};

window.openCompletedModal = () => {
  const modal = document.getElementById('completedModal');
  const completedList = document.getElementById('completedList');
  
  if (!modal || !completedList) return;
  
  const completedCourses = allCourses.filter(curso => calculateCourseProgress(curso) === 100);
  
  if (completedCourses.length === 0) {
    completedList.innerHTML = '<div style="text-align: center; padding: 40px;">Nenhuma formação concluída ainda.</div>';
  } else {
    completedList.innerHTML = completedCourses.map(curso => `
      <div class="completed-item">
        <div class="completed-icon"><i class="fas fa-check-circle"></i></div>
        <div class="completed-info">
          <div class="completed-title">${escapeHtml(curso.nome)}</div>
          <div class="completed-date">Concluído em ${userProgress[curso.id]?.completedAt ? formatDate(userProgress[curso.id].completedAt) : ''}</div>
        </div>
        <button class="completed-btn" onclick="window.entrarFormacao('${curso.id}')">Ver</button>
      </div>
    `).join('');
  }
  modal.classList.add('show');
};

window.closeCompletedModal = () => {
  const modal = document.getElementById('completedModal');
  if (modal) modal.classList.remove('show');
};

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
