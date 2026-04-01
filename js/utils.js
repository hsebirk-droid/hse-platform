// ============================================
// UTILITÁRIOS GLOBAIS
// ============================================

export function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('pt-PT');
}

export function formatDateForExcel(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

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

export function checkAuth() {
  const usuario = localStorage.getItem('usuarioAtivo');
  const admin = localStorage.getItem('usuarioAdmin');
  return !!(usuario || admin);
}

export function converterLinkGoogleDrive(url) {
  if (!url) return url;
  
  if (url.includes('/preview') || url.includes('youtube.com/embed')) {
    return url;
  }
  
  let fileId = null;
  let match = url.match(/\/file\/d\/([^\/]+)/);
  if (match) fileId = match[1];
  
  if (!fileId) {
    match = url.match(/\/d\/([^\/]+)/);
    if (match) fileId = match[1];
  }
  
  if (!fileId) {
    match = url.match(/[?&]id=([^&]+)/);
    if (match) fileId = match[1];
  }
  
  if (!fileId) {
    match = url.match(/open\?id=([^&]+)/);
    if (match) fileId = match[1];
  }
  
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  
  if (url.includes('youtube.com/watch')) {
    let videoId = url.split('v=')[1]?.split('&')[0];
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }
  
  if (url.includes('youtu.be/')) {
    let videoId = url.split('youtu.be/')[1]?.split('?')[0];
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }
  
  return url;
}

export function gerarCertificadoId() {
  return 'CERT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
}

export function downloadExcel(data, filename, sheetName = 'Dados') {
  if (!data || data.length === 0) {
    showToast('❌ Sem dados para exportar');
    return;
  }
  
  if (typeof XLSX === 'undefined') {
    showToast('❌ Erro: Biblioteca Excel não carregada');
    return;
  }
  
  try {
    const wsData = [Object.keys(data[0]), ...data.map(row => Object.values(row))];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
    showToast('✅ Ficheiro Excel exportado!');
  } catch(e) {
    console.error('Erro ao exportar Excel:', e);
    showToast('❌ Erro ao exportar Excel');
  }
}

// Exportar para uso global (quando não é módulo ES)
if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
  window.formatDate = formatDate;
  window.showToast = showToast;
  window.checkAuth = checkAuth;
  window.converterLinkGoogleDrive = converterLinkGoogleDrive;
  window.gerarCertificadoId = gerarCertificadoId;
  window.downloadExcel = downloadExcel;
}