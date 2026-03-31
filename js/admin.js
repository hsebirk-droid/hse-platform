import { 
  db, storage, 
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc, 
  query, orderBy, onSnapshot, ref, uploadBytes, getDownloadURL 
} from './firebase-config.js';
import { escapeHtml, formatDate, showToast, converterLinkGoogleDrive } from './utils.js';

// ============================================
// ADMIN - LÓGICA PRINCIPAL
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
      if (document.getElementById('sec-lista-formacoes').classList.contains('active')) {
        renderFormacoesLista();
      }
      if (document.getElementById('sec-dashboard').classList.contains('active')) {
        atualizarDashboard();
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
      if (document.getElementById('sec-colaboradores').classList.contains('active')) {
        renderColabs();
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
      if (document.getElementById('sec-historico').classList.contains('active')) {
        renderHistorico();
      }
      if (document.getElementById('sec-dashboard').classList.contains('active')) {
        atualizarDashboard();
      }
    }
  );
  return cachedHistorico;
}

// ==================== DASHBOARD ====================

async function atualizarDashboard() {
  const cursos = await carregarFormacoes();
  const colaboradores = await carregarColaboradores();
  const historico = await carregarHistorico();
  
  document.getElementById('dashboard-grid').innerHTML = `
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
        <h3>${historico.length}</h3>
        <p>Certificados</p>
      </div>
    </div>
  `;
  
  const recentes = historico.slice(0, 5);
  document.getElementById('recent-activities').innerHTML = recentes.length ? 
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

// ==================== GESTÃO DE FORMAÇÕES ====================

async function renderFormacoesLista() {
  const cursos = await carregarFormacoes();
  const container = document.getElementById('formacoes-list');
  
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

// ==================== COLABORADORES ====================

async function renderColabs() {
  const colaboradores = await carregarColaboradores();
  const container = document.getElementById('colab-list');
  
  if (!colaboradores.length) { 
    container.innerHTML = '<div class="empty">Nenhum colaborador cadastrado.</div>'; 
    return; 
  }
  
  container.innerHTML = colaboradores.map((c) => `
    <div class="item-card">
      <div class="item-card-info">
        <strong>${escapeHtml(c.user)}</strong>
        <div class="item-card-meta">${escapeHtml(c.email || 'sem email')}</div>
      </div>
      <div class="item-card-actions">
        <button onclick="window.removerColab('${c.id}')" style="color:var(--danger)">🗑️ Remover</button>
      </div>
    </div>
  `).join('');
}

window.removerColab = async (id) => { 
  if (confirm('Remover colaborador?')) { 
    await deleteDoc(doc(db, 'colaboradores', id)); 
    renderColabs(); 
    atualizarSelectores(); 
    atualizarDashboard(); 
  } 
};

async function saveUser() {
  const user = document.getElementById('u-nome').value.trim().toLowerCase();
  const email = document.getElementById('u-email').value.trim();
  const pass = document.getElementById('u-pass').value;
  
  if (!user || !pass) { showToast('Preencha utilizador e password.'); return; }
  
  await addDoc(collection(db, 'colaboradores'), { 
    user, email, pass, 
    dataCriacao: new Date().toISOString() 
  });
  
  showToast('✅ Colaborador criado!');
  document.getElementById('u-nome').value = ''; 
  document.getElementById('u-email').value = ''; 
  document.getElementById('u-pass').value = '';
  renderColabs(); 
  atualizarSelectores(); 
  atualizarDashboard();
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
        const user = parts[0].trim().toLowerCase(); 
        const pass = parts[1].trim(); 
        const email = parts[2].trim(); 
        if (user && pass) { 
          await addDoc(collection(db, 'colaboradores'), { user, email, pass, dataCriacao: new Date().toISOString() }); 
          imported++; 
        } 
      } 
    } 
    showToast(`✅ Importados ${imported} colaboradores!`); 
    renderColabs(); 
    atualizarSelectores(); 
    atualizarDashboard(); 
  }; 
  reader.readAsText(files[0], 'UTF-8'); 
}

function downloadModeloCSV() { 
  const csv = "utilizador,password,email\njoao.silva,pass123,joao@empresa.pt\nmaria.santos,ssa456,maria@empresa.pt"; 
  const blob = new Blob([csv], {type:'text/csv'}); 
  const link = document.createElement('a'); 
  link.href = URL.createObjectURL(blob); 
  link.download = 'modelo_colaboradores.csv'; 
  link.click(); 
}

// ==================== ATRIBUIÇÃO EM MASSA ====================

async function atualizarSelectores() {
  const cursos = await carregarFormacoes();
  const colaboradores = await carregarColaboradores();
  
  document.getElementById('atribuir-curso').innerHTML = '<option value="">Selecione uma formação</option>' + 
    cursos.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('');
  
  document.getElementById('colab-selector-grid').innerHTML = colaboradores.map(c => `
    <label class="colab-check">
      <input type="checkbox" value="${c.user}" data-email="${c.email || ''}" data-nome="${c.user}"> 
      ${escapeHtml(c.user)} ${c.email ? '(' + escapeHtml(c.email) + ')' : ''}
    </label>
  `).join('');
}

window.selecionarTodos = () => { 
  document.querySelectorAll('#colab-selector-grid input').forEach(cb => cb.checked = true); 
};

window.deselecionarTodos = () => { 
  document.querySelectorAll('#colab-selector-grid input').forEach(cb => cb.checked = false); 
};

window.gerarLinksMassa = () => {
  const cursoId = document.getElementById('atribuir-curso').value; 
  if (!cursoId) { showToast('Selecione uma formação'); return; }
  
  const selected = Array.from(document.querySelectorAll('#colab-selector-grid input:checked')).map(cb => { 
    return { user: cb.value, email: cb.dataset.email, nome: cb.dataset.nome || cb.value }; 
  });
  
  if (!selected.length) { showToast('Selecione colaboradores'); return; }
  
  const prazo = document.getElementById('atribuir-prazo').value || '31/12/2026';
  const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', '') + 'formacao_colaborador.html';
  const cursoNome = document.getElementById('atribuir-curso').selectedOptions[0]?.text || 'Formação';
  
  linksGerados = selected.map(c => {
    const tokenData = { user: c.user, nome: c.nome, cursoId: cursoId, cursoNome: cursoNome, prazo: prazo, timestamp: Date.now() }; 
    const token = btoa(JSON.stringify(tokenData)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const link = `${baseUrl}?token=${token}`;
    localStorage.setItem(`token_${token}`, JSON.stringify(tokenData));
    return { ...c, link, prazo, cursoNome }; 
  });
  
  document.getElementById('links-list').innerHTML = linksGerados.map(l => `
    <div class="item-card" style="flex-direction: column; align-items: stretch;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
        <div><strong>${escapeHtml(l.nome || l.user)}</strong> ${l.email ? `<span style="font-size:11px;">(${escapeHtml(l.email)})</span>` : ''}</div>
        <div><button class="btn-sm" onclick="window.copiarLinkIndividual('${l.link}')">📋 Copiar</button></div>
      </div>
      <div style="margin-top: 8px; padding: 8px; background: var(--bg); border-radius: 6px; font-size: 11px; word-break: break-all;">${l.link}</div>
    </div>
  `).join('');
  document.getElementById('links-gerados').style.display = 'block';
  showToast(`✅ ${linksGerados.length} link(s) gerados!`);
};

window.copiarLinkIndividual = (link) => { 
  navigator.clipboard.writeText(link); 
  showToast('🔗 Link copiado!'); 
};

window.copiarTodosLinks = () => {
  if (!linksGerados.length) { showToast('Gere links primeiro'); return; }
  let texto = "LINKS DE ACESSO ÀS FORMAÇÕES\n\n";
  linksGerados.forEach(l => { texto += `${l.nome || l.user}: ${l.link}\n`; });
  navigator.clipboard.writeText(texto);
  showToast(`✅ ${linksGerados.length} links copiados!`);
};

window.enviarEmailsMassa = () => {
  if (!linksGerados.length) { showToast('Gere links primeiro'); return; }
  let abertos = 0;
  linksGerados.forEach(l => {
    if (l.email) {
      const assunto = encodeURIComponent(`[Birkenstock] Nova formação: ${l.cursoNome}`);
      const corpo = encodeURIComponent(`Olá ${l.nome || l.user},\n\nFoi-lhe atribuída a formação "${l.cursoNome}".\n\nPrazo: ${l.prazo}\n\nAceda através do link:\n${l.link}\n\nAtenciosamente,\nEquipa de Formação`);
      window.open(`mailto:${l.email}?subject=${assunto}&body=${corpo}`);
      abertos++;
    }
  });
  showToast(`📧 Foram abertas ${abertos} janelas de email.\nPara cada uma, clique em "Enviar".`);
};

// ==================== PUBLICAÇÃO ====================

async function publicarFormacao() {
  const titulo = document.getElementById('f-titulo').value.trim();
  if (!titulo) { showToast('Título obrigatório'); return; }
  if (!modulos.length) { showToast('Adicione pelo menos um módulo'); return; }
  if (!perguntas.length) { showToast('Adicione pelo menos uma pergunta'); return; }
  
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
  
  if (!historico.length) { 
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum resultado registado</td></tr>'; 
    return; 
  }
  
  tbody.innerHTML = historico.map(h => `
    <tr>
      <td><strong>${escapeHtml(h.nome)}</strong></td>
      <td>${escapeHtml(h.email || '-')}</td>
      <td>${escapeHtml(h.curso)}</td>
      <td>${escapeHtml(h.data)}</td>
      <td><span class="badge badge-success">${escapeHtml(h.nota)}</span></td>
      <td><button class="btn-sm" onclick="alert('Certificado de ${escapeHtml(h.nome)}')">📄 Ver</button></td>
    </tr>
  `).join('');
}

window.exportarHistoricoCSV = () => { showToast('📥 Exportação CSV em breve'); };
window.exportarHistoricoExcel = () => { showToast('📊 Exportação Excel em breve'); };

window.limparHistorico = async () => { 
  if (confirm('Apagar todo o histórico de formações?')) { 
    const historico = await carregarHistorico();
    for (const item of historico) {
      await deleteDoc(doc(db, 'historico', item.id));
    }
    renderHistorico(); 
    atualizarDashboard();
    showToast('✅ Histórico limpo!');
  } 
};

// ==================== CERTIFICADO ====================

window.inserirPlaceholder = (ph) => { 
  document.getElementById('cert-texto').value += ph; 
};

window.previewCertificado = () => {
  const preview = document.getElementById('cert-preview');
  const content = document.getElementById('cert-preview-content');
  const fundoImagem = document.getElementById('cert-fundo-imagem').value || '';
  let texto = document.getElementById('cert-texto').value;
  const titulo = document.getElementById('cert-titulo').value;
  const rodape = document.getElementById('cert-rodape').value;
  
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
  
  content.innerHTML = `
    <div style="text-align:center;padding:20px;border:2px solid var(--birkenstock-gold);border-radius:16px;${fundoStyle} min-height:300px;">
      <h2 style="color:var(--birkenstock-blue);">${escapeHtml(titulo)}</h2>
      <div style="margin:20px 0;">${texto.replace(/\n/g,'<br>')}</div>
      <div style="margin-top:20px; font-size:12px;">${escapeHtml(rodape)}</div>
    </div>
  `;
  preview.style.display = 'block';
};

window.salvarTemplateCertificado = () => {
  certTemplate = { 
    fundoImagem: document.getElementById('cert-fundo-imagem').value,
    titulo: document.getElementById('cert-titulo').value, 
    texto: document.getElementById('cert-texto').value, 
    rodape: document.getElementById('cert-rodape').value 
  };
  localStorage.setItem('cert_template', JSON.stringify(certTemplate));
  showToast('✅ Template salvo!');
};

window.resetTemplateCertificado = () => {
  certTemplate = JSON.parse(JSON.stringify(defaultCert));
  document.getElementById('cert-fundo-imagem').value = certTemplate.fundoImagem;
  document.getElementById('cert-titulo').value = certTemplate.titulo;
  document.getElementById('cert-texto').value = certTemplate.texto;
  document.getElementById('cert-rodape').value = certTemplate.rodape;
  showToast('✅ Template restaurado!');
};

function carregarTemplateCertificado() {
  const saved = localStorage.getItem('cert_template');
  if (saved) {
    const template = JSON.parse(saved);
    document.getElementById('cert-fundo-imagem').value = template.fundoImagem || '';
    document.getElementById('cert-titulo').value = template.titulo || '';
    document.getElementById('cert-texto').value = template.texto || '';
    document.getElementById('cert-rodape').value = template.rodape || '';
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
  d.className = 'password-strength'; 
  if (s <= 1) d.classList.add('strength-weak'); 
  else if (s <= 2) d.classList.add('strength-medium'); 
  else d.classList.add('strength-strong'); 
};

window.alterarPasswordAdmin = () => { 
  const atual = document.getElementById('admin-pass-atual').value; 
  const nova = document.getElementById('admin-pass-nova').value; 
  const conf = document.getElementById('admin-pass-confirm').value; 
  
  if (atual !== adminConfig.adminPassword) { showToast('❌ Password atual incorreta'); return; } 
  if (nova !== conf) { showToast('❌ Passwords não coincidem'); return; } 
  if (nova.length < 6) { showToast('❌ Mínimo 6 caracteres'); return; } 
  
  adminConfig.adminPassword = nova; 
  localStorage.setItem('admin_config', JSON.stringify(adminConfig)); 
  showToast('✅ Password alterada!'); 
  
  document.getElementById('admin-pass-atual').value = ''; 
  document.getElementById('admin-pass-nova').value = ''; 
  document.getElementById('admin-pass-confirm').value = ''; 
};

// ==================== EDIÇÃO DE FORMAÇÃO ====================

window.editarFormacao = async (id) => {
  const docRef = doc(db, 'formacoes', id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    document.getElementById('f-titulo').value = data.nome;
    document.getElementById('f-duracao').value = data.duracao;
    document.getElementById('f-descricao').value = data.descricao;
    modulos = data.modulos || [];
    perguntas = data.perguntas || [];
    editandoFormacaoId = id;
    renderModulos();
    renderPerguntas();
    document.getElementById('editando-id').innerHTML = `✏️ Editando: ${escapeHtml(data.nome)}`;
    document.getElementById('btn-cancelar-edicao').style.display = 'inline-block';
    switchTab('formacao');
  }
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

function fecharModal(id) { 
  document.getElementById(id).style.display = 'none'; 
}

function switchTab(tabId) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.getElementById(`sec-${tabId}`).classList.add('active');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
  
  if (tabId === 'colaboradores') renderColabs();
  if (tabId === 'historico') renderHistorico();
  if (tabId === 'atribuir') atualizarSelectores();
  if (tabId === 'dashboard') atualizarDashboard();
  if (tabId === 'lista-formacoes') renderFormacoesLista();
  if (tabId === 'certificado') carregarTemplateCertificado();
}

// ==================== INICIALIZAÇÃO ====================

function setupEventListeners() {
  document.getElementById('btn-save-user').addEventListener('click', saveUser);
  document.getElementById('btn-publicar').addEventListener('click', publicarFormacao);
  document.getElementById('btn-limpar').addEventListener('click', window.limparHistorico);
  document.getElementById('btn-gerar-links').addEventListener('click', window.gerarLinksMassa);
  document.getElementById('btn-salvar-modulo').addEventListener('click', salvarModulo);
  document.getElementById('btn-salvar-pergunta').addEventListener('click', salvarPergunta);
  document.getElementById('btn-cancelar-edicao').addEventListener('click', () => window.cancelarEdicao());
  
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  
  // Import CSV
  document.getElementById('import-csv').addEventListener('change', (e) => {
    importColaboradores(e.target.files);
  });
  
  // Download modelo CSV
  document.querySelector('#sec-colaboradores .btn-sm.btn')?.addEventListener('click', downloadModeloCSV);
}

// Inicializar
function initAdmin() {
  // Verificar se é admin
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
window.converterLinkGoogleDrive = converterLinkGoogleDrive;

// Iniciar
document.addEventListener('DOMContentLoaded', initAdmin);