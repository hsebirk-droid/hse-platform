// ============================================
// DASHBOARD - LÓGICA PRINCIPAL
// ============================================

let allCourses = [];
let userProgress = {};
let currentUser = null;

// Dados de exemplo (em produção, viriam do Firebase)
const FORMACOES_EXAMPLE = [
  {
    id: "1",
    nome: "Atendimento ao Cliente",
    descricao: "Aprenda técnicas de atendimento ao cliente para garantir a satisfação dos consumidores.",
    duracao: "45 minutos",
    icone: "💬",
    modulos: [
      { id: "m1", titulo: "Introdução ao Atendimento" },
      { id: "m2", titulo: "Técnicas de Comunicação" },
      { id: "m3", titulo: "Resolução de Conflitos" }
    ],
    perguntas: [
      { texto: "Qual é a primeira impressão?", opcoes: ["A", "B", "C", "D"], correta: "A" }
    ]
  },
  {
    id: "2",
    nome: "Segurança no Trabalho",
    descricao: "Normas e procedimentos de segurança para o ambiente laboral.",
    duracao: "60 minutos",
    icone: "🛡️",
    modulos: [
      { id: "m1", titulo: "EPI's e sua Utilização" },
      { id: "m2", titulo: "Prevenção de Acidentes" },
      { id: "m3", titulo: "Procedimentos de Emergência" }
    ],
    perguntas: []
  },
  {
    id: "3",
    nome: "Excel Avançado",
    descricao: "Domine as funcionalidades avançadas do Excel para análise de dados.",
    duracao: "90 minutos",
    icone: "📊",
    modulos: [
      { id: "m1", titulo: "Fórmulas Avançadas" },
      { id: "m2", titulo: "Tabelas Dinâmicas" },
      { id: "m3", titulo: "Macros e VBA" },
      { id: "m4", titulo: "Power Query" }
    ],
    perguntas: []
  }
];

export async function initDashboard() {
  console.log("🚀 Iniciando dashboard...");
  
  const usuarioAtivo = localStorage.getItem('usuarioAtivo');
  const usuarioAdmin = localStorage.getItem('usuarioAdmin');
  
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
  
  currentUser = window.getCurrentUser();
  console.log("👤 currentUser:", currentUser);
  
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }
  
  // Configurar UI
  const userNameDisplay = document.getElementById('userNameDisplay');
  const userAvatar = document.getElementById('userAvatar');
  const welcomeMessage = document.getElementById('welcomeMessage');
  const profileAvatar = document.getElementById('profileAvatar');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const profileMatricula = document.getElementById('profileMatricula');
  
  if (userNameDisplay) userNameDisplay.textContent = currentUser.name;
  if (userAvatar) userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
  if (profileAvatar) profileAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
  if (profileName) profileName.textContent = currentUser.name;
  if (profileEmail) profileEmail.textContent = currentUser.email || `${currentUser.name}@birkenstock.pt`;
  if (profileMatricula) profileMatricula.textContent = currentUser.matricula || '—';
  if (welcomeMessage) welcomeMessage.innerHTML = `Bem-vindo de volta, ${currentUser.name.split(' ')[0]}! 👋`;
  
  // Carregar progresso do localStorage
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
  loadingDiv.innerHTML = '📚 A carregar formações...';
  
  // Simular delay de rede
  await new Promise(resolve => setTimeout(resolve, 800));
  
  allCourses = [...FORMACOES_EXAMPLE];
  console.log("✅ Total de formações carregadas:", allCourses.length);
  
  updateUserStats();
  renderCourses();
  
  loadingDiv.style.display = 'none';
  coursesGrid.style.display = 'grid';
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

function renderCourses() {
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
    const progress = calculateCourseProgress(curso);
    const completed = progress === 100;
    const modulesCount = curso.modulos?.length || 0;
    const isStarted = progress > 0 && !completed;
    
    let btnText = '📖 Iniciar';
    let btnClass = '';
    if (completed) {
      btnText = '🎓 Ver Certificado';
      btnClass = 'completed';
    } else if (isStarted) {
      btnText = '▶ Continuar';
      btnClass = 'continue';
    }
    
    return `
      <div class="course-card" onclick="window.entrarFormacao('${curso.id}')">
        <div class="course-cover">
          <span>${curso.icone || '📖'}</span>
          <span class="course-badge">${curso.duracao || '30 min'}</span>
        </div>
        <div class="course-body">
          <div class="course-title">${window.escapeHtml(curso.nome)}</div>
          <div class="course-desc">${window.escapeHtml((curso.descricao || 'Curso de formação profissional.').substring(0, 100))}${curso.descricao?.length > 100 ? '...' : ''}</div>
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

function renderCoursesFiltered(filtered) {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;
  
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h4>Nenhuma formação encontrada</h4>
        <p>Tente outro filtro ou pesquisa.</p>
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
      btnClass = 'completed';
    } else if (isStarted) {
      btnText = '▶ Continuar';
      btnClass = 'continue';
    }
    
    return `
      <div class="course-card" onclick="window.entrarFormacao('${curso.id}')">
        <div class="course-cover">
          <span>${curso.icone || '📖'}</span>
          <span class="course-badge">${curso.duracao || '30 min'}</span>
        </div>
        <div class="course-body">
          <div class="course-title">${window.escapeHtml(curso.nome)}</div>
          <div class="course-desc">${window.escapeHtml((curso.descricao || 'Curso de formação profissional.').substring(0, 100))}</div>
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
  window.location.href = 'formacao.html';
};

window.openProfileModal = () => {
  const modal = document.getElementById('profileModal');
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
          <div class="completed-title">${window.escapeHtml(curso.nome)}</div>
          <div class="completed-date">Concluído em ${userProgress[curso.id]?.completedAt || new Date().toLocaleDateString('pt-PT')}</div>
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
      renderCoursesFiltered(filtered);
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
      
      renderCoursesFiltered(filtered);
    });
  });
  
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userDropdown = document.getElementById('userDropdown');
  
  if (userMenuBtn) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (userDropdown) userDropdown.classList.toggle('show');
    });
  }
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Deseja sair da plataforma?')) {
        window.logout();
      }
    });
  }
  
  document.addEventListener('click', () => {
    if (userDropdown) userDropdown.classList.remove('show');
  });
  
  console.log("✅ Event listeners configurados");
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});