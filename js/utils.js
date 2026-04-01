// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

// Escape HTML
export function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Formatar data
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('pt-PT');
}

// Formatar data para Excel (YYYY-MM-DD)
export function formatDateForExcel(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// Mostrar toast
let toastTimeout = null;
export function showToast(message, duration = 3000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// Verificar autenticação
export function checkAuth() {
  const usuario = localStorage.getItem('usuarioAtivo');
  const admin = localStorage.getItem('usuarioAdmin');
  if (!usuario && !admin) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Converter link Google Drive
export function converterLinkGoogleDrive(url) {
  if (!url) return url;
  if (!url.includes('drive.google.com')) return url;
  
  let fileId = null;
  let match = url.match(/\/file\/d\/([^\/]+)/);
  if (match) fileId = match[1];
  if (!fileId) {
    match = url.match(/[?&]id=([^&]+)/);
    if (match) fileId = match[1];
  }
  if (!fileId) {
    match = url.match(/\/d\/([^\/]+)/);
    if (match) fileId = match[1];
  }
  
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return url.replace('/view', '/preview').replace('?usp=sharing', '');
}

// Exportar dados para Excel (com colunas)
export function downloadExcel(data, filename, sheetName = 'Dados') {
  if (!data || data.length === 0) {
    showToast('❌ Sem dados para exportar');
    return;
  }
  
  // Converte para array de objetos com todas as chaves
  const wsData = [Object.keys(data[0]), ...data.map(row => Object.values(row))];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
  showToast('✅ Ficheiro Excel exportado!');
}