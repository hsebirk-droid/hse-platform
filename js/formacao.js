// ============================================
// FORMAÇÃO - LÓGICA PRINCIPAL
// ============================================

let modules = [];
let perguntas = [];
let completedModules = {};
let quizPassed = false;
let cursoId = null;
let nomeUser = '';
let cursoData = {};

// Dados de exemplo (em produção, viriam do Firebase/Storage)
const FORMACOES_DATA = {
  "1": {
    nome: "Atendimento ao Cliente",
    duracao: "45 minutos",
    descricao: "Aprenda técnicas de atendimento ao cliente para garantir a satisfação dos consumidores.",
    modulos: [
      { id: "m1", titulo: "Introdução ao Atendimento", tipo: "video", conteudo: { url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, duracao: "10 min" },
      { id: "m2", titulo: "Técnicas de Comunicação", tipo: "texto", conteudo: { texto: "<p>A comunicação eficaz é fundamental para um bom atendimento. Escute ativamente o cliente, demonstre empatia e seja claro nas respostas.</p><p>Principais técnicas:</p><ul><li>Escuta ativa</li><li>Linguagem corporal positiva</li><li>Clareza na mensagem</li><li>Empatia</li></ul>" }, duracao: "15 min" },
      { id: "m3", titulo: "Resolução de Conflitos", tipo: "video", conteudo: { url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, duracao: "12 min" }
    ],
    perguntas: [
      { id: "p1", texto: "Qual é a primeira impressão num atendimento?", opcoes: ["Olhar nos olhos", "Sorriso", "Postura correta", "Todas as anteriores"], correta: "D" },
      { id: "p2", texto: "O que é escuta ativa?", opcoes: ["Falar mais que o cliente", "Interromper o cliente", "Prestar atenção e demonstrar interesse", "Ignorar as reclamações"], correta: "C" }
    ]
  },
  "2": {
    nome: "Segurança no Trabalho",
    duracao: "60 minutos",
    descricao: "Normas e procedimentos de segurança para o ambiente laboral.",
    modulos: [
      { id: "m1", titulo: "EPI's e sua Utilização", tipo: "video", conteudo: { url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, duracao: "20 min" },
      { id: "m2", titulo: "Prevenção de Acidentes", tipo: "texto", conteudo: { texto: "<p>A prevenção de acidentes começa com a identificação de riscos. Mantenha o local de trabalho organizado, utilize os EPIs corretamente e siga os procedimentos de segurança.</p><p>Regras básicas:</p><ul><li>Use sempre os EPIs adequados</li><li>Mantenha a área de trabalho limpa</li><li>Comunique situações de risco</li><li>Participe dos treinamentos</li></ul>" }, duracao: "15 min" }
    ],
    perguntas: [
      { id: "p1", texto: "O que significa EPI?", opcoes: ["Equipamento de Proteção Individual", "Equipamento de Proteção Integral", "Equipamento de Prevenção de Incidentes", "Equipamento de Proteção Industrial"], correta: "A" }
    ]
  }
};

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

export async function initFormacao() {
  console.log("🚀 Iniciando página de formação...");
  
  const tokenData = lerTokenUrl();
  
  if (tokenData && tokenData.user && tokenData.cursoId) {
    console.log("🔑 Token válido encontrado para:", tokenData.user);
    
    if (tokenData.prazo && !validarPrazo(tokenData.prazo)) {
      window.showToast('❌ Este link expirou. Contacte o RH.');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 2000);
      return;
    }
    
    localStorage.setItem('usuarioAtivo', tokenData.user);
    nomeUser = tokenData.user;
    
    const userNameDisplay = document.getElementById('user-name-display');
    if (userNameDisplay) userNameDisplay.textContent = nomeUser;
    
    if (tokenData.prazo) {
      const prazoElement = document.getElementById('prazo-data');
      if (prazoElement) prazoElement.textContent = tokenData.prazo;
    }
    
    await carregarFormacao(tokenData.cursoId);
    return;
  }
  
  console.log("🔍 Sem token, verificando sessão normal...");
  
  if (!window.checkAuth()) return;
  
  const user = window.getCurrentUser();
  if (!user || user.type !== 'colaborador') {
    window.location.href = 'login.html';
    return;
  }
  
  nomeUser = user.name;
  const userNameDisplay = document.getElementById('user-name-display');
  if (userNameDisplay) userNameDisplay.textContent = nomeUser;
  
  const cursoIdStorage = localStorage.getItem('cursoAtualId');
  if (cursoIdStorage) {
    await carregarFormacao(cursoIdStorage);
  } else {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.innerHTML = '❌ Nenhuma formação selecionada. <a href="dashboard.html">Voltar</a>';
  }
}

function lerTokenUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (!token) return null;
  
  try {
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = atob(base64);
    const data = JSON.parse(decoded);
    return data;
  } catch(e) {
    console.error('❌ Erro ao decodificar token:', e);
    return null;
  }
}

function validarPrazo(prazoStr) {
  if (!prazoStr) return true;
  
  try {
    const partes = prazoStr.split('/');
    if (partes.length === 3) {
      const prazoDate = new Date(partes[2], partes[1] - 1, partes[0]);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      return prazoDate >= hoje;
    }
    return true;
  } catch(e) {
    console.error('Erro ao validar prazo:', e);
    return true;
  }
}

// ============================================
// CARREGAR FORMAÇÃO
// ============================================

async function carregarFormacao(id) {
  const loadingDiv = document.getElementById('loading');
  const modulesContainer = document.getElementById('modules-container');
  
  if (!loadingDiv || !modulesContainer) return;
  
  loadingDiv.style.display = 'block';
  modulesContainer.style.display = 'none';
  
  if (!id) {
    loadingDiv.innerHTML = '❌ Nenhuma formação selecionada. <a href="dashboard.html">Voltar</a>';
    return;
  }
  
  cursoId = id;
  console.log("📚 Carregando formação ID:", id);
  
  // Simular delay de rede
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const data = FORMACOES_DATA[id];
  
  if (data) {
    cursoData = {
      nome: data.nome,
      duracao: data.duracao,
      descricao: data.descricao
    };
    modules = data.modulos || [];
    perguntas = data.perguntas || [];
    
    console.log("✅ Formação carregada:", cursoData.nome);
    
    carregarProgresso();
    
    const heroTitle = document.getElementById('hero-title');
    const heroDesc = document.getElementById('hero-desc');
    const metaDuration = document.getElementById('meta-duration');
    const metaModules = document.getElementById('meta-modules');
    
    if (heroTitle) heroTitle.textContent = cursoData.nome;
    if (heroDesc) heroDesc.textContent = cursoData.descricao;
    if (metaDuration) metaDuration.textContent = cursoData.duracao;
    if (metaModules) metaModules.textContent = modules.length + ' módulos';
    
    loadingDiv.style.display = 'none';
    modulesContainer.style.display = 'block';
    
    renderModules();
    updateProgress();
  } else {
    loadingDiv.innerHTML = '❌ Formação não encontrada. <a href="dashboard.html">Voltar</a>';
  }
}

// ============================================
// PROGRESSO
// ============================================

function carregarProgresso() {
  const storageKey = `progresso_${cursoId}_${nomeUser}`;
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      const progress = JSON.parse(saved);
      completedModules = progress.completedModules || {};
      quizPassed = progress.quizPassed || false;
    } catch(e) {
      console.error('Erro ao carregar progresso:', e);
      completedModules = {};
      quizPassed = false;
    }
  }
}

function salvarProgresso() {
  const progress = {
    completedModules: completedModules,
    quizPassed: quizPassed,
    dataAtualizacao: new Date().toISOString()
  };
  const storageKey = `progresso_${cursoId}_${nomeUser}`;
  localStorage.setItem(storageKey, JSON.stringify(progress));
}

function updateProgress() {
  const total = modules.length + (perguntas.length > 0 ? 1 : 0);
  let done = modules.filter(m => completedModules[String(m.id)]).length;
  if (quizPassed) done++;
  const pct = Math.round((done / total) * 100);
  
  const progFill = document.getElementById('prog-fill');
  const progressText = document.getElementById('progress-text');
  
  if (progFill) progFill.style.width = pct + '%';
  if (progressText) progressText.textContent = pct + '%';
  
  salvarProgresso();
}

// ============================================
// RENDERIZAR MÓDULOS
// ============================================

function renderModules() {
  const container = document.getElementById('modules-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  modules.forEach((module, idx) => {
    const moduleIdStr = String(module.id);
    const isCompleted = completedModules[moduleIdStr];
    const isLocked = idx > 0 && !completedModules[String(modules[idx-1]?.id)];
    
    const block = document.createElement('div');
    block.className = `section-block ${isLocked && !isCompleted ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`;
    block.id = 'block-' + moduleIdStr;
    
    block.innerHTML = `
      <div class="section-header" onclick="window.toggleSection('${moduleIdStr}')">
        <div class="s-num">${idx + 1}</div>
        <div class="s-info">
          <div class="s-title">${window.escapeHtml(module.titulo || 'Módulo ' + (idx + 1))}</div>
          <div class="s-meta">${module.tipo === 'video' ? '🎬 Vídeo' : module.tipo === 'texto' ? '📄 Texto' : '🔗 Link'} · ${module.duracao || '15 min'}</div>
        </div>
        <div>${isCompleted ? '✅' : (isLocked ? '🔒' : '▶')}</div>
      </div>
      <div class="section-body" id="body-${moduleIdStr}">
        <div id="content-${moduleIdStr}" style="min-height: 200px;">Carregando conteúdo...</div>
        <div class="confirm-viewed">
          <span>✅ Após visualizar o conteúdo, clique para confirmar</span>
          <button class="btn-confirm" id="btn-confirm-${moduleIdStr}">✓ Confirmar conclusão</button>
        </div>
        <div id="confirmed-${moduleIdStr}" style="display:none; margin-top:10px;" class="confirmed-label">✅ Módulo concluído</div>
      </div>
    `;
    container.appendChild(block);
    
    // Carregar conteúdo do módulo
    setTimeout(() => {
      carregarConteudoModulo(module, moduleIdStr);
    }, 100);
  });
  
  renderQuiz();
}

function carregarConteudoModulo(module, moduleIdStr) {
  const url = module.conteudo?.url || '';
  const contentDiv = document.getElementById(`content-${moduleIdStr}`);
  
  if (!contentDiv) return;
  
  if (module.tipo === 'texto' && module.conteudo?.texto) {
    contentDiv.innerHTML = `<div class="text-content">${module.conteudo.texto}</div>`;
  }
  else if (module.tipo === 'video' && url) {
    const embedUrl = window.converterLinkGoogleDrive(url);
    contentDiv.innerHTML = `<div class="video-wrap"><iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`;
  }
  else if (module.tipo === 'link' && url) {
    contentDiv.innerHTML = `
      <div class="text-content" style="padding: 20px;">
        <p style="margin-bottom: 12px;">Clique no link abaixo para aceder ao conteúdo:</p>
        <a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--info); word-break: break-all;">${url}</a>
      </div>
    `;
  }
  else {
    contentDiv.innerHTML = '<div class="text-content">Conteúdo não disponível.</div>';
  }
  
  // Adicionar evento ao botão de confirmação
  const confirmBtn = document.getElementById(`btn-confirm-${moduleIdStr}`);
  if (confirmBtn) {
    confirmBtn.onclick = () => window.confirmModule(moduleIdStr);
  }
}

// ============================================
// QUIZ
// ============================================

function renderQuiz() {
  const container = document.getElementById('modules-container');
  if (!container) return;
  
  if (!perguntas || !perguntas.length) {
    return;
  }
  
  const quizBlock = document.createElement('div');
  quizBlock.className = 'section-block locked';
  quizBlock.id = 'block-quiz';
  quizBlock.innerHTML = `
    <div class="section-header" onclick="window.toggleSection('quiz')">
      <div class="s-num">📝</div>
      <div class="s-info">
        <div class="s-title">Avaliação Final</div>
        <div class="s-meta">Nota mínima: 70%</div>
      </div>
      <div id="status-quiz">${quizPassed ? '✅' : '🔒'}</div>
    </div>
    <div class="section-body" id="body-quiz">
      <div id="quiz-questions"></div>
      <div class="quiz-footer">
        <span id="quiz-answered">0 respondidas</span>
        <button class="btn-submit" id="btn-submit" disabled>Submeter avaliação</button>
      </div>
      <div class="result-screen" id="result-screen" style="display:none;">
        <div class="result-score-ring" id="result-ring">
          <div class="score-num" id="score-num">0%</div>
        </div>
        <h2 id="result-title" style="margin-bottom: 16px;"></h2>
        <p id="result-msg" style="color: #666;"></p>
        <div class="result-actions" id="result-actions"></div>
      </div>
    </div>
  `;
  container.appendChild(quizBlock);
  
  if (quizPassed) {
    const quizBlockElement = document.getElementById('block-quiz');
    if (quizBlockElement) {
      quizBlockElement.classList.remove('locked');
      document.getElementById('status-quiz').innerHTML = '✅';
    }
    const resultScreen = document.getElementById('result-screen');
    const quizQuestions = document.getElementById('quiz-questions');
    const quizFooter = document.querySelector('.quiz-footer');
    if (resultScreen) resultScreen.style.display = 'block';
    if (quizQuestions) quizQuestions.style.display = 'none';
    if (quizFooter) quizFooter.style.display = 'none';
    return;
  }
  
  const questionsDiv = document.getElementById('quiz-questions');
  if (!questionsDiv) return;
  
  questionsDiv.innerHTML = perguntas.map((q, idx) => `
    <div class="question" data-qidx="${idx}">
      <div class="question-text">${window.escapeHtml(q.texto)}</div>
      <div class="options" id="opts-${idx}">
        ${q.opcoes.map((opt, i) => `
          <div class="option-item" data-optidx="${i}">
            <div class="option-letter">${String.fromCharCode(65+i)}</div>
            ${window.escapeHtml(opt)}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
  
  // Adicionar eventos às opções
  perguntas.forEach((_, idx) => {
    const optsContainer = document.getElementById(`opts-${idx}`);
    if (optsContainer) {
      const options = optsContainer.querySelectorAll('.option-item');
      options.forEach(opt => {
        opt.onclick = () => window.selectOpt(idx, parseInt(opt.dataset.optidx));
      });
    }
  });
  
  // Inicializar respostas
  window.respostas = window.respostas || {};
  window.totalPerguntas = perguntas.length;
  
  // Adicionar evento ao botão submit
  const submitBtn = document.getElementById('btn-submit');
  if (submitBtn) {
    submitBtn.onclick = () => window.submitQuiz();
  }
}

// ============================================
// FUNÇÕES GLOBAIS
// ============================================

window.confirmModule = function(moduleId) {
  const btn = document.getElementById(`btn-confirm-${moduleId}`);
  if (!btn) return;
  
  const moduleIdStr = String(moduleId);
  completedModules[moduleIdStr] = true;
  
  const block = document.getElementById('block-' + moduleIdStr);
  if (block) block.classList.add('completed');
  
  btn.style.display = 'none';
  const confirmedDiv = document.getElementById(`confirmed-${moduleIdStr}`);
  if (confirmedDiv) confirmedDiv.style.display = 'block';
  
  window.showToast('✅ Módulo concluído!');
  updateProgress();
  
  const currentBody = document.getElementById(`body-${moduleIdStr}`);
  if (currentBody) currentBody.classList.remove('open');
  
  const idx = modules.findIndex(m => String(m.id) === moduleIdStr);
  
  if (idx === modules.length - 1) {
    const quizBlock = document.getElementById('block-quiz');
    if (quizBlock) {
      quizBlock.classList.remove('locked');
      const statusQuiz = document.getElementById('status-quiz');
      if (statusQuiz) statusQuiz.innerHTML = '📝';
      
      const quizBody = document.getElementById('body-quiz');
      if (quizBody) {
        quizBody.classList.add('open');
        setTimeout(() => {
          quizBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
      window.showToast('📝 Avaliação final desbloqueada!');
    }
  } 
  else if (idx >= 0 && idx < modules.length - 1) {
    const nextModuleId = String(modules[idx + 1].id);
    const nextBlock = document.getElementById(`block-${nextModuleId}`);
    if (nextBlock) {
      nextBlock.classList.remove('locked');
      const nextBody = document.getElementById(`body-${nextModuleId}`);
      if (nextBody) {
        nextBody.classList.add('open');
        setTimeout(() => {
          nextBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
      window.showToast('📚 Próximo módulo desbloqueado!');
    }
  }
};

window.selectOpt = function(qIdx, optIdx) {
  const optsContainer = document.getElementById(`opts-${qIdx}`);
  if (!optsContainer) return;
  
  const options = optsContainer.querySelectorAll('.option-item');
  options.forEach(opt => opt.classList.remove('selected'));
  options[optIdx].classList.add('selected');
  
  if (!window.respostas) window.respostas = {};
  window.respostas[qIdx] = String.fromCharCode(65 + optIdx);
  
  const answered = Object.keys(window.respostas).length;
  const answeredSpan = document.getElementById('quiz-answered');
  const submitBtn = document.getElementById('btn-submit');
  
  if (answeredSpan) answeredSpan.textContent = `${answered} de ${window.totalPerguntas} respondidas`;
  if (submitBtn) submitBtn.disabled = answered < window.totalPerguntas;
};

window.submitQuiz = function() {
  if (!window.respostas) window.respostas = {};
  
  let score = 0;
  for (let i = 0; i < window.totalPerguntas; i++) {
    if (window.respostas[i] === perguntas[i].correta) score++;
  }
  const pct = Math.round((score / window.totalPerguntas) * 100);
  const passed = pct >= 70;
  quizPassed = passed;
  salvarProgresso();
  
  const quizQuestions = document.getElementById('quiz-questions');
  const quizFooter = document.querySelector('.quiz-footer');
  const resultScreen = document.getElementById('result-screen');
  const scoreNum = document.getElementById('score-num');
  const resultTitle = document.getElementById('result-title');
  const resultMsg = document.getElementById('result-msg');
  const resultRing = document.getElementById('result-ring');
  const resultActions = document.getElementById('result-actions');
  
  if (quizQuestions) quizQuestions.style.display = 'none';
  if (quizFooter) quizFooter.style.display = 'none';
  if (resultScreen) resultScreen.style.display = 'block';
  if (scoreNum) scoreNum.textContent = pct + '%';
  
  if (resultActions) resultActions.innerHTML = '';
  
  if (passed) {
    if (resultTitle) {
      resultTitle.innerHTML = '🎉 Parabéns!';
      resultTitle.style.color = 'var(--success)';
    }
    if (resultMsg) resultMsg.innerHTML = `Acertaste ${score} de ${window.totalPerguntas} perguntas<br>Obtiveste ${pct}% - Aprovado!`;
    if (resultRing) resultRing.classList.remove('fail');
    
    const certBtn = document.createElement('button');
    certBtn.className = 'result-btn result-btn-cert';
    certBtn.innerHTML = '<i class="fas fa-certificate"></i> Ver Certificado';
    certBtn.onclick = () => window.showCertificate();
    resultActions.appendChild(certBtn);
    
    updateProgress();
    
    localStorage.setItem('cursoConcluido', cursoId);
    
    // Guardar no histórico
    const historicos = JSON.parse(localStorage.getItem('historicos') || '[]');
    const novoHistorico = {
      id: Date.now().toString(),
      nome: nomeUser,
      curso: cursoData.nome,
      cursoId: cursoId,
      nota: pct + '%',
      data: window.formatDate(new Date()),
      dataTimestamp: Date.now()
    };
    historicos.push(novoHistorico);
    localStorage.setItem('historicos', JSON.stringify(historicos));
    
    // Atualizar atribuição no localStorage
    const atribuicoes = JSON.parse(localStorage.getItem('atribuicoes') || '[]');
    const atribIndex = atribuicoes.findIndex(a => a.colaboradorUser === nomeUser && a.cursoId === cursoId && a.status !== 'concluido');
    if (atribIndex !== -1) {
      atribuicoes[atribIndex].status = 'concluido';
      atribuicoes[atribIndex].dataConclusao = new Date().toISOString();
      localStorage.setItem('atribuicoes', JSON.stringify(atribuicoes));
    }
    
    window.showToast('✅ Certificado gerado!');
  } else {
    if (resultTitle) {
      resultTitle.innerHTML = '❌ Não aprovado';
      resultTitle.style.color = 'var(--danger)';
    }
    if (resultMsg) resultMsg.innerHTML = `Obtiveste ${pct}% (${score}/${window.totalPerguntas} corretas)<br>Precisas de pelo menos 70% para ser aprovado.`;
    if (resultRing) resultRing.classList.add('fail');
    
    const retryBtn = document.createElement('button');
    retryBtn.className = 'result-btn result-btn-retry';
    retryBtn.innerHTML = '<i class="fas fa-redo"></i> Tentar novamente';
    retryBtn.onclick = () => window.retryQuiz();
    resultActions.appendChild(retryBtn);
    
    window.showToast('⚠️ Não atingiu a nota mínima. Tente novamente!');
  }
};

window.retryQuiz = function() {
  window.respostas = {};
  
  for (let i = 0; i < window.totalPerguntas; i++) {
    const optsContainer = document.getElementById(`opts-${i}`);
    if (optsContainer) {
      const options = optsContainer.querySelectorAll('.option-item');
      options.forEach(opt => {
        opt.classList.remove('selected', 'correct', 'wrong');
      });
    }
  }
  
  const quizQuestions = document.getElementById('quiz-questions');
  const quizFooter = document.querySelector('.quiz-footer');
  const resultScreen = document.getElementById('result-screen');
  const submitBtn = document.getElementById('btn-submit');
  const answeredSpan = document.getElementById('quiz-answered');
  const resultRing = document.getElementById('result-ring');
  
  if (quizQuestions) quizQuestions.style.display = 'block';
  if (quizFooter) quizFooter.style.display = 'flex';
  if (resultScreen) resultScreen.style.display = 'none';
  if (submitBtn) submitBtn.disabled = true;
  if (answeredSpan) answeredSpan.textContent = `0 de ${window.totalPerguntas} respondidas`;
  if (resultRing) resultRing.classList.remove('fail');
  
  window.showToast('🔄 Quiz reiniciado. Boa sorte!');
};

window.showCertificate = async function() {
  const now = new Date();
  const certId = window.gerarCertificadoId();
  const nota = document.getElementById('score-num')?.textContent || '100%';
  
  let fundoImagem = 'assets/fundo_certificado.png';
  const certTemplateSalvo = localStorage.getItem('cert_template');
  if (certTemplateSalvo) {
    try {
      const template = JSON.parse(certTemplateSalvo);
      if (template.fundoImagem) {
        fundoImagem = template.fundoImagem;
      }
    } catch(e) {}
  }
  
  const certHtml = `
    <div class="cert-screen" style="display:block;" id="cert-screen">
      <div id="certificado-para-pdf" style="
        background-image: url('${fundoImagem}');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        width: 100%;
        max-width: 210mm;
        margin: 0 auto;
        position: relative;
        border: none;
        border-radius: 0;
        aspect-ratio: 210 / 297;
      ">
        <div style="position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 40px;">
          <div style="text-align: center;">
            <div style="font-family: 'Fraunces', serif; font-size: 2.2rem; font-weight: 900; color: #00338D; margin-bottom: 20px;">${window.escapeHtml(nomeUser)}</div>
            <div style="font-size: 1.2rem; color: #616365; margin-bottom: 20px;">concluiu com sucesso a formação</div>
            <div style="font-family: 'Fraunces', serif; font-size: 1.5rem; font-weight: 700; color: #C5A059; margin-bottom: 50px;">${window.escapeHtml(cursoData.nome)}</div>
            <div style="display: flex; justify-content: center; gap: 60px; margin-top: 20px; flex-wrap: wrap;">
              <div style="text-align: center;">
                <div style="font-size: 0.8rem; color: #616365; text-transform: uppercase; letter-spacing: 1px;">NOTA FINAL</div>
                <div style="font-family: 'Fraunces', serif; font-size: 1.5rem; font-weight: 700; color: #00338D;">${nota}</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 0.8rem; color: #616365; text-transform: uppercase; letter-spacing: 1px;">DATA</div>
                <div style="font-family: 'Fraunces', serif; font-size: 1rem; font-weight: 600; color: #00338D;">${window.formatDate(now)}</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 0.8rem; color: #616365; text-transform: uppercase; letter-spacing: 1px;">CERTIFICADO ID</div>
                <div style="font-family: monospace; font-size: 0.9rem; font-weight: 600; color: #00338D;">${certId}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="cert-actions">
        <button class="action-btn action-btn-download" id="btn-descarregar-pdf">
          <i class="fas fa-file-pdf"></i> Descarregar PDF
        </button>
        <button class="action-btn" id="btn-imprimir-certificado">
          <i class="fas fa-print"></i> Imprimir Certificado
        </button>
        <button class="action-btn action-btn-secondary" onclick="window.location.href='dashboard.html'">
          <i class="fas fa-home"></i> Voltar ao Dashboard
        </button>
      </div>
    </div>
  `;
  
  const existingCert = document.getElementById('cert-screen');
  if (existingCert) existingCert.remove();
  
  const modulesContainer = document.getElementById('modules-container');
  if (modulesContainer) {
    modulesContainer.insertAdjacentHTML('beforeend', certHtml);
    
    const btnDownload = document.getElementById('btn-descarregar-pdf');
    const btnImprimir = document.getElementById('btn-imprimir-certificado');
    
    if (btnDownload) btnDownload.onclick = () => window.descarregarPDF();
    if (btnImprimir) btnImprimir.onclick = () => window.imprimirCertificado();
  }
  
  setTimeout(() => {
    const certScreen = document.getElementById('cert-screen');
    if (certScreen) certScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
  
  window.showToast('🏅 Certificado gerado!');
};

window.descarregarPDF = async function() {
  const element = document.getElementById('certificado-para-pdf');
  if (!element) {
    window.showToast('❌ Erro: elemento do certificado não encontrado');
    return;
  }
  
  if (typeof html2canvas === 'undefined') {
    window.showToast('❌ Erro: Biblioteca de PDF não carregada. Recarregue a página.');
    return;
  }
  
  if (typeof window.jspdf === 'undefined') {
    window.showToast('❌ Erro: Biblioteca de PDF não carregada. Recarregue a página.');
    return;
  }
  
  window.showToast('📄 A gerar PDF...');
  
  try {
    const canvas = await html2canvas(element, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`certificado_${nomeUser.replace(/\s/g, '_')}.pdf`);
    window.showToast('✅ PDF guardado!');
  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
    window.showToast('❌ Erro ao gerar PDF: ' + err.message);
  }
};

window.imprimirCertificado = async function() {
  const element = document.getElementById('certificado-para-pdf');
  if (!element) return;
  
  if (typeof html2canvas === 'undefined') {
    window.showToast('❌ Erro: Biblioteca de impressão não carregada.');
    return;
  }
  
  window.showToast('🖨️ A preparar impressão...');
  
  try {
    const canvas = await html2canvas(element, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true
    });
    
    const imageData = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificado - ${nomeUser}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { margin: 0; padding: 0; background: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
          .cert-image { width: 100%; max-width: 210mm; height: auto; display: block; margin: 0 auto; }
          @media print {
            body { margin: 0; padding: 0; }
            .cert-image { page-break-after: avoid; }
          }
        </style>
      </head>
      <body>
        <img src="${imageData}" class="cert-image" alt="Certificado">
        <script>
          window.onload = function() { 
            setTimeout(function() { 
              window.print(); 
              setTimeout(function() { window.close(); }, 1000); 
            }, 500); 
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  } catch (err) {
    console.error('Erro ao preparar impressão:', err);
    window.showToast('❌ Erro ao preparar impressão');
  }
};

window.toggleSection = function(id) {
  if (id === 'quiz') {
    const block = document.getElementById('block-quiz');
    if (block && block.classList.contains('locked')) {
      window.showToast('Complete os módulos primeiro!');
      return;
    }
    const bodyQuiz = document.getElementById('body-quiz');
    if (bodyQuiz) bodyQuiz.classList.toggle('open');
  } else {
    const block = document.getElementById('block-' + id);
    if (block && block.classList.contains('locked')) {
      window.showToast('Complete o módulo anterior!');
      return;
    }
    const body = document.getElementById('body-' + id);
    if (body) body.classList.toggle('open');
  }
};

// ============================================
// INICIAR
// ============================================

// Botão de sair
document.getElementById('btn-sair')?.addEventListener('click', () => {
  if (confirm('Tem a certeza que deseja sair? O seu progresso será guardado automaticamente.')) {
    window.location.href = 'dashboard.html';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initFormacao();
});