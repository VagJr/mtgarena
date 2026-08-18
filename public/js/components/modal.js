/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Modal & Toast Components (Scroll Lock & Focus)
   ═══════════════════════════════════════════════════════════════ */

function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    // Check if any other modal is still open
    const hasOpenModal = document.querySelector('.modal-overlay[style*="display: flex"], .booster-modal-overlay[style*="display: flex"], .card-zoom-modal');
    if (!hasOpenModal) {
      document.body.classList.remove('modal-open');
    }
  }
}

function showAuthModal() {
  openModal('auth-modal');
}

function hideAuthModal() {
  closeModal('auth-modal');
  const err = document.getElementById('auth-error');
  if (err) err.style.display = 'none';
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('auth-error').style.display = 'none';
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const data = await API.login(username, password);
    AppState.user = data.user;
    updateAuthUI();
    hideAuthModal();
    showToast(`Bem-vindo, Planeswalker ${data.user.username}! ⚔️`, 'success');
    renderCurrentPage();
  } catch (err) {
    const errDiv = document.getElementById('auth-error');
    errDiv.textContent = err.message;
    errDiv.style.display = 'block';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  try {
    const data = await API.register(username, email, password);
    AppState.user = data.user;
    updateAuthUI();
    hideAuthModal();
    showToast(`Planeswalker ${data.user.username} invocado! 🌟 Você recebeu 1000 Gold e 100 Gems!`, 'success');
    renderCurrentPage();
  } catch (err) {
    const errDiv = document.getElementById('auth-error');
    errDiv.textContent = err.message;
    errDiv.style.display = 'block';
  }
}

function toggleMobileNav() {
  const navLinks = document.getElementById('nav-links');
  const toggleBtn = document.getElementById('mobile-toggle');
  if (navLinks) navLinks.classList.toggle('open');
  if (toggleBtn) toggleBtn.classList.toggle('active');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.style.display = 'none';
    const hasOpen = document.querySelector('.modal-overlay[style*="display: flex"], .booster-modal-overlay[style*="display: flex"]');
    if (!hasOpen) document.body.classList.remove('modal-open');
  }
});

// Close mobile nav on link click or outside click
document.addEventListener('click', (e) => {
  if (e.target.closest('.nav-link')) {
    document.getElementById('nav-links')?.classList.remove('open');
    document.getElementById('mobile-toggle')?.classList.remove('active');
  }
});
