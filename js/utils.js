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
  if (!usuario && !admin) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

export function converterLinkGoogleDrive(url) {
  if (!url) return url;
  
  // Se já for um link de embed, retornar
  if (url.includes('/preview') || url.includes('youtube.com/embed')) {
    return url;
  }
  
  // Extrair ID do Google Drive
  let fileId = null;
  
  // Formato: /file/d/ID/view
  let match = url.match(/\/file\/d\/([^\/]+)/);
  if (match) fileId = match[1];
  
  // Formato: /d/ID
  if (!fileId) {
    match = url.match(/\/d\/([^\/]+)/);
    if (match) fileId = match[1];
  }
  
  // Formato: ?id=ID
  if (!fileId) {
    match = url.match(/[?&]id=([^&]+)/);
    if (match) fileId = match[1];
  }
  
  // Formato: /open?id=ID
  if (!fileId) {
    match = url.match(/open\?id=([^&]+)/);
    if (match) fileId = match[1];
  }
  
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  
  // Converter YouTube para embed
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

export function downloadExcel(data, filename, sheetName = 'Dados') {
  if (!data || data.length === 0) {
    showToast('❌ Sem dados para exportar');
    return;
  }
  
  // Verificar se XLSX está disponível
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
