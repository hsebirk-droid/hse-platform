import { db, collection, query, orderBy, getDocs } from './firebase-config.js';
import { escapeHtml, formatDate, showToast } from './utils.js';
import { getCurrentUser, logout } from './auth.js';

let allCourses = [];
let userProgress = {};
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
  const profileAvatar = document.getElementById('profileAvatar');
  
  if (userNameDisplay) userNameDisplay.textContent = currentUser.name;
  if (userAvatar) userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
  if (profileAvatar) profileAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
  if (welcomeMessage) welcomeMessage.innerHTML = `Bem-vindo de volta, ${currentUser.name}! 👋`;
  
  // Carregar progresso
  const saved = localStorage.getItem(`progress_${currentUser.name}`);
  if (saved) {
    try {
      userProgress = JSON.parse(saved);
      console.log("📊 Progresso carregado:", userProgress);
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
  
  if (!loadingDiv || !coursesGrid) {
    console.error("❌ Elementos não encontrados no DOM");
    return;
  }
  
  loadingDiv.style.display = 'block';
  coursesGrid.style.display = 'none';
  loadingDiv.innerHTML = '📚 A carregar formações...';
  
  try {
    console.log("🔍 Buscando formações no Firebase...");
    
    const q = query(collection(db, 'formacoes'), orderBy('dataTimestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    console.log("📋 QuerySnapshot size:", querySnapshot.size);
    
    allCourses = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log("📘 Formação encontrada:", data.nome);
      allCourses.push({ id: doc.id, ...data });
    });
    
    console.log("✅ Total de formações carregadas:", allCourses.length);
    
    // Atualizar estatísticas
    updateUserStats();
    
    // Renderizar cursos
    renderCourses();
    
    loadingDiv.style.display = 'none';
    coursesGrid.style.display = 'grid';
    
  } catch (error) {
    console.error('❌ Erro ao carregar formações:', error);
    loadingDiv.innerHTML = `❌ Erro ao carregar formações: ${error.message}<br><button onclick="location.reload()" style="margin-top:10px; padding:8px 16px; background:#00338D; color:white; border:none; border-radius:8px; cursor:pointer;">Tentar novamente</button>`;
  }
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
  
  console.log("📊 Estatísticas atualizadas - Concluídas:", completed, "Em andamento:", inProgress);
}

function renderCourses() {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;
  
  console.log("🎨 Renderizando cursos. Total:", allCourses.length);
  
  if (allCourses.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📚</div>
        <h4>Nenhuma formação encontrada</h4>
        <p>Não há formações disponíveis no momento. Aguarde novas atribuições.</p>
        <p style="margin-top: 16px; font-size: 12px; color: #666;">Contacte o RH se acha que isto é um erro.</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = allCourses.map(curso => {
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
  
  console.log("✅ Cursos renderizados com sucesso");
}

function renderCoursesFiltered(filtered) {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;
  
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
          <div class="course-desc">${escapeHtml((curso.descricao || 'Curso de formação profissional.').substring(0, 100))}</div>
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
  console.log("🎓 Entrando na formação:", cursoId);
  localStorage.setItem('cursoAtualId', cursoId);
  window.location.href = 'formacao_colaborador.html';
};

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
  console.log("🔧 Configurando event listeners...");
  
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = allCourses.filter(curso => 
        curso.nome?.toLowerCase().includes(term) ||
        curso.descricao?.toLowerCase().includes(term)
      );
      const grid = document.getElementById('coursesGrid');
      if (grid && filtered.length !== allCourses.length) {
        if (filtered.length === 0) {
          grid.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">🔍</div>
              <h4>Nenhuma formação encontrada</h4>
              <p>Tente outra pesquisa.</p>
            </div>
          `;
        } else {
          renderCoursesFiltered(filtered);
        }
      } else if (grid) {
        renderCourses();
      }
    });
  }
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      let filtered = [...allCourses];
      
      if (filter === 'concluidas') {
        filtered = filtered.filter(curso => calculateCourseProgress(curso) === 100);
      } else if (filter === 'em_andamento') {
        filtered = filtered.filter(curso => {
          const p = calculateCourseProgress(curso);
          return p > 0 && p < 100;
        });
      }
      
      const grid = document.getElementById('coursesGrid');
      if (grid) {
        if (filtered.length === 0) {
          grid.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">📚</div>
              <h4>Nenhuma formação neste filtro</h4>
              <p>Tente outro filtro.</p>
            </div>
          `;
        } else {
          renderCoursesFiltered(filtered);
        }
      }
    });
  });
  
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userDropdown = document.getElementById('userDropdown');
  const notificationBtn = document.getElementById('notificationBtn');
  const notificationsPanel = document.getElementById('notificationsPanel');
  
  if (userMenuBtn) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (userDropdown) userDropdown.classList.toggle('show');
      if (notificationsPanel) notificationsPanel?.classList.remove('show');
    });
  }
  
  if (notificationBtn) {
    notificationBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (notificationsPanel) notificationsPanel.classList.toggle('show');
      if (userDropdown) userDropdown?.classList.remove('show');
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
  
  document.addEventListener('click', () => {
    if (userDropdown) userDropdown?.classList.remove('show');
    if (notificationsPanel) notificationsPanel?.classList.remove('show');
  });
  
  console.log("✅ Event listeners configurados");
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});
