// ============================================
// ADMIN - LÓGICA PRINCIPAL
// ============================================

let formacoes = [];
let colaboradores = [];
let atribuicoes = [];
let historicos = [];
let modulos = [];
let perguntas = [];
let editandoModuloId = null;
let editandoPerguntaId = null;
let moduloTipoAtual = 'video';
let editandoFormacaoId = null;
let linksGerados = [];

const defaultCert = {
  fundoImagem: "assets/fundo_certificado.png",
  titulo: "Certificado de Formação",
  texto: "Certifica-se que {{nome}} concluiu {{formacao}} com {{nota}}.\nEmitido em {{data}}.",
  rodape: "Direção de Formação"
};
let certTemplate = JSON.parse(localStorage.getItem('cert_template') || JSON.stringify(defaultCert));

// ==================== DADOS DE EXEMPLO ====================
function carregarDadosExemplo() {
  // Formações de exemplo
  if (localStorage.getItem('formacoes')) {
    formacoes = JSON.parse(localStorage.getItem('formacoes'));
  } else {
    formacoes = [
      {
        id: "1",
        nome: "Atendimento ao Cliente",
        descricao: "Aprenda técnicas de atendimento ao cliente para garantir a satisfação dos consumidores.",
        duracao: "45 minutos",
        icone: "💬",
        modulos: [
          { id: "m1", titulo: "Introdução ao Atendimento", tipo: "video", conteudo: { url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, duracao: "10 min" },
          { id: "m2", titulo: "Técnicas de Comunicação", tipo: "texto", conteudo: { texto: "<p>A comunicação eficaz é fundamental para um bom atendimento...</p>" }, duracao: "15 min" }
        ],
        perguntas: [
          { id: "p1", texto: "Qual é a primeira impressão?", opcoes: ["Olhar nos olhos", "Sorriso", "Postura correta", "Todas as anteriores"], correta: "D" }
        ]
      },
      {
        id: "2",
        nome: "Segurança no Trabalho",
        descricao: "Normas e procedimentos de segurança para o ambiente laboral.",
        duracao: "60 minutos",
        icone: "🛡️",
        modulos: [
          { id: "m1", titulo: "EPI's e sua Utilização", tipo: "video", conteudo: { url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }, duracao: "20 min" }
        ],
        perguntas: []
      }
    ];
    localStorage.setItem('formacoes', JSON.stringify(formacoes));
  }

  // Colaboradores de exemplo
  if (localStorage.getItem('colaboradores')) {
    colaboradores = JSON.parse(localStorage.getItem('colaboradores'));
  } else {
    colaboradores = [
      { id: "c1", matricula: "001", user: "joao.silva", nome: "João Silva", email: "joao.silva@birkenstock.pt", pass: "123456" },
      { id: "c2", matricula: "002", user: "maria.santos", nome: "Maria Santos", email: "maria.santos@birkenstock.pt", pass: "123456" }
    ];
    localStorage.setItem('colaboradores', JSON.stringify(colaboradores));
  }

  // Atribuições de exemplo
  if (localStorage.getItem('atribuicoes')) {
    atribuicoes = JSON.parse(localStorage.getItem('atribuicoes'));
  } else {
    atribuicoes = [];
    localStorage.setItem('atribuicoes', JSON.stringify(atribuicoes));
  }

  // Histórico de exemplo
  if (localStorage.getItem('historicos')) {
    historicos = JSON.parse(localStorage.getItem('historicos'));
  } else {
    historicos = [];
    localStorage.setItem('historicos', JSON.stringify(historicos));
  }
}

function salvarFormacoes() {
  localStorage.setItem('formacoes', JSON.stringify(formacoes));
}

function salvarColaboradores() {
  localStorage.setItem('colaboradores', JSON.stringify(colaboradores));
}

function salvarAtribuicoes() {
  localStorage.setItem('atribuicoes', JSON.stringify(atribuicoes));
}

function salvarHistoricos() {
  localStorage.setItem('historicos', JSON.stringify(historicos));
}

// ==================== DASHBOARD ====================
function atualizarDashboard() {
  const totalFormacoes = formacoes.length;
  const totalColaboradores = colaboradores.length;
  const totalAtribuicoes = atribuicoes.length;
  const pendentes = atribuicoes.filter(a => a.status !== 'concluido').length;
  
  const dashboardGrid = document.getElementById('dashboard-grid');
  if (dashboardGrid) {
    dashboardGrid.innerHTML = `
      <div class="dash-card">
        <div class="dash-icon" style="background:var(--info-bg)">📚</div>
        <div class="dash-info">
          <h3>${totalFormacoes}</h3>
          <p>Formações</p>
        </div>
      </div>
      <div class="dash-card">
        <div class="dash-icon" style="background:var(--success-bg)">👥</div>
        <div class="dash-info">
          <h3>${totalColaboradores}</h3>
          <p>Colaboradores</p>
        </div>
      </div>
      <div class="dash-card">
        <div class="dash-icon" style="background:var(--purple-bg)">🏅</div>
        <div class="dash-info">
          <h3>${totalAtribuicoes - pendentes}</h3>
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
  
  const recentes = historicos.slice(-5).reverse();
  const recentActivities = document.getElementById('recent-activities');
  if (recentActivities) {
    recentActivities.innerHTML = recentes.length ? 
      recentes.map(h => `
        <div class="item-card">
          <div class="item-card-info">
            <strong>${window.escapeHtml(h.nome)}</strong> concluiu "${window.escapeHtml(h.curso)}" com ${window.escapeHtml(h.nota)}
          </div>
          <div class="item-card-meta">${window.escapeHtml(h.data)}</div>
        </div>
      `).join('') : 
      '<div class="empty">Sem atividades recentes.</div>';
  }
}

// ==================== GESTÃO DE FORMAÇÕES ====================
function renderFormacoesLista() {
  const container = document.getElementById('formacoes-list');
  if (!container) return;
  
  if (!formacoes.length) {
    container.innerHTML = '<div class="empty">Nenhuma formação criada.</div>';
    return;
  }
  
  container.innerHTML = formacoes.map(curso => `
    <div class="item-card">
      <div class="item-card-info">
        <div class="item-card-title">📘 ${window.escapeHtml(curso.nome)}</div>
        <div class="item-card-meta">${curso.modulos?.length || 0} módulos · ${curso.perguntas?.length || 0} perguntas</div>
      </div>
      <div class="item-card-actions">
        <button onclick="window.editarFormacao('${curso.id}')" style="color:var(--info)">✏️ Editar</button>
        <button onclick="window.apagarFormacao('${curso.id}')" style="color:var(--danger)">🗑️ Apagar</button>
      </div>
    </div>
  `).join('');
}

window.apagarFormacao = (id) => {
  if (!confirm('Apagar esta formação permanentemente?')) return;
  formacoes = formacoes.filter(f => f.id !== id);
  salvarFormacoes();
  renderFormacoesLista();
  atualizarDashboard();
  atualizarSelectores();
  renderAcompanhamento();
  window.showToast('✅ Formação apagada!');
};

// ==================== MÓDULOS ====================
window.abrirModalModulo = (tipo) => {
  moduloTipoAtual = tipo;
  editandoModuloId = null;
  
  document.getElementById('modulo-titulo').value = '';
  document.getElementById('modulo-duracao').value = '';
  document.getElementById('modulo-video-url').value = '';
  document.getElementById('modulo-texto-conteudo').value = '';
  document.getElementById('modulo-link-url').value = '';
  
  document.getElementById('modulo-conteudo-video').style.display = tipo === 'video' ? 'block' : 'none';
  document.getElementById('modulo-conteudo-texto').style.display = tipo === 'texto' ? 'block' : 'none';
  document.getElementById('modulo-conteudo-link').style.display = tipo === 'link' ? 'block' : 'none';
  
  const titulos = { video: '🎬 Adicionar Vídeo', texto: '📄 Adicionar Texto', link: '🔗 Adicionar Link' };
  document.getElementById('modal-modulo-titulo').textContent = titulos[tipo] || 'Adicionar Módulo';
  
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
  document.getElementById('modulo-conteudo-texto').style.display = m.tipo === 'texto' ? 'block' : 'none';
  document.getElementById('modulo-conteudo-link').style.display = m.tipo === 'link' ? 'block' : 'none';
  
  if (m.tipo === 'video') document.getElementById('modulo-video-url').value = m.conteudo?.url || '';
  if (m.tipo === 'texto') document.getElementById('modulo-texto-conteudo').value = m.conteudo?.texto || '';
  if (m.tipo === 'link') document.getElementById('modulo-link-url').value = m.conteudo?.url || '';
  
  document.getElementById('modal-modulo').style.display = 'flex';
};

function salvarModulo() {
  const titulo = document.getElementById('modulo-titulo').value.trim();
  if (!titulo) { window.showToast('❌ Título obrigatório'); return; }
  
  let conteudo = {};
  
  if (moduloTipoAtual === 'video') {
    const url = document.getElementById('modulo-video-url').value.trim();
    if (!url) { window.showToast('❌ URL do vídeo obrigatória'); return; }
    conteudo = { url };
  }
  else if (moduloTipoAtual === 'texto') {
    const texto = document.getElementById('modulo-texto-conteudo').value.trim();
    if (!texto) { window.showToast('❌ Conteúdo obrigatório'); return; }
    conteudo = { texto };
  }
  else if (moduloTipoAtual === 'link') {
    const url = document.getElementById('modulo-link-url').value.trim();
    if (!url) { window.showToast('❌ URL do link obrigatória'); return; }
    conteudo = { url };
  }
  
  const duracao = document.getElementById('modulo-duracao').value.trim() || '15 min';
  
  const novoModulo = {
    id: editandoModuloId || Date.now().toString(),
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
  document.getElementById('modal-modulo').style.display = 'none';
  window.showToast(`✅ Módulo "${titulo}" adicionado!`);
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
    <div class="modulo-card">
      <div style="flex:1">
        <div style="font-weight: 700;">${idx + 1}. ${window.escapeHtml(m.titulo)}</div>
        <div style="font-size: 11px; color: var(--birkenstock-gray);">${m.tipo === 'video' ? '🎬 Vídeo' : m.tipo === 'texto' ? '📄 Texto' : '🔗 Link'} · ${m.duracao}</div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button onclick="window.editarModulo('${m.id}')" style="background: var(--info); color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">✏️</button>
        <button onclick="window.removerModulo('${m.id}')" style="background: var(--danger); color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">🗑️</button>
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
  if (!texto) { window.showToast('Texto da pergunta obrigatório'); return; }
  const opcoes = [
    document.getElementById('pergunta-opcao-a').value.trim(),
    document.getElementById('pergunta-opcao-b').value.trim(),
    document.getElementById('pergunta-opcao-c').value.trim(),
    document.getElementById('pergunta-opcao-d').value.trim()
  ];
  if (opcoes.some(o => !o)) { window.showToast('Todas as opções são obrigatórias'); return; }
  const correta = document.getElementById('pergunta-correta').value;
  
  if (editandoPerguntaId) {
    const idx = perguntas.findIndex(p => p.id === editandoPerguntaId);
    if (idx !== -1) perguntas[idx] = { ...perguntas[idx], texto, opcoes, correta };
  } else {
    perguntas.push({ id: Date.now().toString(), texto, opcoes, correta });
  }
  renderPerguntas();
  document.getElementById('modal-pergunta').style.display = 'none';
  window.showToast('✅ Pergunta adicionada!');
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
    <div class="pergunta-card">
      <div style="margin-bottom: 8px;"><strong>${idx + 1}. ${window.escapeHtml(p.texto)}</strong></div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
        <div>A) ${window.escapeHtml(p.opcoes[0])}</div>
        <div>B) ${window.escapeHtml(p.opcoes[1])}</div>
        <div>C) ${window.escapeHtml(p.opcoes[2])}</div>
        <div>D) ${window.escapeHtml(p.opcoes[3])}</div>
      </div>
      <div style="margin-top: 8px; font-size: 11px; color: var(--success);">✅ Correta: ${p.correta}</div>
      <div style="margin-top: 8px; display: flex; gap: 8px; justify-content: flex-end;">
        <button onclick="window.editarPergunta('${p.id}')" style="background: var(--info); color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">✏️ Editar</button>
        <button onclick="window.removerPergunta('${p.id}')" style="background: var(--danger); color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">🗑️ Remover</button>
      </div>
    </div>
  `).join('');
}

// ==================== COLABORADORES ====================
function renderColabs() {
  const tbody = document.getElementById('colab-list-table');
  if (!tbody) return;
  
  if (!colaboradores.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">Nenhum colaborador cadastrado.</td></tr>';
    return;
  }
  
  tbody.innerHTML = colaboradores.map(c => `
    <tr>
      <td data-label="Matrícula">${window.escapeHtml(c.matricula || '-')}</td>
      <td data-label="Nome">${window.escapeHtml(c.nome || c.user)}</td>
      <td data-label="Email">${window.escapeHtml(c.email || '-')}</td>
      <td data-label="Ações">
        <button class="btn-sm btn-danger" onclick="window.removerColab('${c.id}')">🗑️ Remover</button>
      </td>
    </tr>
  `).join('');
}

window.removerColab = (id) => {
  if (confirm('Remover colaborador?')) {
    colaboradores = colaboradores.filter(c => c.id !== id);
    salvarColaboradores();
    renderColabs();
    atualizarSelectores();
    atualizarDashboard();
    renderAcompanhamento();
    window.showToast('✅ Colaborador removido!');
  }
};

async function saveUser() {
  const matricula = document.getElementById('u-matricula').value.trim();
  const nome = document.getElementById('u-nome').value.trim();
  const email = document.getElementById('u-email').value.trim();
  const pass = document.getElementById('u-pass').value;
  const user = nome.toLowerCase().replace(/\s+/g, '.');
  
  if (!nome || !pass) { window.showToast('❌ Preencha nome e password.'); return; }
  
  const novoColab = {
    id: Date.now().toString(),
    matricula,
    user,
    nome,
    email,
    pass,
    dataCriacao: new Date().toISOString()
  };
  
  colaboradores.push(novoColab);
  salvarColaboradores();
  
  window.showToast('✅ Colaborador criado!');
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
  reader.onload = function(e) {
    const lines = e.target.result.split('\n');
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 2) {
        const matricula = parts[0].trim();
        const nome = parts[1].trim();
        const email = parts[2] ? parts[2].trim() : '';
        const pass = parts[3] ? parts[3].trim() : 'birkenstock2024';
        const user = nome.toLowerCase().replace(/\s+/g, '.');
        if (nome && pass) {
          colaboradores.push({
            id: Date.now().toString() + imported,
            matricula, user, nome, email, pass,
            dataCriacao: new Date().toISOString()
          });
          imported++;
        }
      }
    }
    salvarColaboradores();
    window.showToast(`✅ Importados ${imported} colaboradores!`);
    renderColabs();
    atualizarSelectores();
    atualizarDashboard();
    renderAcompanhamento();
  };
  reader.readAsText(files[0], 'UTF-8');
}

function downloadModeloCSV() {
  const csv = "matricula,nome,email,password\n001,João Silva,joao.silva@empresa.pt,birkenstock2024\n002,Maria Santos,maria.santos@empresa.pt,birkenstock2024";
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'modelo_colaboradores.csv';
  link.click();
}

window.exportarColaboradoresExcel = () => {
  if (!colaboradores.length) { window.showToast('❌ Sem colaboradores para exportar'); return; }
  const dados = colaboradores.map(c => ({
    'Matrícula': c.matricula || '',
    'Nome': c.nome || c.user,
    'Email': c.email || '',
    'Data Criação': c.dataCriacao ? window.formatDate(c.dataCriacao) : ''
  }));
  window.downloadExcel(dados, 'colaboradores', 'Colaboradores');
};

// ==================== ATRIBUIÇÃO EM MASSA ====================
function atualizarSelectores() {
  const atribuirCurso = document.getElementById('atribuir-curso');
  const colabGrid = document.getElementById('colab-selector-grid');
  
  if (atribuirCurso) {
    atribuirCurso.innerHTML = '<option value="">Selecione uma formação</option>' +
      formacoes.map(c => `<option value="${c.id}">${window.escapeHtml(c.nome)}</option>`).join('');
  }
  
  if (colabGrid) {
    colabGrid.innerHTML = colaboradores.map(c => `
      <label class="colab-check">
        <input type="checkbox" value="${c.user}" data-email="${c.email || ''}" data-nome="${c.nome || c.user}" data-matricula="${c.matricula || ''}">
        ${window.escapeHtml(c.nome || c.user)} ${c.matricula ? `(${c.matricula})` : ''}
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

window.gerarLinksMassa = () => {
  const cursoId = document.getElementById('atribuir-curso').value;
  if (!cursoId) { window.showToast('❌ Selecione uma formação'); return; }
  
  const selected = Array.from(document.querySelectorAll('#colab-selector-grid input:checked')).map(cb => ({
    user: cb.value,
    email: cb.dataset.email,
    nome: cb.dataset.nome || cb.value,
    matricula: cb.dataset.matricula
  }));
  
  if (!selected.length) { window.showToast('❌ Selecione pelo menos um colaborador'); return; }
  
  const prazo = document.getElementById('atribuir-prazo').value || '31/12/2026';
  const cursoNome = document.getElementById('atribuir-curso').selectedOptions[0]?.text || 'Formação';
  const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', '') + 'formacao.html';
  
  linksGerados = [];
  let contadorSucesso = 0;
  
  for (const c of selected) {
    const atribuicaoExistente = atribuicoes.find(a =>
      a.colaboradorUser === c.user && a.cursoId === cursoId && a.status !== 'concluido'
    );
    
    if (atribuicaoExistente) {
      const link = atribuicaoExistente.link || `${baseUrl}?token=${atribuicaoExistente.token}`;
      linksGerados.push({ ...c, link, prazo, cursoNome, status: 'reutilizado' });
      contadorSucesso++;
      continue;
    }
    
    const tokenData = {
      user: c.user,
      nome: c.nome,
      cursoId: cursoId,
      cursoNome: cursoNome,
      prazo: prazo,
      timestamp: Date.now()
    };
    
    let token;
    try {
      token = btoa(JSON.stringify(tokenData)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    } catch(e) {
      token = Date.now() + '_' + c.user;
    }
    
    const link = `${baseUrl}?token=${token}`;
    localStorage.setItem(`token_${token}`, JSON.stringify(tokenData));
    
    const novaAtribuicao = {
      id: Date.now().toString(),
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
    };
    atribuicoes.push(novaAtribuicao);
    linksGerados.push({ ...c, link, prazo, cursoNome, status: 'novo' });
    contadorSucesso++;
  }
  salvarAtribuicoes();
  
  const linksList = document.getElementById('links-list');
  const linksGeradosDiv = document.getElementById('links-gerados');
  
  if (linksList && linksGerados.length > 0) {
    linksList.innerHTML = linksGerados.map(l => `
      <div class="item-card" style="flex-direction: column; align-items: stretch;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
          <div>
            <strong>${window.escapeHtml(l.nome || l.user)}</strong>
            ${l.status === 'reutilizado' ? '<span style="background:var(--info-bg); color:var(--info); padding:2px 6px; border-radius:12px; font-size:10px; margin-left:8px;">Já atribuído</span>' : ''}
          </div>
          <button class="btn-sm" onclick="window.copiarLinkIndividual('${l.link}')" style="background:var(--info); color:white;">📋 Copiar Link</button>
        </div>
        <div style="margin-top: 8px; padding: 8px; background: var(--bg); border-radius: 6px; font-size: 11px; word-break: break-all;">${l.link}</div>
        <div style="margin-top: 6px; font-size: 10px;">📅 Prazo: ${l.prazo}</div>
      </div>
    `).join('');
    linksGeradosDiv.style.display = 'block';
    window.showToast(`✅ ${contadorSucesso} link(s) gerado(s)!`);
    renderAcompanhamento();
  }
};

window.copiarLinkIndividual = (link) => {
  navigator.clipboard.writeText(link).then(() => {
    window.showToast('🔗 Link copiado!');
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = link;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    window.showToast('🔗 Link copiado!');
  });
};

window.copiarTodosLinks = () => {
  if (!linksGerados.length) { window.showToast('❌ Gere links primeiro'); return; }
  let texto = "LINKS DE ACESSO ÀS FORMAÇÕES\n\n";
  linksGerados.forEach(l => {
    texto += `👤 ${l.nome || l.user}\n📧 ${l.email || 'sem email'}\n📅 Prazo: ${l.prazo}\n🔗 ${l.link}\n───────────────────────\n\n`;
  });
  navigator.clipboard.writeText(texto);
  window.showToast(`✅ ${linksGerados.length} links copiados!`);
};

window.enviarEmailsMassa = () => {
  if (!linksGerados.length) { window.showToast('❌ Gere links primeiro'); return; }
  
  const emailsList = linksGerados.filter(l => l.email).map(l => ({
    nome: l.nome || l.user,
    email: l.email,
    link: l.link,
    prazo: l.prazo,
    curso: l.cursoNome
  }));
  
  if (emailsList.length === 0) {
    window.showToast('❌ Nenhum colaborador tem email');
    return;
  }
  
  emailsList.forEach(e => {
    const assunto = encodeURIComponent(`[Birkenstock] Formação: ${e.curso}`);
    const corpo = encodeURIComponent(
      `Olá ${e.nome},\n\nFoi-lhe atribuída a formação "${e.curso}".\n\nPrazo: ${e.prazo}\n\nAceda através do link:\n${e.link}\n\nAtenciosamente,\nEquipa de Formação Birkenstock`
    );
    window.open(`mailto:${e.email}?subject=${assunto}&body=${corpo}`);
  });
  window.showToast(`📧 A abrir ${emailsList.length} emails...`);
};

// ==================== ACOMPANHAMENTO ====================
function renderAcompanhamento() {
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
  
  const grouped = {};
  filtered.forEach(a => {
    if (!grouped[a.cursoId]) grouped[a.cursoId] = { nome: a.cursoNome, atribuicoes: [] };
    grouped[a.cursoId].atribuicoes.push(a);
  });
  
  container.innerHTML = Object.values(grouped).map(g => `
    <div class="acompanhar-card">
      <h4>📘 ${window.escapeHtml(g.nome)}</h4>
      <div class="acompanhar-sub">
        <h5>✅ Concluídos (${g.atribuicoes.filter(a => a.status === 'concluido').length})</h5>
        <div class="acompanhar-lista">
          ${g.atribuicoes.filter(a => a.status === 'concluido').map(a => `
            <div class="acompanhar-item concluido">
              <span>${window.escapeHtml(a.colaboradorNome || a.colaboradorUser)}</span>
              <button onclick="window.visualizarCertificadoAtribuicao('${a.id}')" title="Ver certificado">🎓</button>
            </div>
          `).join('') || '<span style="color:gray;">Nenhum</span>'}
        </div>
      </div>
      <div class="acompanhar-sub">
        <h5>⏳ Pendentes (${g.atribuicoes.filter(a => a.status !== 'concluido').length})</h5>
        <div class="acompanhar-lista">
          ${g.atribuicoes.filter(a => a.status !== 'concluido').map(a => `
            <div class="acompanhar-item pendente">
              <span>${window.escapeHtml(a.colaboradorNome || a.colaboradorUser)}</span>
              <span style="font-size:10px;">Prazo: ${a.prazo || '---'}</span>
              <button onclick="window.relembrarColaborador('${a.id}')" title="Enviar lembrete">📧</button>
            </div>
          `).join('') || '<span style="color:gray;">Nenhum</span>'}
        </div>
      </div>
    </div>
  `).join('');
}

window.relembrarColaborador = (atribuicaoId) => {
  const atribuicao = atribuicoes.find(a => a.id === atribuicaoId);
  if (!atribuicao) return;
  
  const link = atribuicao.link;
  const assunto = encodeURIComponent(`[Birkenstock] Lembrete: ${atribuicao.cursoNome}`);
  const corpo = encodeURIComponent(
    `Olá ${atribuicao.colaboradorNome || atribuicao.colaboradorUser},\n\nRecordamos que ainda tem pendente a formação "${atribuicao.cursoNome}".\n\nPrazo: ${atribuicao.prazo}\n\nAceda através do link:\n${link}\n\nAtenciosamente,\nEquipa de Formação Birkenstock`
  );
  window.open(`mailto:${atribuicao.colaboradorEmail}?subject=${assunto}&body=${corpo}`);
  window.showToast(`📧 Email de lembrete aberto para ${atribuicao.colaboradorNome}`);
};

window.visualizarCertificadoAtribuicao = (atribuicaoId) => {
  const atribuicao = atribuicoes.find(a => a.id === atribuicaoId);
  if (!atribuicao) return;
  
  const registro = historicos.find(h => h.nome === atribuicao.colaboradorUser && h.curso === atribuicao.cursoNome);
  if (!registro) {
    window.showToast('❌ Certificado não encontrado.');
    return;
  }
  
  const certId = window.gerarCertificadoId();
  const fundoImagem = certTemplate.fundoImagem || 'assets/fundo_certificado.png';
  
  const certHtml = `
    <div id="certificado-visualizacao-pdf" style="background-image: url('${fundoImagem}'); background-size: cover; background-position: center; width: 100%; aspect-ratio: 210/297; position: relative; padding: 40px; box-sizing: border-box;">
      <div style="text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-family: 'Fraunces', serif; font-size: 2rem; font-weight: 900; color: #00338D;">${window.escapeHtml(registro.nome)}</div>
        <div style="font-size: 1.2rem; margin: 20px 0;">concluiu com sucesso a formação</div>
        <div style="font-family: 'Fraunces', serif; font-size: 1.5rem; font-weight: 700; color: #C5A059;">${window.escapeHtml(registro.curso)}</div>
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
  window.showToast('✅ PDF guardado!');
};

window.exportarAcompanhamentoExcel = () => {
  if (!atribuicoes.length) { window.showToast('❌ Sem dados para exportar'); return; }
  const dados = atribuicoes.map(a => ({
    'Formação': a.cursoNome,
    'Colaborador': a.colaboradorNome || a.colaboradorUser,
    'Matrícula': a.colaboradorMatricula || '',
    'Email': a.colaboradorEmail || '',
    'Prazo': a.prazo || '',
    'Status': a.status === 'concluido' ? 'Concluído' : 'Pendente',
    'Data Conclusão': a.dataConclusao ? window.formatDate(a.dataConclusao) : ''
  }));
  window.downloadExcel(dados, 'acompanhamento_formacoes', 'Acompanhamento');
};

// ==================== PUBLICAÇÃO ====================
async function publicarFormacao() {
  const titulo = document.getElementById('f-titulo').value.trim();
  if (!titulo) { window.showToast('❌ Título obrigatório'); return; }
  if (!modulos.length) { window.showToast('❌ Adicione pelo menos um módulo'); return; }
  
  const novaFormacao = {
    id: editandoFormacaoId || Date.now().toString(),
    nome: titulo,
    duracao: document.getElementById('f-duracao').value || '30 min',
    descricao: document.getElementById('f-descricao').value,
    modulos: [...modulos],
    perguntas: perguntas.map(p => ({ texto: p.texto, opcoes: p.opcoes, correta: p.correta })),
    dataCriacao: new Date().toLocaleDateString('pt-PT'),
    dataTimestamp: Date.now()
  };
  
  if (editandoFormacaoId) {
    const index = formacoes.findIndex(f => f.id === editandoFormacaoId);
    if (index !== -1) formacoes[index] = novaFormacao;
    window.showToast(`✅ Formação "${titulo}" atualizada!`);
    editandoFormacaoId = null;
    document.getElementById('editando-id').innerHTML = '';
    document.getElementById('btn-cancelar-edicao').style.display = 'none';
  } else {
    formacoes.push(novaFormacao);
    window.showToast(`✅ Formação "${titulo}" publicada!`);
  }
  salvarFormacoes();
  
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
}

// ==================== HISTÓRICO ====================
function renderHistorico() {
  const tbody = document.getElementById('lista-notas');
  const filtro = document.getElementById('filtro-colaborador-historico')?.value || '';
  
  let filtered = [...historicos];
  if (filtro) filtered = filtered.filter(h => h.nome === filtro);
  
  const filtroSelect = document.getElementById('filtro-colaborador-historico');
  if (filtroSelect && filtroSelect.options.length <= 1) {
    const nomes = [...new Set(historicos.map(h => h.nome))];
    filtroSelect.innerHTML = '<option value="">Todos</option>' + nomes.map(n => `<option value="${n}">${window.escapeHtml(n)}</option>`).join('');
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
        <td data-label="Colaborador"><strong>${window.escapeHtml(h.nome)}</strong></td>
        <td data-label="Email">${window.escapeHtml(email)}</td>
        <td data-label="Formação">${window.escapeHtml(h.curso)}</td>
        <td data-label="Data">${window.escapeHtml(h.data)}</td>
        <td data-label="Nota"><span class="badge badge-success">${window.escapeHtml(h.nota)}</span></td>
        <td data-label="Certificado"><button class="btn-sm" onclick="window.visualizarCertificadoHistorico('${h.id}')">📄 Ver</button></td>
      </tr>
    `;
  }).join('');
}

window.visualizarCertificadoHistorico = (historicoId) => {
  const registro = historicos.find(h => h.id === historicoId);
  if (!registro) return;
  
  const certId = registro.certificadoId || window.gerarCertificadoId();
  const fundoImagem = certTemplate.fundoImagem || 'assets/fundo_certificado.png';
  
  const certHtml = `
    <div id="certificado-visualizacao-pdf" style="background-image: url('${fundoImagem}'); background-size: cover; background-position: center; width: 100%; aspect-ratio: 210/297; position: relative; padding: 40px; box-sizing: border-box;">
      <div style="text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center;">
        <div style="font-family: 'Fraunces', serif; font-size: 2rem; font-weight: 900; color: #00338D;">${window.escapeHtml(registro.nome)}</div>
        <div style="font-size: 1.2rem; margin: 20px 0;">concluiu com sucesso a formação</div>
        <div style="font-family: 'Fraunces', serif; font-size: 1.5rem; font-weight: 700; color: #C5A059;">${window.escapeHtml(registro.curso)}</div>
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
  if (!historicos.length) { window.showToast('❌ Sem dados para exportar'); return; }
  const dados = historicos.map(h => ({
    'Colaborador': h.nome,
    'Email': h.email || '',
    'Formação': h.curso,
    'Data': h.data,
    'Nota': h.nota
  }));
  window.downloadExcel(dados, 'historico_formacoes', 'Histórico');
};

window.exportarHistoricoExcel = window.exportarHistoricoCSV;

window.limparHistorico = () => {
  if (confirm('Apagar todo o histórico de formações?')) {
    historicos = [];
    salvarHistoricos();
    renderHistorico();
    atualizarDashboard();
    renderAcompanhamento();
    window.showToast('✅ Histórico limpo!');
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
    certificado_id: "CERT-001"
  };
  
  Object.entries(dadosExemplo).forEach(([k, v]) => {
    texto = texto.replace(new RegExp(`{{${k}}}`, 'g'), v);
  });
  
  const fundoStyle = fundoImagem ? `background-image: url('${fundoImagem}'); background-size: cover; background-position: center;` : '';
  
  if (content) {
    content.innerHTML = `
      <div style="text-align:center;padding:20px;border:2px solid var(--birkenstock-gold);border-radius:16px;${fundoStyle} min-height:300px;">
        <h2 style="color:var(--birkenstock-blue);">${window.escapeHtml(titulo)}</h2>
        <div style="margin:20px 0;">${texto.replace(/\n/g, '<br>')}</div>
        <div style="margin-top:20px; font-size:12px;">${window.escapeHtml(rodape)}</div>
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
  window.showToast('✅ Template salvo!');
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
  window.showToast('✅ Template restaurado!');
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
  const ADMIN_PASS = 'SSA2024admin';
  
  if (atual !== ADMIN_PASS) { window.showToast('❌ Password atual incorreta'); return; }
  if (nova !== conf) { window.showToast('❌ Passwords não coincidem'); return; }
  if (nova.length < 6) { window.showToast('❌ Mínimo 6 caracteres'); return; }
  
  window.showToast('✅ Password alterada! (simulação)');
  document.getElementById('admin-pass-atual').value = '';
  document.getElementById('admin-pass-nova').value = '';
  document.getElementById('admin-pass-confirm').value = '';
};

// ==================== EDIÇÃO DE FORMAÇÃO ====================
window.editarFormacao = (id) => {
  const formacao = formacoes.find(f => f.id === id);
  if (!formacao) return;
  
  document.getElementById('f-titulo').value = formacao.nome;
  document.getElementById('f-duracao').value = formacao.duracao;
  document.getElementById('f-descricao').value = formacao.descricao;
  modulos = formacao.modulos || [];
  perguntas = formacao.perguntas || [];
  editandoFormacaoId = id;
  renderModulos();
  renderPerguntas();
  document.getElementById('editando-id').innerHTML = `✏️ Editando: ${window.escapeHtml(formacao.nome)}`;
  document.getElementById('btn-cancelar-edicao').style.display = 'inline-block';
  switchTab('criar');
};

window.cancelarEdicao = () => {
  editandoFormacaoId = null;
  document.getElementById('f-titulo').value = '';
  document.getElementById('f-duracao').value = '';
  document.getElementById('f-descricao').value = '';
  modulos = [];
  perguntas = [];
  renderModulos();
  renderPerguntas();
  document.getElementById('editando-id').innerHTML = '';
  document.getElementById('btn-cancelar-edicao').style.display = 'none';
};

// ==================== UTILITÁRIOS ====================
function switchTab(tabId) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  const secAtiva = document.getElementById(`sec-${tabId}`);
  if (secAtiva) secAtiva.classList.add('active');
  
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  const tabAtiva = document.querySelector(`.admin-tab[data-tab="${tabId}"]`);
  if (tabAtiva) tabAtiva.classList.add('active');
  
  if (tabId === 'colaboradores') renderColabs();
  if (tabId === 'historico') renderHistorico();
  if (tabId === 'atribuir') atualizarSelectores();
  if (tabId === 'overview') atualizarDashboard();
  if (tabId === 'formacoes') renderFormacoesLista();
  if (tabId === 'certificado') carregarTemplateCertificado();
  if (tabId === 'acompanhar') renderAcompanhamento();
}

// ==================== INICIALIZAÇÃO ====================
function setupEventListeners() {
  const btnSaveUser = document.getElementById('btn-save-user');
  const btnPublicar = document.getElementById('btn-publicar');
  const btnLimpar = document.getElementById('btn-limpar');
  const btnCancelarEdicao = document.getElementById('btn-cancelar-edicao');
  const importCsv = document.getElementById('import-csv');
  const btnDownloadModelo = document.getElementById('btn-download-modelo');
  const btnSalvarModulo = document.getElementById('btn-salvar-modulo');
  const btnSalvarPergunta = document.getElementById('btn-salvar-pergunta');
  
  if (btnSaveUser) btnSaveUser.addEventListener('click', saveUser);
  if (btnPublicar) btnPublicar.addEventListener('click', publicarFormacao);
  if (btnLimpar) btnLimpar.addEventListener('click', window.limparHistorico);
  if (btnCancelarEdicao) btnCancelarEdicao.addEventListener('click', () => window.cancelarEdicao());
  if (btnSalvarModulo) btnSalvarModulo.addEventListener('click', salvarModulo);
  if (btnSalvarPergunta) btnSalvarPergunta.addEventListener('click', salvarPergunta);
  
  document.querySelectorAll('.admin-tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  
  if (importCsv) importCsv.addEventListener('change', (e) => importColaboradores(e.target.files));
  if (btnDownloadModelo) btnDownloadModelo.addEventListener('click', downloadModeloCSV);
  
  const filtroFormacao = document.getElementById('filtro-formacao-acompanhar');
  const filtroStatus = document.getElementById('filtro-status-acompanhar');
  if (filtroFormacao) filtroFormacao.addEventListener('change', () => renderAcompanhamento());
  if (filtroStatus) filtroStatus.addEventListener('change', () => renderAcompanhamento());
  
  const filtroHistorico = document.getElementById('filtro-colaborador-historico');
  if (filtroHistorico) filtroHistorico.addEventListener('change', () => renderHistorico());
}

function initAdmin() {
  const isAdmin = localStorage.getItem('usuarioAdmin');
  if (!isAdmin) {
    window.location.href = 'login.html';
    return;
  }
  
  carregarDadosExemplo();
  setupEventListeners();
  renderModulos();
  renderPerguntas();
  renderColabs();
  renderHistorico();
  atualizarSelectores();
  atualizarDashboard();
  renderFormacoesLista();
  carregarTemplateCertificado();
  renderAcompanhamento();
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

document.addEventListener('DOMContentLoaded', initAdmin);