import { supabase } from './supabase.js';
import { refreshData } from './store.js';
import { renderCalendar } from './calendar.js';
import { renderDashboard } from './dashboard.js';
import { openGoalModal, setOnClose } from './modal.js';
import { renderAuthScreen, showAuthScreen, showApp } from './auth.js';

async function renderAll() {
  await refreshData();
  renderCalendar();
  renderDashboard();
}

// Re-render everything when any modal closes
setOnClose(() => renderAll());

// New Goal button
document.getElementById('btn-new-goal').addEventListener('click', () => {
  openGoalModal();
});

// Logout button
document.getElementById('btn-logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// Auth state listener
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    showApp();
    await renderAll();
  } else {
    showAuthScreen();
    renderAuthScreen();
  }
});

// Initial check
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  showApp();
  await renderAll();
} else {
  showAuthScreen();
  renderAuthScreen();
}
