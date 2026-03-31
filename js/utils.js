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
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

export function isValidEmail(email) {
  const re = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
  return re.test(email);
}

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

export function generateId() {
  return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
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

export function logout() {
  if (confirm('Deseja sair da plataforma?')) {
    localStorage.removeItem('usuarioAtivo');
    localStorage.removeItem('usuarioAdmin');
    localStorage.removeItem('cursoAtualId');
    localStorage.removeItem('cursoConcluido');
    window.location.href = 'login.html';
  }
}
