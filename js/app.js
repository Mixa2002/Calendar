import { supabase } from './supabase.js';
import { refreshData } from './store.js';
import { renderCalendar } from './calendar.js';
import { renderDashboard } from './dashboard.js';
import { openGoalModal, setOnClose } from './modal.js';
import { renderAuthScreen, showAuthScreen, showApp } from './auth.js';
import { clearAppMessage, escapeHtml, showAppMessage } from './utils.js';

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
