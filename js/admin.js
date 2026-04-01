import { 
  db, 
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc,
  query, where, orderBy, onSnapshot 
} from './firebase-config.js';
import { escapeHtml, formatDate, showToast, converterLinkGoogleDrive, downloadExcel } from './utils.js';

// ============================================
// ADMIN - LÓGICA PRINCIPAL (VERSÃO CORRIGIDA)
// ============================================

let adminConfig = JSON.parse(localStorage.getItem('admin_config') || '{"adminPassword":"SSA2024admin"}');
let modulos = [];
let perguntas = [];
let editandoModuloId = null;
let editandoPerguntaId = null;
let moduloTipoAtual = 'video';
let editandoFormacaoId = null;
let linksGerados = [];

const defaultCert = { 
  fundoImagem: "imagens/fundo_certificado.png", 
  titulo: "Certificado de Formação", 
  texto: "Certifica-se que {{nome}} concluiu {{formacao}} com {{nota}}.\nEmitido em {{data}}.", 
  rodape: "Direção de Formação" 
};
let certTemplate = JSON.parse(localStorage.getItem('cert_template') || JSON.stringify(defaultCert));

// ==================== DADOS EM TEMPO REAL ====================

let cachedFormacoes = [];
let unsubscribeFormacoes = null;

async function carregarFormacoes() {
  if (unsubscribeFormacoes) return cachedFormacoes;
  
  unsubscribeFormacoes = onSnapshot(
    query(collection(db, 'formacoes'), orderBy('dataTimestamp', 'desc')),
    (querySnapshot) => {
      cachedFormacoes = [];
      querySnapshot.forEach((doc) => { 
        cachedFormacoes.push({ id: doc.id, ...doc.data() });
      });
      if (document.getElementById('sec-lista-formacoes')?.classList.contains('active')) {
        renderFormacoesLista();
      }
      if (document.getElementById('sec-dashboard')?.classList.contains('active')) {
        atualizarDashboard();
      }
      if (document.getElementById('sec-acompanhar')?.classList.contains('active')) {
        renderAcompanhamento();
      }
    }
  );
  return cachedFormacoes;
}

let cachedColaboradores = [];
let unsubscribeColaboradores = null;

async function carregarColaboradores() {
  if (unsubscribeColaboradores) return cachedColaboradores;
  
  unsubscribeColaboradores = onSnapshot(
    collection(db, 'colaboradores'),
    (querySnapshot) => {
      cachedColaboradores = [];
      querySnapshot.forEach((doc) => { 
        cachedColaboradores.push({ id: doc.id, ...doc.data() });
      });
      if (document.getElementById('sec-colaboradores')?.classList.contains('active')) {
        renderColabs();
      }
      if (document.getElementById('sec-atribuir')?.classList.contains('active')) {
        atualizarSelectores();
      }
      if (document.getElementById('sec-acompanhar')?.classList.contains('active')) {
        renderAcompanhamento();
      }
    }
  );
  return cachedColaboradores;
}

let cachedHistorico = [];
let unsubscribeHistorico = null;

async function carregarHistorico() {
  if (unsubscribeHistorico) return cachedHistorico;
  
  unsubscribeHistorico = onSnapshot(
    query(collection(db, 'historico'), orderBy('dataTimestamp', 'desc')),
    (querySnapshot) => {
      cachedHistorico = [];
      querySnapshot.forEach((doc) => { 
        cachedHistorico.push({ id: doc.id, ...doc.data() });
      });
      if (document.getElementById('sec-historico')?.classList.contains('active')) {
        renderHistorico();
      }
      if (document.getElementById('sec-dashboard')?.classList.contains('active')) {
        atualizarDashboard();
      }
      if (document.getElementById('sec-acompanhar')?.classList.contains('active')) {
        renderAcompanhamento();
      }
    }
  );
  return cachedHistorico;
}

let cachedAtribuicoes = [];
let unsubscribeAtribuicoes = null;

async function carregarAtribuicoes() {
  if (unsubscribeAtribuicoes) return cachedAtribuicoes;
  
  unsubscribeAtribuicoes = onSnapshot(
    query(collection(db, 'atribuicoes'), orderBy('dataCriacao', 'desc')),
    (querySnapshot) => {
      cachedAtribuicoes = [];
      querySnapshot.forEach((doc) => { 
        cachedAtribuicoes.push({ id: doc.id, ...doc.data() });
      });
      if (document.getElementById('sec-acompanhar')?.classList.contains('active')) {
        renderAcompanhamento();
      }
    }
  );
  return cachedAtribuicoes;
}

// ==================== DASHBOARD ====================

async function atualizarDashboard() {
  const cursos = await carregarFormacoes();
  const colaboradores = await carregarColaboradores();
  const historico = await carregarHistorico();
  const atribuicoes = await carregarAtribuicoes();
  
  const concluidas = atribuicoes.filter(a => a.status === 'concluido').length;
  const pendentes = atribuicoes.filter(a => a.status !== 'concluido').length;
  
  const dashboardGrid = document.getElementById('dashboard-grid');
  if (dashboardGrid) {
    dashboardGrid.innerHTML = `
      <div class="dash-card">
        <div class="dash-icon" style="background:var(--info-bg)">👥</div>
        <div class="dash-info">
          <h3>${colaboradores.length}</h3>
          <p>Colaboradores</p>
        </div>
      </div>
      <div class="dash-card">
        <div class="dash-icon" style="background:var(--success-bg)">📚</div>
        <div class="dash-info">
          <h3>${cursos.length}</h3>
          <p>Formações</p>
        </div>
      </div>
      <div class="dash-card">
        <div class="dash-icon" style="background:var(--purple-bg)">🏅</div>
        <div class="dash-info">
          <h3>${concluidas}</h3>
          <p>Atribuições concluídas</p>
        </div>
      </div>
      <div class="dash-card">
        <div class="dash-icon" style="background:var(--warning-bg)">⏳</div>
        <div class="dash-info">
          <h3>${pendentes}</h3>
          <p>Pendentes</p>
        </div>
      </div>
    `;
  }
  
  const recentes = historico.slice(0, 5);
  const recentActivities = document.getElementById('recent-activities');
  if (recentActivities) {
    recentActivities.innerHTML = recentes.length ? 
      recentes.map(h => `
        <div class="item-card">
          <div class="item-card-info">
            <strong>${escapeHtml(h.nome)}</strong> concluiu "${escapeHtml(h.curso)}" com ${escapeHtml(h.nota)}
          </div>
          <div class="item-card-meta">${escapeHtml(h.data)}</div>
        </div>
      `).join('') : 
      '<div class="empty">Sem atividades recentes.</div>';
  }
}

// ==================== GESTÃO DE FORMAÇÕES ====================

async function renderFormacoesLista() {
  const cursos = await carregarFormacoes();
  const container = document.getElementById('formacoes-list');
  
  if (!container) return;
  
  if (!cursos.length) { 
    container.innerHTML = '<div class="empty">Nenhuma formação criada.</div>'; 
    return; 
  }
  
  container.innerHTML = cursos.map(curso => `
    <div class="item-card">
      <div class="item-card-info">
        <div class="item-card-title">📘 ${escapeHtml(curso.nome)}</div>
        <div class="item-card-meta">${curso.modulos?.length || 0} módulos · ${curso.perguntas?.length || 0} perguntas</div>
      </div>
      <div class="item-card-actions">
        <button onclick="window.editarFormacao('${curso.id}')" style="color:var(--info)">✏️ Editar</button>
        <button onclick="window.apagarFormacao('${curso.id}')" style="color:var(--danger)">🗑️ Apagar</button>
      </div>
    </div>
  `).join('');
}

window.apagarFormacao = async (id) => {
  if (!confirm('Apagar esta formação permanentemente?')) return;
  try {
    await deleteDoc(doc(db, 'formacoes', id));
    showToast('✅ Formação apagada!');
    renderFormacoesLista();
    atualizarDashboard();
    atualizarSelectores();
    renderAcompanhamento();
  } catch(error) { 
    console.error('Erro:', error); 
    showToast('❌ Erro ao apagar formação.'); 
  }
};

// ==================== MÓDULOS ====================

window.abrirModalModulo = (tipo) => {
  moduloTipoAtual = tipo;
  editandoModuloId = null;
  
  document.getElementById('modulo-titulo').value = '';
  document.getElementById('modulo-duracao').value = '';
  document.getElementById('modulo-video-url').value = '';
  document.getElementById('modulo-texto-conteudo').value = '';
  document.getElementById('modulo-file-url').value = '';
  
  document.getElementById('modulo-conteudo-video').style.display = tipo === 'video' ? 'block' : 'none';
  document.getElementById('modulo-conteudo-texto').style.display = tipo === 'text' ? 'block' : 'none';
  document.getElementById('modulo-conteudo-file').style.display = tipo === 'file' ? 'block' : 'none';
  
  const titulos = { video: '🎬 Adicionar Vídeo', text: '📄 Adicionar Texto', file: '📁 Adicionar Ficheiro/URL' };
  document.getElementById('modal-modulo-titulo').textContent = titulos[tipo];
  
  document.getElementById('modal-modulo').style.display = 'flex';
};

window.editarModulo = (id) => {
  const m = modulos.find(m => m.id === id);
  if (!m) return;
  
  editandoModuloId = id;
  moduloTipoAtual = m.tipo;
  
  document.getElementById('modulo-titulo').value = m.titulo;
  document.getElementById('modulo-duracao').value = m.duracao;
  
  document.getElementById('modulo-conteudo-video').style.display = m.tipo === 'video' ? 'block' : 'none';
  document.getElementById('modulo-conteudo-texto').style.display = m.tipo === 'text' ? 'block' : 'none';
  document.getElementById('modulo-conteudo-file').style.display = m.tipo === 'file' ? 'block' : 'none';
  
  if (m.tipo === 'video') document.getElementById('modulo-video-url').value = m.conteudo.url || '';
  if (m.tipo === 'text') document.getElementById('modulo-texto-conteudo').value = m.conteudo.texto || '';
  if (m.tipo === 'file') document.getElementById('modulo-file-url').value = m.conteudo.url || '';
  
  document.getElementById('modal-modulo').style.display = 'flex';
};

function salvarModulo() {
  const titulo = document.getElementById('modulo-titulo').value.trim();
  if (!titulo) { showToast('❌ Título obrigatório'); return; }
  
  let conteudo = {};
  
  if (moduloTipoAtual === 'video') {
    const url = document.getElementById('modulo-video-url').value.trim();
    if (!url) { showToast('❌ URL do vídeo obrigatória'); return; }
    conteudo = { url };
  }
  else if (moduloTipoAtual === 'text') {
    const texto = document.getElementById('modulo-texto-conteudo').value.trim();
    if (!texto) { showToast('❌ Conteúdo obrigatório'); return; }
    conteudo = { texto };
  }
  else if (moduloTipoAtual === 'file') {
    let url = document.getElementById('modulo-file-url').value.trim();
    if (!url) { showToast('❌ URL do ficheiro obrigatória'); return; }
    url = converterLinkGoogleDrive(url);
    conteudo = { url };
  }
  
  const duracao = document.getElementById('modulo-duracao').value.trim() || '15 min';
  
  const novoModulo = {
    id: editandoModuloId || Date.now(),
    titulo: titulo,
    tipo: moduloTipoAtual,
    conteudo: conteudo,
    duracao: duracao
  };
  
  if (editandoModuloId) {
    const index = modulos.findIndex(m => m.id === editandoModuloId);
    if (index !== -1) modulos[index] = novoModulo;
    editandoModuloId = null;
  } else {
    modulos.push(novoModulo);
  }
  
  renderModulos();
  fecharModal('modal-modulo');
  showToast(`✅ Módulo "${titulo}" adicionado!`);
}

window.removerModulo = (id) => {
  if (confirm('Remover este módulo?')) {
    modulos = modulos.filter(m => m.id !== id);
    renderModulos();
  }
};

function renderModulos() {
  const container = document.getElementById('modulos-container');
  if (!container) return;
  
  if (!modulos.length) {
    container.innerHTML = '<div class="alert alert-info">Nenhum módulo adicionado. Clique nos botões acima para adicionar.</div>';
    return;
  }
  
  container.innerHTML = modulos.map((m, idx) => `
    <div style="background: var(--bg); border-radius: 8px; margin-bottom: 12px; padding: 12px; border: 1px solid var(--border);">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="background: var(--birkenstock-blue); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">${idx + 1}</span>
          <div>
            <div style="font-weight: 700;">${escapeHtml(m.titulo)}</div>
            <div style="font-size: 11px; color: var(--birkenstock-gray);">${m.tipo === 'video' ? '🎬 Vídeo' : m.tipo === 'text' ? '📄 Texto' : '📁 Ficheiro'} · ${m.duracao}</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="window.editarModulo(${m.id})" style="background: var(--info); color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">✏️</button>
          <button onclick="window.removerModulo(${m.id})" style="background: var(--danger); color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ==================== PERGUNTAS ====================

window.abrirModalPergunta = () => {
  editandoPerguntaId = null;
  document.getElementById('pergunta-texto').value = '';
  document.getElementById('pergunta-opcao-a').value = '';
  document.getElementById('pergunta-opcao-b').value = '';
  document.getElementById('pergunta-opcao-c').value = '';
  document.getElementById('pergunta-opcao-d').value = '';
  document.getElementById('pergunta-correta').value = 'A';
  document.getElementById('modal-pergunta').style.display = 'flex';
};

window.editarPergunta = (id) => {
  const p = perguntas.find(p => p.id === id);
  if (!p) return;
  editandoPerguntaId = id;
  document.getElementById('pergunta-texto').value = p.texto;
  document.getElementById('pergunta-opcao-a').value = p.opcoes[0];
  document.getElementById('pergunta-opcao-b').value = p.opcoes[1];
  document.getElementById('pergunta-opcao-c').value = p.opcoes[2];
  document.getElementById('pergunta-opcao-d').value = p.opcoes[3];
  document.getElementById('pergunta-correta').value = p.correta;
  document.getElementById('modal-pergunta').style.display = 'flex';
};

function salvarPergunta() {
  const texto = document.getElementById('pergunta-texto').value.trim();
  if (!texto) { showToast('Texto da pergunta obrigatório'); return; }
  const opcoes = [
    document.getElementById('pergunta-opcao-a').value.trim(),
    document.getElementById('pergunta-opcao-b').value.trim(),
    document.getElementById('pergunta-opcao-c').value.trim(),
    document.getElementById('pergunta-opcao-d').value.trim()
  ];
  if (opcoes.some(o => !o)) { showToast('Todas as opções são obrigatórias'); return; }
  const correta = document.getElementById('pergunta-correta').value;
  
  if (editandoPerguntaId) {
    const idx = perguntas.findIndex(p => p.id === editandoPerguntaId);
    if (idx !== -1) perguntas[idx] = { ...perguntas[idx], texto, opcoes, correta };
  } else {
    perguntas.push({ id: Date.now(), texto, opcoes, correta });
  }
  renderPerguntas();
  fecharModal('modal-pergunta');
  showToast('✅ Pergunta adicionada!');
}

window.removerPergunta = (id) => {
  if (confirm('Remover pergunta?')) {
    perguntas = perguntas.filter(p => p.id !== id);
    renderPerguntas();
  }
};

function renderPerguntas() {
  const container = document.getElementById('perguntas-container');
  if (!container) return;
  
  if (!perguntas.length) {
    container.innerHTML = '<div class="alert alert-info">Nenhuma pergunta adicionada. Clique em "Adicionar Pergunta".</div>';
    return;
  }
  container.innerHTML = perguntas.map((p, idx) => `
    <div style="background: var(--bg); border-radius: 8px; margin-bottom: 12px; padding: 12px; border: 1px solid var(--border);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="background: var(--warning); color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">${idx + 1}</span>
            <strong>${escapeHtml(p.texto)}</strong>
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; font-size: 12px;">
            <div>A) ${escapeHtml(p.opcoes[0])}</div>
            <div>B) ${escapeHtml(p.opcoes[1])}</div>
            <div>C) ${escapeHtml(p.opcoes[2])}</div>
            <div>D) ${escapeHtml(p.opcoes[3])}</div>
          </div>
          <div style="margin-top: 8px; font-size: 11px; color: var(--success);"><i class="fas fa-check-circle"></i> Correta: ${p.correta}</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="window.editarPergunta(${p.id})" style="background: var(--info); color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">✏️</button>
          <button onclick="window.removerPergunta(${p.id})" style="background: var(--danger); color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ==================== COLABORADORES (com Matrícula) ====================

async function renderColabs() {
  const colaboradores = await carregarColaboradores();
  const tbody = document.getElementById('colab-list-table');
  
  if (!tbody) return;
  
  if (!colaboradores.length) { 
    tbody.innerHTML = '<tr><td colspan="4" class="empty">Nenhum colaborador cadastrado.</td></tr>'; 
    return; 
  }
  
  tbody.innerHTML = colaboradores.map(c => `
    <tr>
      <td data-label="Matrícula">${escapeHtml(c.matricula || '-')}</td>
      <td data-label="Nome">${escapeHtml(c.user)}</td>
      <td data-label="Email">${escapeHtml(c.email || '-')}</td>
      <td data-label="Ações">
        <button class="btn-sm btn-danger" onclick="window.removerColab('${c.id}')">🗑️ Remover</button>
      </td>
    </tr>
  `).join('');
}

window.removerColab = async (id) => { 
  if (confirm('Remover colaborador?')) { 
    await deleteDoc(doc(db, 'colaboradores', id)); 
    renderColabs(); 
    atualizarSelectores(); 
    atualizarDashboard();
    renderAcompanhamento();
  } 
};

async function saveUser() {
  const matricula = document.getElementById('u-matricula').value.trim();
  const user = document.getElementById('u-nome').value.trim().toLowerCase().replace(/\s+/g, '.');
  const email = document.getElementById('u-email').value.trim();
  const pass = document.getElementById('u-pass').value;
  
  if (!user || !pass) { showToast('❌ Preencha nome e password.'); return; }
  
  await addDoc(collection(db, 'colaboradores'), { 
    matricula,
    user,
    email,
    pass,
    dataCriacao: new Date().toISOString() 
  });
  
  showToast('✅ Colaborador criado!');
  document.getElementById('u-matricula').value = '';
  document.getElementById('u-nome').value = ''; 
  document.getElementById('u-email').value = ''; 
  document.getElementById('u-pass').value = '';
  renderColabs(); 
  atualizarSelectores(); 
  atualizarDashboard();
  renderAcompanhamento();
}

function importColaboradores(files) { 
  if (!files || !files[0]) return; 
  const reader = new FileReader(); 
  reader.onload = async function(e) { 
    const lines = e.target.result.split('\n'); 
    let imported = 0; 
    for (let i = 1; i < lines.length; i++) { 
      const parts = lines[i].split(','); 
      if (parts.length >= 3) { 
        const matricula = parts[0].trim(); 
        const user = parts[1].trim().toLowerCase().replace(/\s+/g, '.'); 
        const email = parts[2].trim(); 
        const pass = parts[3] ? parts[3].trim() : 'birkenstock2024';
        if (user && pass) { 
          await addDoc(collection(db, 'colaboradores'), { 
            matricula, user, email, pass, dataCriacao: new Date().toISOString() 
          }); 
          imported++; 
        } 
      } 
    } 
    showToast(`✅ Importados ${imported} colaboradores!`); 
    renderColabs(); 
    atualizarSelectores(); 
    atualizarDashboard();
    renderAcompanhamento();
  }; 
  reader.readAsText(files[0], 'UTF-8'); 
}

function downloadModeloCSV() { 
  const csv = "matricula,nome,email,password\n1001,João Silva,joao.silva@empresa.pt,birkenstock2024\n1002,Maria Santos,maria.santos@empresa.pt,birkenstock2024"; 
  const blob = new Blob([csv], {type:'text/csv'}); 
  const link = document.createElement('a'); 
  link.href = URL.createObjectURL(blob); 
  link.download = 'modelo_colaboradores.csv'; 
  link.click(); 
}

window.exportarColaboradoresExcel = async () => {
  const colaboradores = await carregarColaboradores();
  if (!colaboradores.length) { showToast('❌ Sem colaboradores para exportar'); return; }
  const dados = colaboradores.map(c => ({
    'Matrícula': c.matricula || '',
    'Nome': c.user,
    'Email': c.email || '',
    'Data Criação': c.dataCriacao ? formatDate(c.dataCriacao) : ''
  }));
  downloadExcel(dados, 'colaboradores', 'Colaboradores');
};

// ==================== ATRIBUIÇÃO EM MASSA ====================

async function atualizarSelectores() {
  const cursos = await carregarFormacoes();
  const colaboradores = await carregarColaboradores();
  
  const atribuirCurso = document.getElementById('atribuir-curso');
  const colabGrid = document.getElementById('colab-selector-grid');
  
  if (atribuirCurso) {
    atribuirCurso.innerHTML = '<option value="">Selecione uma formação</option>' + 
      cursos.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('');
  }
  
  if (colabGrid) {
    colabGrid.innerHTML = colaboradores.map(c => `
      <label class="colab-check">
        <input type="checkbox" value="${c.user}" data-email="${c.email || ''}" data-nome="${c.user}" data-matricula="${c.matricula || ''}"> 
        ${escapeHtml(c.user)} ${c.matricula ? `(${c.matricula})` : ''} ${c.email ? '-' + escapeHtml(c.email) : ''}
      </label>
    `).join('');
  }
}

window.selecionarTodos = () => { 
  document.querySelectorAll('#colab-selector-grid input').forEach(cb => cb.checked = true); 
};

window.deselecionarTodos = () => { 
  document.querySelectorAll('#colab-selector-grid input').forEach(cb => cb.checked = false); 
};

window.gerarLinksMassa = async () => {
  const cursoId = document.getElementById('atribuir-curso').value; 
  if (!cursoId) { 
    showToast('❌ Selecione uma formação'); 
    return; 
  }
  
  const selected = Array.from(document.querySelectorAll('#colab-selector-grid input:checked')).map(cb => { 
    return { 
      user: cb.value, 
      email: cb.dataset.email, 
      nome: cb.dataset.nome || cb.value, 
      matricula: cb.dataset.matricula 
    }; 
  });
  
  if (!selected.length) { 
    showToast('❌ Selecione pelo menos um colaborador'); 
    return; 
  }
  
  const prazo = document.getElementById('atribuir-prazo').value || '31/12/2026';
  const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', '') + 'formacao_colaborador.html';
  const cursoNome = document.getElementById('atribuir-curso').selectedOptions[0]?.text || 'Formação';
  
  linksGerados = [];
  let contadorSucesso = 0;
  
  for (const c of selected) {
    // Verificar se já existe atribuição ativa para este colaborador e curso
    const atribuicaoExistente = cachedAtribuicoes.find(a => 
      a.colaboradorUser === c.user && 
      a.cursoId === cursoId && 
      a.status !== 'concluido'
    );
    
    if (atribuicaoExistente) {
      // Se já existe, reutilizar o link existente
      const link = atribuicaoExistente.link || `${baseUrl}?token=${atribuicaoExistente.token}`;
      linksGerados.push({ ...c, link, prazo, cursoNome, status: 'reutilizado' });
      contadorSucesso++;
      continue;
    }
    
    // Criar novo token
    const tokenData = { 
      user: c.user, 
      nome: c.nome, 
      cursoId: cursoId, 
      cursoNome: cursoNome, 
      prazo: prazo, 
      timestamp: Date.now() 
    };
    
    // Gerar token base64
    let token;
    try {
      token = btoa(JSON.stringify(tokenData)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    } catch(e) {
      console.error('Erro ao gerar token:', e);
      token = Date.now() + '_' + c.user;
    }
    
    const link = `${baseUrl}?token=${token}`;
    localStorage.setItem(`token_${token}`, JSON.stringify(tokenData));
    
    // Criar atribuição no Firebase
    try {
      await addDoc(collection(db, 'atribuicoes'), {
        colaboradorUser: c.user,
        colaboradorNome: c.nome,
        colaboradorEmail: c.email,
        colaboradorMatricula: c.matricula,
        cursoId: cursoId,
        cursoNome: cursoNome,
        prazo: prazo,
        status: 'pendente',
        dataCriacao: new Date().toISOString(),
        token: token,
        link: link
      });
      linksGerados.push({ ...c, link, prazo, cursoNome, status: 'novo' });
      contadorSucesso++;
    } catch(e) { 
      console.error('Erro ao salvar atribuição:', e); 
      showToast(`❌ Erro ao atribuir para ${c.nome}`);
    }
  }
  
  // Mostrar os links gerados (apenas visualização - NÃO ABRE JANELAS)
  const linksList = document.getElementById('links-list');
  const linksGeradosDiv = document.getElementById('links-gerados');
  
  if (linksList && linksGerados.length > 0) {
    linksList.innerHTML = linksGerados.map(l => `
      <div class="item-card" style="flex-direction: column; align-items: stretch; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <strong>${escapeHtml(l.nome || l.user)}</strong>
            ${l.email ? `<span style="font-size:11px; color:var(--birkenstock-gray);">(${escapeHtml(l.email)})</span>` : ''}
            ${l.status === 'reutilizado' ? '<span style="background:var(--info-bg); color:var(--info); padding:2px 6px; border-radius:12px; font-size:10px; margin-left:8px;">Já atribuído</span>' : ''}
          </div>
          <div>
            <button class="btn-sm" onclick="window.copiarLinkIndividual('${l.link}')" style="background:var(--info); color:white; border:none; padding:4px 12px; border-radius:4px; cursor:pointer;">
              📋 Copiar Link
            </button>
          </div>
        </div>
        <div style="margin-top: 8px; padding: 8px; background: var(--bg); border-radius: 6px; font-size: 11px; word-break: break-all; font-family: monospace;">
          ${l.link}
        </div>
        <div style="margin-top: 6px; font-size: 10px; color: var(--birkenstock-gray);">
          📅 Prazo: ${l.prazo}
        </div>
      </div>
    `).join('');
    
    if (linksGeradosDiv) linksGeradosDiv.style.display = 'block';
    showToast(`✅ ${contadorSucesso} link(s) gerado(s) com sucesso!`);
    
    // Atualizar a lista de acompanhamento
    renderAcompanhamento();
  } else if (linksGeradosDiv) {
    showToast('❌ Nenhum link foi gerado');
  }
};

window.copiarLinkIndividual = (link) => { 
  navigator.clipboard.writeText(link).then(() => {
    showToast('🔗 Link copiado para a área de transferência!');
  }).catch(() => {
    // Fallback para browsers mais antigos
    const textarea = document.createElement('textarea');
    textarea.value = link;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('🔗 Link copiado!');
  });
};

window.copiarTodosLinks = () => {
  if (!linksGerados.length) { 
    showToast('❌ Gere links primeiro'); 
    return; 
  }
  let texto = "LINKS DE ACESSO ÀS FORMAÇÕES\n\n";
  texto += "═══════════════════════════════════════\n\n";
  linksGerados.forEach(l => { 
    texto += `👤 ${l.nome || l.user}\n`;
    texto += `📧 ${l.email || 'sem email'}\n`;
    texto += `📅 Prazo: ${l.prazo}\n`;
    texto += `🔗 ${l.link}\n`;
    texto += `───────────────────────────────────────\n\n`;
  });
  navigator.clipboard.writeText(texto);
  showToast(`✅ ${linksGerados.length} links copiados!`);
};

window.enviarEmailsMassa = () => {
  if (!linksGerados.length) { 
    showToast('❌ Gere links primeiro'); 
    return; 
  }
  
  const emailsList = linksGerados.filter(l => l.email).map(l => ({
    nome: l.nome || l.user,
    email: l.email,
    link: l.link,
    prazo: l.prazo,
    curso: l.cursoNome
  }));
  
  if (emailsList.length === 0) {
    showToast('❌ Nenhum colaborador selecionado tem email');
    return;
  }
  
  // Criar modal para envio de emails
  const modalHtml = `
    <div id="modal-emails" class="modal" style="display:flex;">
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h3>📧 Enviar Emails</h3>
          <span class="modal-close" onclick="document.getElementById('modal-emails').remove()">&times;</span>
        </div>
        <div style="max-height: 400px; overflow-y: auto;">
          ${emailsList.map(e => `
            <div style="padding: 12px; border-bottom: 1px solid var(--border);">
              <div><strong>${escapeHtml(e.nome)}</strong> (${escapeHtml(e.email)})</div>
              <div style="font-size: 11px; color: var(--birkenstock-gray);">Formação: ${escapeHtml(e.curso)} | Prazo: ${e.prazo}</div>
              <button class="btn-sm btn-info" onclick="window.abrirEmailIndividual('${e.email}', '${e.nome}', '${e.curso}', '${e.prazo}', '${e.link}')" style="margin-top: 8px; background:var(--info); color:white; border:none; padding:4px 12px; border-radius:4px; cursor:pointer;">
                📧 Enviar Email
              </button>
            </div>
          `).join('')}
        </div>
        <div style="margin-top: 16px; text-align: center;">
          <button class="btn-sm btn-success" onclick="window.enviarTodosEmails()">📧 Enviar Todos</button>
          <button class="btn-sm btn" onclick="document.getElementById('modal-emails').remove()">Fechar</button>
        </div>
      </div>
    </div>
  `;
  
  // Remover modal existente se houver
  const existingModal = document.getElementById('modal-emails');
  if (existingModal) existingModal.remove();
  
  // Adicionar modal ao body
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Guardar lista de emails para envio em massa
  window.emailsPendentes = emailsList;
};

window.abrirEmailIndividual = (email, nome, curso, prazo, link) => {
  const assunto = encodeURIComponent(`[Birkenstock] Formação: ${curso}`);
  const corpo = encodeURIComponent(
    `Olá ${nome},\n\n` +
    `Foi-lhe atribuída a formação "${curso}".\n\n` +
    `Prazo: ${prazo}\n\n` +
    `Aceda através do link:\n${link}\n\n` +
    `Atenciosamente,\nEquipa de Formação Birkenstock`
  );
  window.open(`mailto:${email}?subject=${assunto}&body=${corpo}`);
  showToast(`📧 A abrir email para ${nome}`);
};

window.enviarTodosEmails = () => {
  if (!window.emailsPendentes || window.emailsPendentes.length === 0) {
    showToast('❌ Nenhum email pendente');
    return;
  }
  
  let count = 0;
  window.emailsPendentes.forEach((e, index) => {
    setTimeout(() => {
      const assunto = encodeURIComponent(`[Birkenstock] Formação: ${e.curso}`);
      const corpo = encodeURIComponent(
        `Olá ${e.nome},\n\n` +
        `Foi-lhe atribuída a formação "${e.curso}".\n\n` +
        `Prazo: ${e.prazo}\n\n` +
        `Aceda através do link:\n${e.link}\n\n` +
        `Atenciosamente,\nEquipa de Formação Birkenstock`
      );
      window.open(`mailto:${e.email}?subject=${assunto}&body=${corpo}`);
      count++;
    }, index * 500);
  });
  
  showToast(`📧 A abrir ${window.emailsPendentes.length} janelas de email...`);
  setTimeout(() => {
    const modal = document.getElementById('modal-emails');
    if (modal) modal.remove();
  }, window.emailsPendentes.length * 500 + 1000);
};

// ==================== ACOMPANHAMENTO ====================

async function renderAcompanhamento() {
  const atribuicoes = await carregarAtribuicoes();
  const formacoes = await carregarFormacoes();
  
  const filtroFormacao = document.getElementById('filtro-formacao-acompanhar')?.value || '';
  const filtroStatus = document.getElementById('filtro-status-acompanhar')?.value || '';
  
  let filtered = [...atribuicoes];
  if (filtroFormacao) filtered = filtered.filter(a => a.cursoId === filtroFormacao);
  if (filtroStatus) filtered = filtered.filter(a => a.status === filtroStatus);
  
  const container = document.getElementById('acompanhar-lista');
  if (!container) return;
  
  if (!filtered.length) {
    container.innerHTML = '<div class="empty">Nenhuma atribuição encontrada.</div>';
    return;
  }
  
  // Agrupar por formação
  const grouped = {};
  filtered.forEach(a => {
    if (!grouped[a.cursoId]) grouped[a.cursoId] = { nome: a.cursoNome, atribuicoes: [] };
    grouped[a.cursoId].atribuicoes.push(a);
  });
  
  container.innerHTML = Object.values(grouped).map(g => `
    <div class="acompanhar-card">
      <h4>📘 ${escapeHtml(g.nome)}</h4>
      <div class="acompanhar-sub">
        <h5>✅ Concluídos (${g.atribuicoes.filter(a => a.status === 'concluido').length})</h5>
        <div class="acompanhar-lista">
          ${g.atribuicoes.filter(a => a.status === 'concluido').map(a => `
            <div class="acompanhar-item concluido">
              <span>${escapeHtml(a.colaboradorNome || a.colaboradorUser)}</span>
              <button onclick="window.visualizarCertificadoAtribuicao('${a.id}')" title="Ver certificado" style="background:none; border:none; cursor:pointer;">🎓</button>
            </div>
          `).join('') || '<span style="color:gray;">Nenhum</span>'}
        </div>
      </div>
      <div class="acompanhar-sub">
        <h5>⏳ Pendentes (${g.atribuicoes.filter(a => a.status !== 'concluido').length})</h5>
        <div class="acompanhar-lista">
          ${g.atribuicoes.filter(a => a.status !== 'concluido').map(a => `
            <div class="acompanhar-item pendente">
              <span>${escapeHtml(a.colaboradorNome || a.colaboradorUser)}</span>
              <span style="font-size:10px;">Prazo: ${a.prazo || '---'}</span>
              <button onclick="window.relembrarColaborador('${a.id}')" title="Enviar lembrete" style="background:none; border:none; cursor:pointer;">📧</button>
            </div>
          `).join('') || '<span style="color:gray;">Nenhum</span>'}
        </div>
      </div>
    </div>
  `).join('');
}

window.relembrarColaborador = async (atribuicaoId) => {
  const atribuicao = cachedAtribuicoes.find(a => a.id === atribuicaoId);
  if (!atribuicao) return;
  
  const link = atribuicao.link || (window.location.origin + window.location.pathname.replace('admin.html', '') + 'formacao_colaborador.html?token=' + atribuicao.token);
  const assunto = encodeURIComponent(`[Birkenstock] Lembrete: ${atribuicao.cursoNome}`);
  const corpo = encodeURIComponent(
    `Olá ${atribuicao.colaboradorNome || atribuicao.colaboradorUser},\n\n` +
    `Recordamos que ainda tem pendente a formação "${atribuicao.cursoNome}".\n\n` +
    `Prazo: ${atribuicao.prazo}\n\n` +
    `Aceda através do link:\n${link}\n\n` +
    `Atenciosamente,\nEquipa de Formação Birkenstock`
  );
  window.open(`mailto:${atribuicao.colaboradorEmail}?subject=${assunto}&body=${corpo}`);
  showToast(`📧 Email de lembrete aberto para ${atribuicao.colaboradorNome}`);
};

window.visualizarCertificadoAtribuicao = async (atribuicaoId) => {
  const atribuicao = cachedAtribuicoes.find(a => a.id === atribuicaoId);
  if (!atribuicao) return;
  
  // Buscar no histórico a conclusão correspondente
  const historico = await carregarHistorico();
  const registro = historico.find(h => h.nome === atribuicao.colaboradorUser && h.curso === atribuicao.cursoNome);
  if (!registro) {
    showToast('❌ Certificado não encontrado.');
    return;
  }
  
  // Gerar certificado HTML
  const certId = 'CERT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  const fundoImagem = certTemplate.fundoImagem || 'imagens/fundo_certificado.png';
  
  const certHtml = `
    <div id="certificado-visualizacao-pdf" style="background-image: url('${fundoImagem}'); background-size: cover; background-position: center; width: 100%; aspect-ratio: 210/297; position: relative; padding: 40px; box-sizing: border-box;">
      <div style="text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-family: 'Fraunces', serif; font-size: 2rem; font-weight: 900; color: #00338D;">${escapeHtml(registro.nome)}</div>
        <div style="font-size: 1.2rem; margin: 20px 0;">concluiu com sucesso a formação</div>
        <div style="font-family: 'Fraunces', serif; font-size: 1.5rem; font-weight: 700; color: #C5A059;">${escapeHtml(registro.curso)}</div>
        <div style="margin-top: 40px; display: flex; justify-content: center; gap: 40px;">
          <div><div>NOTA FINAL</div><div style="font-size: 1.3rem;">${registro.nota}</div></div>
          <div><div>DATA</div><div>${registro.data}</div></div>
          <div><div>CERTIFICADO ID</div><div>${certId}</div></div>
        </div>
      </div>
    </div>
  `;
  
  const modal = document.getElementById('modal-certificado');
  const content = document.getElementById('certificado-visualizacao');
  if (content) content.innerHTML = certHtml;
  if (modal) modal.style.display = 'flex';
  
  // Guardar referência para impressão/PDF
  window.certificadoAtual = { html: certHtml, nome: registro.nome };
};

window.imprimirCertificadoModal = () => {
  const element = document.getElementById('certificado-visualizacao-pdf');
  if (!element) return;
  html2canvas(element, { scale: 3 }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><body style="margin:0;padding:0;"><img src="${imgData}" style="width:100%;height:auto;"></body>
      <script>window.onload=function(){window.print();setTimeout(window.close,1000);}<\/script>
    `);
    printWindow.document.close();
  });
};

window.baixarPDFCertificadoModal = async () => {
  const element = document.getElementById('certificado-visualizacao-pdf');
  if (!element) return;
  const canvas = await html2canvas(element, { scale: 3 });
  const imgData = canvas.toDataURL('image/png');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`certificado_${window.certificadoAtual?.nome || 'colaborador'}.pdf`);
  showToast('✅ PDF guardado!');
};

window.exportarAcompanhamentoExcel = async () => {
  const atribuicoes = await carregarAtribuicoes();
  if (!atribuicoes.length) { showToast('❌ Sem dados para exportar'); return; }
  const dados = atribuicoes.map(a => ({
    'Formação': a.cursoNome,
    'Colaborador': a.colaboradorNome || a.colaboradorUser,
    'Matrícula': a.colaboradorMatricula || '',
    'Email': a.colaboradorEmail || '',
    'Prazo': a.prazo || '',
    'Status': a.status === 'concluido' ? 'Concluído' : 'Pendente',
    'Data Conclusão': a.dataConclusao ? formatDate(a.dataConclusao) : ''
  }));
  downloadExcel(dados, 'acompanhamento_formacoes', 'Acompanhamento');
};

// ==================== PUBLICAÇÃO ====================

async function publicarFormacao() {
  const titulo = document.getElementById('f-titulo').value.trim();
  if (!titulo) { showToast('❌ Título obrigatório'); return; }
  if (!modulos.length) { showToast('❌ Adicione pelo menos um módulo'); return; }
  if (!perguntas.length) { showToast('❌ Adicione pelo menos uma pergunta'); return; }
  
  const novaFormacao = { 
    nome: titulo, 
    duracao: document.getElementById('f-duracao').value || '30 min', 
    descricao: document.getElementById('f-descricao').value, 
    modulos: [...modulos], 
    perguntas: perguntas.map(p => ({texto: p.texto, opcoes: p.opcoes, correta: p.correta})), 
    data: new Date().toLocaleDateString('pt-PT'), 
    dataTimestamp: Date.now() 
  };
  
  try {
    if (editandoFormacaoId) {
      await updateDoc(doc(db, 'formacoes', editandoFormacaoId), novaFormacao);
      showToast(`✅ Formação "${titulo}" atualizada!`);
      editandoFormacaoId = null;
      document.getElementById('editando-id').innerHTML = '';
      document.getElementById('btn-cancelar-edicao').style.display = 'none';
    } else {
      await addDoc(collection(db, 'formacoes'), novaFormacao);
      showToast(`✅ Formação "${titulo}" publicada!`);
    }
    
    document.getElementById('f-titulo').value = ''; 
    document.getElementById('f-duracao').value = ''; 
    document.getElementById('f-descricao').value = '';
    modulos = []; 
    perguntas = [];
    renderModulos(); 
    renderPerguntas(); 
    renderFormacoesLista(); 
    atualizarSelectores(); 
    atualizarDashboard();
  } catch(error) { 
    console.error('Erro:', error); 
    showToast('❌ Erro ao publicar formação.'); 
  }
}

// ==================== HISTÓRICO ====================

async function renderHistorico() {
  const historico = await carregarHistorico();
  const tbody = document.getElementById('lista-notas');
  const colaboradores = await carregarColaboradores();
  const filtro = document.getElementById('filtro-colaborador-historico')?.value || '';
  
  let filtered = [...historico];
  if (filtro) filtered = filtered.filter(h => h.nome === filtro);
  
  // Popular filtro de colaboradores
  const filtroSelect = document.getElementById('filtro-colaborador-historico');
  if (filtroSelect && filtroSelect.options.length <= 1) {
    const nomes = [...new Set(historico.map(h => h.nome))];
    filtroSelect.innerHTML = '<option value="">Todos</option>' + nomes.map(n => `<option value="${n}">${escapeHtml(n)}</option>`).join('');
  }
  
  if (!tbody) return;
  
  if (!filtered.length) { 
    tbody.innerHTML = '发展<td colspan="6" class="empty">Nenhum resultado registado</td></tr>'; 
    return; 
  }
  
  tbody.innerHTML = filtered.map(h => {
    const colab = colaboradores.find(c => c.user === h.nome);
    const email = colab?.email || h.email || '-';
    return `
      <tr>
        <td data-label="Colaborador"><strong>${escapeHtml(h.nome)}</strong></td>
        <td data-label="Email">${escapeHtml(email)}</td>
        <td data-label="Formação">${escapeHtml(h.curso)}</td>
        <td data-label="Data">${escapeHtml(h.data)}</td>
        <td data-label="Nota"><span class="badge badge-success">${escapeHtml(h.nota)}</span></td>
        <td data-label="Certificado"><button class="btn-sm" onclick="window.visualizarCertificadoHistorico('${h.id}')">📄 Ver</button></td>
      </tr>
    `;
  }).join('');
}

window.visualizarCertificadoHistorico = async (historicoId) => {
  const historico = await carregarHistorico();
  const registro = historico.find(h => h.id === historicoId);
  if (!registro) return;
  
  const certId = 'CERT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  const fundoImagem = certTemplate.fundoImagem || 'imagens/fundo_certificado.png';
  
  const certHtml = `
    <div id="certificado-visualizacao-pdf" style="background-image: url('${fundoImagem}'); background-size: cover; background-position: center; width: 100%; aspect-ratio: 210/297; position: relative; padding: 40px; box-sizing: border-box;">
      <div style="text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-family: 'Fraunces', serif; font-size: 2rem; font-weight: 900; color: #00338D;">${escapeHtml(registro.nome)}</div>
        <div style="font-size: 1.2rem; margin: 20px 0;">concluiu com sucesso a formação</div>
        <div style="font-family: 'Fraunces', serif; font-size: 1.5rem; font-weight: 700; color: #C5A059;">${escapeHtml(registro.curso)}</div>
        <div style="margin-top: 40px; display: flex; justify-content: center; gap: 40px;">
          <div><div>NOTA FINAL</div><div style="font-size: 1.3rem;">${registro.nota}</div></div>
          <div><div>DATA</div><div>${registro.data}</div></div>
          <div><div>CERTIFICADO ID</div><div>${certId}</div></div>
        </div>
      </div>
    </div>
  `;
  
  const modal = document.getElementById('modal-certificado');
  const content = document.getElementById('certificado-visualizacao');
  if (content) content.innerHTML = certHtml;
  if (modal) modal.style.display = 'flex';
  window.certificadoAtual = { html: certHtml, nome: registro.nome };
};

window.exportarHistoricoCSV = () => { 
  showToast('📥 Exportação CSV em breve'); 
};

window.exportarHistoricoExcel = async () => {
  const historico = await carregarHistorico();
  if (!historico.length) { showToast('❌ Sem dados para exportar'); return; }
  const dados = historico.map(h => ({
    'Colaborador': h.nome,
    'Email': h.email || '',
    'Formação': h.curso,
    'Data': h.data,
    'Nota': h.nota
  }));
  downloadExcel(dados, 'historico_formacoes', 'Histórico');
};

window.limparHistorico = async () => { 
  if (confirm('Apagar todo o histórico de formações?')) { 
    const historico = await carregarHistorico();
    for (const item of historico) {
      await deleteDoc(doc(db, 'historico', item.id));
    }
    renderHistorico(); 
    atualizarDashboard();
    renderAcompanhamento();
    showToast('✅ Histórico limpo!');
  } 
};

// ==================== CERTIFICADO ====================

window.inserirPlaceholder = (ph) => { 
  const textarea = document.getElementById('cert-texto');
  if (textarea) textarea.value += ph; 
};

window.previewCertificado = () => {
  const preview = document.getElementById('cert-preview');
  const content = document.getElementById('cert-preview-content');
  const fundoImagem = document.getElementById('cert-fundo-imagem')?.value || '';
  let texto = document.getElementById('cert-texto')?.value || '';
  const titulo = document.getElementById('cert-titulo')?.value || '';
  const rodape = document.getElementById('cert-rodape')?.value || '';
  
  const dadosExemplo = { 
    nome: "João Silva", 
    formacao: "Formação Teste", 
    data: new Date().toLocaleDateString('pt-PT'), 
    nota: "85%", 
    validade: "2027", 
    certificado_id: "CERT-001" 
  };
  
  Object.entries(dadosExemplo).forEach(([k,v]) => { 
    texto = texto.replace(new RegExp(`{{${k}}}`, 'g'), v); 
  });
  
  const fundoStyle = fundoImagem ? `background-image: url('${fundoImagem}'); background-size: cover; background-position: center;` : '';
  
  if (content) {
    content.innerHTML = `
      <div style="text-align:center;padding:20px;border:2px solid var(--birkenstock-gold);border-radius:16px;${fundoStyle} min-height:300px;">
        <h2 style="color:var(--birkenstock-blue);">${escapeHtml(titulo)}</h2>
        <div style="margin:20px 0;">${texto.replace(/\n/g,'<br>')}</div>
        <div style="margin-top:20px; font-size:12px;">${escapeHtml(rodape)}</div>
      </div>
    `;
  }
  if (preview) preview.style.display = 'block';
};

window.salvarTemplateCertificado = () => {
  certTemplate = { 
    fundoImagem: document.getElementById('cert-fundo-imagem')?.value || '',
    titulo: document.getElementById('cert-titulo')?.value || '', 
    texto: document.getElementById('cert-texto')?.value || '', 
    rodape: document.getElementById('cert-rodape')?.value || '' 
  };
  localStorage.setItem('cert_template', JSON.stringify(certTemplate));
  showToast('✅ Template salvo!');
};

window.resetTemplateCertificado = () => {
  certTemplate = JSON.parse(JSON.stringify(defaultCert));
  const fundoInput = document.getElementById('cert-fundo-imagem');
  const tituloInput = document.getElementById('cert-titulo');
  const textoInput = document.getElementById('cert-texto');
  const rodapeInput = document.getElementById('cert-rodape');
  if (fundoInput) fundoInput.value = certTemplate.fundoImagem;
  if (tituloInput) tituloInput.value = certTemplate.titulo;
  if (textoInput) textoInput.value = certTemplate.texto;
  if (rodapeInput) rodapeInput.value = certTemplate.rodape;
  showToast('✅ Template restaurado!');
};

function carregarTemplateCertificado() {
  const saved = localStorage.getItem('cert_template');
  if (saved) {
    const template = JSON.parse(saved);
    const fundoInput = document.getElementById('cert-fundo-imagem');
    const tituloInput = document.getElementById('cert-titulo');
    const textoInput = document.getElementById('cert-texto');
    const rodapeInput = document.getElementById('cert-rodape');
    if (fundoInput) fundoInput.value = template.fundoImagem || '';
    if (tituloInput) tituloInput.value = template.titulo || '';
    if (textoInput) textoInput.value = template.texto || '';
    if (rodapeInput) rodapeInput.value = template.rodape || '';
  }
}

// ==================== SEGURANÇA ====================

window.checkPasswordStrength = (pass) => { 
  let s = 0; 
  if (pass.length >= 8) s++; 
  if (/[A-Z]/.test(pass)) s++; 
  if (/[0-9]/.test(pass)) s++; 
  if (/[^a-zA-Z0-9]/.test(pass)) s++; 
  const d = document.getElementById('password-strength'); 
  if (d) {
    d.className = 'password-strength'; 
    if (s <= 1) d.classList.add('strength-weak'); 
    else if (s <= 2) d.classList.add('strength-medium'); 
    else d.classList.add('strength-strong'); 
  }
};

window.alterarPasswordAdmin = () => { 
  const atual = document.getElementById('admin-pass-atual')?.value; 
  const nova = document.getElementById('admin-pass-nova')?.value; 
  const conf = document.getElementById('admin-pass-confirm')?.value; 
  
  if (atual !== adminConfig.adminPassword) { showToast('❌ Password atual incorreta'); return; } 
  if (nova !== conf) { showToast('❌ Passwords não coincidem'); return; } 
  if (nova.length < 6) { showToast('❌ Mínimo 6 caracteres'); return; } 
  
  adminConfig.adminPassword = nova; 
  localStorage.setItem('admin_config', JSON.stringify(adminConfig)); 
  showToast('✅ Password alterada!'); 
  
  const atualInput = document.getElementById('admin-pass-atual');
  const novaInput = document.getElementById('admin-pass-nova');
  const confInput = document.getElementById('admin-pass-confirm');
  if (atualInput) atualInput.value = ''; 
  if (novaInput) novaInput.value = ''; 
  if (confInput) confInput.value = ''; 
};

// ==================== EDIÇÃO DE FORMAÇÃO ====================

window.editarFormacao = async (id) => {
  const docRef = doc(db, 'formacoes', id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    const tituloInput = document.getElementById('f-titulo');
    const duracaoInput = document.getElementById('f-duracao');
    const descricaoInput = document.getElementById('f-descricao');
    if (tituloInput) tituloInput.value = data.nome;
    if (duracaoInput) duracaoInput.value = data.duracao;
    if (descricaoInput) descricaoInput.value = data.descricao;
    modulos = data.modulos || [];
    perguntas = data.perguntas || [];
    editandoFormacaoId = id;
    renderModulos();
    renderPerguntas();
    const editandoDiv = document.getElementById('editando-id');
    const cancelarBtn = document.getElementById('btn-cancelar-edicao');
    if (editandoDiv) editandoDiv.innerHTML = `✏️ Editando: ${escapeHtml(data.nome)}`;
    if (cancelarBtn) cancelarBtn.style.display = 'inline-block';
    switchTab('formacao');
  }
};

window.cancelarEdicao = () => {
  editandoFormacaoId = null;
  const tituloInput = document.getElementById('f-titulo');
  const duracaoInput = document.getElementById('f-duracao');
  const descricaoInput = document.getElementById('f-descricao');
  if (tituloInput) tituloInput.value = '';
  if (duracaoInput) duracaoInput.value = '';
  if (descricaoInput) descricaoInput.value = '';
  modulos = [];
  perguntas = [];
  renderModulos();
  renderPerguntas();
  const editandoDiv = document.getElementById('editando-id');
  const cancelarBtn = document.getElementById('btn-cancelar-edicao');
  if (editandoDiv) editandoDiv.innerHTML = '';
  if (cancelarBtn) cancelarBtn.style.display = 'none';
};

// ==================== UTILITÁRIOS ====================

function fecharModal(id) { 
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none'; 
}

function switchTab(tabId) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  const secAtiva = document.getElementById(`sec-${tabId}`);
  if (secAtiva) secAtiva.classList.add('active');
  
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tabAtiva = document.querySelector(`.tab[data-tab="${tabId}"]`);
  if (tabAtiva) tabAtiva.classList.add('active');
  
  if (tabId === 'colaboradores') renderColabs();
  if (tabId === 'historico') renderHistorico();
  if (tabId === 'atribuir') atualizarSelectores();
  if (tabId === 'dashboard') atualizarDashboard();
  if (tabId === 'lista-formacoes') renderFormacoesLista();
  if (tabId === 'certificado') carregarTemplateCertificado();
  if (tabId === 'acompanhar') renderAcompanhamento();
}

// ==================== INICIALIZAÇÃO ====================

function setupEventListeners() {
  const btnSaveUser = document.getElementById('btn-save-user');
  const btnPublicar = document.getElementById('btn-publicar');
  const btnLimpar = document.getElementById('btn-limpar');
  const btnGerarLinks = document.getElementById('btn-gerar-links');
  const btnSalvarModulo = document.getElementById('btn-salvar-modulo');
  const btnSalvarPergunta = document.getElementById('btn-salvar-pergunta');
  const btnCancelarEdicao = document.getElementById('btn-cancelar-edicao');
  const importCsv = document.getElementById('import-csv');
  const btnDownloadModelo = document.getElementById('btn-download-modelo');
  
  if (btnSaveUser) btnSaveUser.addEventListener('click', saveUser);
  if (btnPublicar) btnPublicar.addEventListener('click', publicarFormacao);
  if (btnLimpar) btnLimpar.addEventListener('click', window.limparHistorico);
  if (btnGerarLinks) btnGerarLinks.addEventListener('click', window.gerarLinksMassa);
  if (btnSalvarModulo) btnSalvarModulo.addEventListener('click', salvarModulo);
  if (btnSalvarPergunta) btnSalvarPergunta.addEventListener('click', salvarPergunta);
  if (btnCancelarEdicao) btnCancelarEdicao.addEventListener('click', () => window.cancelarEdicao());
  
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  
  if (importCsv) importCsv.addEventListener('change', (e) => {
    importColaboradores(e.target.files);
  });
  
  if (btnDownloadModelo) btnDownloadModelo.addEventListener('click', downloadModeloCSV);
  
  // Filtros da aba acompanhar
  const filtroFormacao = document.getElementById('filtro-formacao-acompanhar');
  const filtroStatus = document.getElementById('filtro-status-acompanhar');
  if (filtroFormacao) filtroFormacao.addEventListener('change', () => renderAcompanhamento());
  if (filtroStatus) filtroStatus.addEventListener('change', () => renderAcompanhamento());
  
  // Filtro histórico
  const filtroHistorico = document.getElementById('filtro-colaborador-historico');
  if (filtroHistorico) filtroHistorico.addEventListener('change', () => renderHistorico());
}

function initAdmin() {
  const isAdmin = localStorage.getItem('usuarioAdmin');
  if (!isAdmin) {
    window.location.href = 'login.html';
    return;
  }
  
  setupEventListeners();
  renderModulos();
  renderPerguntas();
  renderColabs();
  renderHistorico();
  atualizarSelectores();
  atualizarDashboard();
  renderFormacoesLista();
  carregarTemplateCertificado();
  carregarAtribuicoes().then(() => {
    // Popular filtro de formações no acompanhamento
    carregarFormacoes().then(formacoes => {
      const select = document.getElementById('filtro-formacao-acompanhar');
      if (select) {
        select.innerHTML = '<option value="">Todas</option>' + formacoes.map(f => `<option value="${f.id}">${escapeHtml(f.nome)}</option>`).join('');
      }
    });
    renderAcompanhamento();
  });
}

// Exportar funções globais
window.abrirModalModulo = abrirModalModulo;
window.editarModulo = editarModulo;
window.removerModulo = removerModulo;
window.abrirModalPergunta = abrirModalPergunta;
window.editarPergunta = editarPergunta;
window.removerPergunta = removerPergunta;
window.removerColab = removerColab;
window.copiarLinkIndividual = copiarLinkIndividual;
window.copiarTodosLinks = copiarTodosLinks;
window.enviarEmailsMassa = enviarEmailsMassa;
window.gerarLinksMassa = gerarLinksMassa;
window.selecionarTodos = selecionarTodos;
window.deselecionarTodos = deselecionarTodos;
window.inserirPlaceholder = inserirPlaceholder;
window.previewCertificado = previewCertificado;
window.salvarTemplateCertificado = salvarTemplateCertificado;
window.resetTemplateCertificado = resetTemplateCertificado;
window.alterarPasswordAdmin = alterarPasswordAdmin;
window.checkPasswordStrength = checkPasswordStrength;
window.exportarHistoricoCSV = exportarHistoricoCSV;
window.exportarHistoricoExcel = exportarHistoricoExcel;
window.limparHistorico = limparHistorico;
window.editarFormacao = editarFormacao;
window.cancelarEdicao = cancelarEdicao;
window.exportarColaboradoresExcel = exportarColaboradoresExcel;
window.exportarAcompanhamentoExcel = exportarAcompanhamentoExcel;
window.relembrarColaborador = relembrarColaborador;
window.visualizarCertificadoAtribuicao = visualizarCertificadoAtribuicao;
window.visualizarCertificadoHistorico = visualizarCertificadoHistorico;
window.imprimirCertificadoModal = imprimirCertificadoModal;
window.baixarPDFCertificadoModal = baixarPDFCertificadoModal;
window.abrirEmailIndividual = abrirEmailIndividual;
window.enviarTodosEmails = enviarTodosEmails;

document.addEventListener('DOMContentLoaded', initAdmin);
