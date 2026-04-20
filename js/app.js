// ── Service Worker registration ────────────────────────────────────────────
// Registered here (a 'self'-origin module) to satisfy the Content-Security-Policy
// which blocks inline <script> tags.  The 'load' event ensures the SW registers
// after the page is interactive so it does not delay first render.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('[SW] Registered, scope:', reg.scope))
      .catch((err) => console.warn('[SW] Registration failed:', err));
  });
}

import { supabase } from './supabase.js';
import { refreshData } from './store.js';
import { renderCalendar } from './calendar.js';
import { renderDashboard } from './dashboard.js';
import { openGoalModal, setOnClose } from './modal.js';
import { renderAuthScreen, showAuthScreen, showApp } from './auth.js';
import { clearAppMessage, escapeHtml, showAppMessage } from './utils.js';

// ── iOS viewport height fix ─────────────────────────────────────────────────
// In iOS Safari standalone mode, `100vh` includes the status bar, causing
// overflow.  We set --vh to the true inner height so CSS can use
// calc(var(--vh, 1dvh) * 100) as a reliable full-height value on older iOS
// where 100dvh is not yet supported.
function setVh() {
  document.documentElement.style.setProperty('--vh', window.innerHeight * 0.01 + 'px');
}
setVh();
window.addEventListener('resize', setVh);

// ── Bottom navigation tab switching (mobile only) ───────────────────────────
// Tracks which tab is active so panels can be shown/hidden via CSS.
// On desktop the bottom nav is hidden and both panels are always visible.
let activeTab = 'calendar';

function initBottomNav() {
  const appContainer = document.getElementById('app-container');
  const bottomNav = document.getElementById('bottom-nav');
  if (!bottomNav) return;

  // Set initial state
  appContainer.dataset.activeTab = activeTab;

  bottomNav.addEventListener('click', (e) => {
    const tab = e.target.closest('.bottom-nav-tab');
    if (!tab) return;

    const newTab = tab.dataset.tab;
    if (newTab === activeTab) return;

    activeTab = newTab;
    appContainer.dataset.activeTab = activeTab;

    // Update aria-selected and active class on all tabs
    bottomNav.querySelectorAll('.bottom-nav-tab').forEach(t => {
      const isActive = t.dataset.tab === activeTab;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  });
}

// Initialise tab nav immediately (DOM is ready at module execution time)
initBottomNav();

async function renderAll() {
  try {
    await refreshData();
    renderCalendar();
    renderDashboard();
    clearAppMessage();
  } catch (err) {
    showAppMessage(err.message || 'Unable to load your data right now.');
    renderLoadError(err.message || 'Unable to load your data right now.');
  }
}

function renderLoadError(message) {
  document.getElementById('calendar-panel').innerHTML = `
    <div class="empty-state">
      <p>Could not load your calendar</p>
      <p class="empty-hint">${escapeHtml(message)}</p>
    </div>`;
  document.getElementById('dashboard-panel').innerHTML = `
    <div class="empty-state">
      <p>Could not load your goals</p>
      <p class="empty-hint">Retry by refreshing the page after your connection or session recovers.</p>
    </div>`;
}

async function handleSession(session) {
  if (session) {
    showApp();
    clearAppMessage();
    await renderAll();
    return;
  }

  clearAppMessage();
  showAuthScreen();
  renderAuthScreen();
}

// Re-render everything when any modal closes
setOnClose((mutated) => {
  if (mutated) void renderAll();
});

// New Goal button
document.getElementById('btn-new-goal').addEventListener('click', () => {
  openGoalModal();
});

// Logout button
document.getElementById('btn-logout').addEventListener('click', async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (err) {
    showAppMessage(err.message || 'Failed to log out.');
  }
});

// Initial check
try {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  await handleSession(session);
} catch (err) {
  showAuthScreen();
  renderAuthScreen(err.message || 'Unable to verify your session. Please try again.');
}

// Auth state listener
supabase.auth.onAuthStateChange(async (_event, session) => {
  await handleSession(session);
});
