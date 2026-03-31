import { db, collection, getDocs, query, orderBy, onSnapshot } from './firebase-config.js';
import { escapeHtml, formatDate, showToast, checkAuth, logout } from './utils.js';
import { getCurrentUser } from './auth.js';

// ============================================
// DASHBOARD - LÓGICA PRINCIPAL
// ============================================

let allCourses = [];
let userProgress = {};
let currentFilter = 'all';
let searchTerm = '';
let notifications = [];

// Inicialização
export async function initDashboard() {
  if (!checkAuth()) return;
  
  const user = getCurrentUser();
  if (!user || user.type !== 'colaborador') {
    window.location.href = 'login.html';
    return;
  }
  
  setupEventListeners();
  loadUserProgress();
  await loadCourses();
  setupNotifications();
}

// Carregar formações em tempo real
async function loadCourses() {
  try {
    const unsubscribe = onSnapshot(
      query(collection(db, 'formacoes'), orderBy('dataTimestamp', 'desc')),
      (querySnapshot) => {
        allCourses = [];
        querySnapshot.forEach((doc) => {
          allCourses.push({ id