import { db, collection, doc, getDoc, addDoc, onSnapshot } from './firebase-config.js';
import { escapeHtml, formatDate, showToast, checkAuth, logout, converterLinkGoogleDrive } from './utils.js';
import { getCurrentUser } from './auth.js';

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let modules = [];
let perguntas = [];
let completedModules = {};
let quizPassed = false;
let cursoId = null;
let nomeUser = '';
let cursoData = {};

// ============================================
// FUNÇÃO PRINCIPAL - CORRIGIDA
// ============================================

export async function initFormacao() {
  console.log("🚀 Iniciando página de formação...");
  
  // 1º PASSO: Verificar se há token na URL
  const tokenData = lerTokenUrl();
  
  if (tokenData && tokenData.user && tokenData.cursoId) {
    console.log("🔑 Token válido encontrado para:", tokenData.user);
    
    // Criar sessão com os dados do token
    localStorage.setItem('usuarioAtivo', tokenData.user);
    nomeUser = tokenData.user;
    
    // Mostrar nome na interface
    const userNameDisplay = document.getElementById('user-name-display');
    if (userNameDisplay) userNameDisplay.textContent = nomeUser;
    
    // Mostrar prazo se existir
    if (tokenData.prazo) {
      const prazoElement = document.getElementById('prazo-data');
      if (prazoElement) prazoElement.textContent = tokenData.prazo;
    }
    
    // Carregar a formação diretamente
    await carregarFormacao(tokenData.cursoId);
    return;
  }
  
  // 2º PASSO: Se não há token, verificar sessão normal
  console.log("🔍 Sem token, verificando sessão normal...");
  
  if (!checkAuth()) return;
  
  const user = getCurrentUser();
  if (!user || user.type !== 'colaborador') {
    console.log("❌ Sem sessão de colaborador, redirecionando para login...");
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
    if (loadingDiv) loadingDiv.innerHTML = '❌ Nenhuma formação. <a href="dashboard.html">Voltar</a>';
  }
}

// ============================================
// FUNÇÃO PARA LER O TOKEN DA URL
// ============================================

function lerTokenUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (!token) return null;
  
  try {
    // Restaurar caracteres especiais que foram substituídos na geração
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = atob(base64);
    const data = JSON.parse(decoded);
    console.log("✅ Token decodificado:", data);
    return data;
  } catch(e) {
    console.error('❌ Erro ao decodificar token:', e);
    return null;
  }
}

// ============================================
// CARREGAR FORMAÇÃO DO FIREBASE
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
  
  try {
    const docRef = doc(db, 'formacoes', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      cursoData = {
        nome: data.nome,
        duracao: data.duracao,
        descricao: data.descricao
      };
      modules = data.modulos || [];
      perguntas = data.perguntas || [];
      
      console.log("✅ Formação carregada:", cursoData.nome);
      console.log("📦 Módulos:", modules.length);
      console.log("📝 Perguntas:", perguntas.length);
      
      // Carregar progresso salvo
      carregarProgresso();
      
      // Atualizar UI
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
      loadingDiv.innerHTML = '❌ Formação não encontrada.';
    }
  } catch(error) {
    console.error('❌ Erro ao carregar formação:', error);
    loadingDiv.innerHTML = '❌ Erro: ' + error.message;
  }
}

// ============================================
// FUNÇÕES DE PROGRESSO
// ============================================

function carregarProgresso() {
  const storageKey = `progresso_${cursoId}_${nomeUser}`;
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    const progress = JSON.parse(saved);
    completedModules = progress.completedModules || {};
    quizPassed = progress.quizPassed || false;
    console.log("📊 Progresso carregado:", completedModules);
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
  console.log("💾 Progresso salvo");
}

function updateProgress() {
  const total = modules.length + 1;
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
// RENDERIZAR MÓDULOS E QUIZ
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
          <div class="s-title">${escapeHtml(module.titulo || 'Módulo ' + (idx + 1))}</div>
          <div class="s-meta">${module.tipo === 'video' ? '🎬 Vídeo' : module.tipo === 'text' ? '📄 Texto' : '📁 Conteúdo'}</div>
        </div>
        <div>${isCompleted ? '✅' : (isLocked ? '🔒' : '▶')}</div>
      </div>
      <div class="section-body" id="body-${moduleIdStr}">
        <div id="content-${moduleIdStr}" style="min-height: 200px;">Carregando conteúdo...</div>
        <div class="confirm-viewed">
          <span>✅ Após visualizar o conteúdo, clique para confirmar</span>
          <button class="btn-confirm" id="btn-confirm-${moduleIdStr}" onclick="window.confirmModule('${moduleIdStr}')">✓ Confirmar conclusão</button>
        </div>
        <div id="confirmed-${moduleIdStr}" style="display:none; margin-top:10px;" class="confirmed-label">✅ Módulo concluído</div>
      </div>
    `;
    container.appendChild(block);
    
    // Carregar conteúdo do módulo
    setTimeout(() => {
      const url = module.conteudo?.url || '';
      const contentDiv = document.getElementById(`content-${moduleIdStr}`);
      
      if (module.tipo === 'text' && module.conteudo?.texto) {
        contentDiv.innerHTML = `<div class="text-content">${module.conteudo.texto}</div>`;
      }
      else if (url) {
        const embedUrl = converterLinkGoogleDrive(url);
        
        if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) {
          let videoId = embedUrl.split('v=')[1]?.split('&')[0] || embedUrl.split('/').pop();
          contentDiv.innerHTML = `<div class="video-wrap"><iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe></div>`;
        } else {
          contentDiv.innerHTML = `<div class="doc-viewer"><iframe src="${embedUrl}" class="doc-iframe" allow="autoplay"></iframe></div>`;
        }
      }
      else {
        contentDiv.innerHTML = '<div class="text-content">Conteúdo não disponível.</div>';
      }
    }, 100);
  });
  
  renderQuiz();
}

function renderQuiz() {
  const container = document.getElementById('modules-container');
  if (!container) return;
  
  const quizBlock = document.createElement('div');
  quizBlock.className = 'section-block locked';
  quizBlock.id = 'block-quiz';
  quizBlock.innerHTML = `
    <div class="section-header" onclick="window.toggleSection('quiz')">
      <div class="s-num">📝</div>
      <div class="s-info">
        <div class="s-title">Avaliação Final</div>
        <div>Nota mínima: 70%</div>
      </div>
      <div id="status-quiz">${quizPassed ? '✅' : '🔒'}</div>
    </div>
    <div class="section-body" id="body-quiz">
      <div id="quiz-questions"></div>
      <div class="quiz-footer">
        <span id="quiz-answered">0 respondidas</span>
        <button class="btn-submit" id="btn-submit" disabled onclick="window.submitQuiz()">Submeter avaliação</button>
      </div>
      <div class="result-screen" id="result-screen">
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
    if (resultScreen) {
      resultScreen.style.display = 'block';
      document.getElementById('quiz-questions').style.display = 'none';
      const quizFooter = document.querySelector('.quiz-footer');
      if (quizFooter) quizFooter.style.display = 'none';
    }
    return;
  }
  
  // Garantir perguntas
  if (!perguntas.length) {
    perguntas = [
      { texto: "Qual é a melhor forma de aprender?", opcoes: ["Praticar", "Só ler", "Decorar", "Ignorar"], correta: "A" }
    ];
  }
  
  const questionsDiv = document.getElementById('quiz-questions');
  if (!questionsDiv) return;
  
  questionsDiv.innerHTML = perguntas.map((q, idx) => `
    <div class="question">
      <div class="question-text">${escapeHtml(q.texto)}</div>
      <div class="options" id="opts-${idx}">
        ${q.opcoes.map((opt, i) => `
          <div class="option-item" onclick="window.selectOpt(${idx}, ${i})">
            <div class="option-letter">${String.fromCharCode(65+i)}</div>
            ${escapeHtml(opt)}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
  
  window.perguntas = perguntas;
  window.respostas = {};
  window.totalPerguntas = perguntas.length;
}

// ============================================
// FUNÇÕES DE INTERAÇÃO
// ============================================

window.confirmModule = (moduleId) => {
  const btn = document.getElementById(`btn-confirm-${moduleId}`);
  if (!btn) return;
  
  const moduleIdStr = String(moduleId);
  completedModules[moduleIdStr] = true;
  
  const block = document.getElementById('block-' + moduleIdStr);
  if (block) block.classList.add('completed');
  
  btn.style.display = 'none';
  const confirmedDiv = document.getElementById(`confirmed-${moduleIdStr}`);
  if (confirmedDiv) confirmedDiv.style.display = 'block';
  
  showToast('✅ Módulo concluído!');
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
      showToast('📝 Avaliação final desbloqueada!');
    }
  } 
  else {
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
      showToast('📚 Próximo módulo desbloqueado!');
    }
  }
};

window.selectOpt = (qIdx, optIdx) => {
  document.querySelectorAll(`#opts-${qIdx} .option-item`).forEach(el => el.classList.remove('selected'));
  document.querySelectorAll(`#opts-${qIdx} .option-item`)[optIdx].classList.add('selected');
  window.respostas[qIdx] = String.fromCharCode(65 + optIdx);
  const answered = Object.keys(window.respostas).length;
  const answeredSpan = document.getElementById('quiz-answered');
  const submitBtn = document.getElementById('btn-submit');
  if (answeredSpan) answeredSpan.textContent = `${answered} de ${window.totalPerguntas} respondidas`;
  if (submitBtn) submitBtn.disabled = answered < window.totalPerguntas;
};

window.submitQuiz = async () => {
  let score = 0;
  for (let i = 0; i < window.totalPerguntas; i++) {
    if (window.respostas[i] === window.perguntas[i].correta) score++;
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
    certBtn.onclick = () => showCertificate();
    resultActions.appendChild(certBtn);
    
    updateProgress();
    
    localStorage.setItem('cursoConcluido', cursoId);
    
    try {
      await addDoc(collection(db, 'historico'), {
        nome: nomeUser,
        curso: cursoData.nome,
        nota: pct + '%',
        data: formatDate(new Date()),
        dataTimestamp: Date.now()
      });
      showToast('✅ Certificado gerado!');
    } catch(e) { 
      console.error(e); 
    }
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
    retryBtn.onclick = () => retryQuiz();
    resultActions.appendChild(retryBtn);
    
    showToast('⚠️ Não atingiu a nota mínima. Tente novamente!');
  }
};

function retryQuiz() {
  window.respostas = {};
  for (let i = 0; i < window.totalPerguntas; i++) {
    document.querySelectorAll(`#opts-${i} .option-item`).forEach(el => {
      el.classList.remove('selected', 'correct', 'wrong');
      el.onclick = () => window.selectOpt(i, Array.from(el.parentNode.children).indexOf(el));
    });
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
  showToast('🔄 Quiz reiniciado. Boa sorte!');
}

async function showCertificate() {
  const now = new Date();
  const certId = 'CERT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  const nota = document.getElementById('score-num')?.textContent || '100%';
  
  let fundoImagem = 'imagens/fundo_certificado.png';
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
    <div class="cert-screen" style="display:block; margin-top: 30px;">
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
            <div style="font-family: 'Fraunces', serif; font-size: 2.2rem; font-weight: 900; color: #00338D; margin-bottom: 20px;">${escapeHtml(nomeUser)}</div>
            <div style="font-size: 1.2rem; color: #616365; margin-bottom: 20px;">concluiu com sucesso a formação</div>
            <div style="font-family: 'Fraunces', serif; font-size: 1.5rem; font-weight: 700; color: #C5A059; margin-bottom: 50px;">${escapeHtml(cursoData.nome)}</div>
            <div style="display: flex; justify-content: center; gap: 60px; margin-top: 20px; flex-wrap: wrap;">
              <div style="text-align: center;">
                <div style="font-size: 0.8rem; color: #616365; text-transform: uppercase; letter-spacing: 1px;">NOTA FINAL</div>
                <div style="font-family: 'Fraunces', serif; font-size: 1.5rem; font-weight: 700; color: #00338D;">${nota}</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 0.8rem; color: #616365; text-transform: uppercase; letter-spacing: 1px;">DATA</div>
                <div style="font-family: 'Fraunces', serif; font-size: 1rem; font-weight: 600; color: #00338D;">${formatDate(now)}</div>
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
        <button class="action-btn action-btn-download" onclick="window.descarregarPDF()">
          <i class="fas fa-file-pdf"></i> Descarregar PDF
        </button>
        <button class="action-btn" onclick="window.imprimirCertificado()">
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
  }
  
  setTimeout(() => {
    const certScreen = document.getElementById('cert-screen');
    if (certScreen) certScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
  
  showToast('🏅 Certificado gerado!');
}

window.descarregarPDF = async () => {
  const element = document.getElementById('certificado-para-pdf');
  if (!element) {
    showToast('❌ Erro: elemento do certificado não encontrado');
    return;
  }
  
  showToast('📄 A gerar PDF...');
  
  try {
    const canvas = await html2canvas(element, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });
    
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let finalHeight = imgHeight;
    let finalWidth = imgWidth;
    let yOffset = 0;
    
    if (imgHeight > pdfHeight) {
      finalHeight = pdfHeight;
      finalWidth = (canvas.width * finalHeight) / canvas.height;
      yOffset = 0;
    } else {
      yOffset = (pdfHeight - imgHeight) / 2;
    }
    
    const xOffset = (pdfWidth - finalWidth) / 2;
    
    pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
    pdf.save(`certificado_${nomeUser.replace(/\s/g, '_')}.pdf`);
    showToast('✅ PDF guardado!');
  } catch (err) {
    console.error(err);
    showToast('❌ Erro ao gerar PDF');
  }
};

window.imprimirCertificado = async () => {
  const element = document.getElementById('certificado-para-pdf');
  if (!element) {
    showToast('❌ Erro: certificado não encontrado');
    return;
  }
  
  showToast('🖨️ A preparar impressão...');
  
  try {
    const canvas = await html2canvas(element, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false
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
    console.error(err);
    showToast('❌ Erro ao preparar impressão');
  }
};

window.toggleSection = (id) => {
  if (id === 'quiz') {
    const block = document.getElementById('block-quiz');
    if (block && block.classList.contains('locked')) {
      showToast('Complete os módulos primeiro!');
      return;
    }
    const bodyQuiz = document.getElementById('body-quiz');
    if (bodyQuiz) bodyQuiz.classList.toggle('open');
  } else {
    const block = document.getElementById('block-' + id);
    if (block && block.classList.contains('locked')) {
      showToast('Complete o módulo anterior!');
      return;
    }
    const body = document.getElementById('body-' + id);
    if (body) body.classList.toggle('open');
  }
};

window.sair = () => {
  if (confirm('Sair?')) {
    window.location.href = 'dashboard.html';
  }
};

// ============================================
// INICIAR
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initFormacao();
});

window.confirmModule = confirmModule;
window.selectOpt = selectOpt;
window.submitQuiz = submitQuiz;
window.toggleSection = toggleSection;
window.sair = sair;
window.descarregarPDF = descarregarPDF;
window.imprimirCertificado = imprimirCertificado;
