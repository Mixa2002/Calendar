import { supabase, setAuthPersistence } from './supabase.js';

export function renderAuthScreen(initialError = '') {
  const container = document.getElementById('auth-screen');
  container.innerHTML = `
    <div class="auth-card">
      <div class="auth-header">
        <svg class="auth-icon" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <h1>Calendar</h1>
        <p>Track your goals and tasks</p>
      </div>
      <div id="auth-tabs" class="auth-tabs">
        <button class="auth-tab active" data-tab="login">Log In</button>
        <button class="auth-tab" data-tab="signup">Sign Up</button>
      </div>
      <form id="auth-form">
        <div class="form-group">
          <label for="auth-email">Email</label>
          <input type="email" id="auth-email" required placeholder="you@example.com" autocomplete="email">
        </div>
        <div class="form-group">
          <label for="auth-password">Password</label>
          <input type="password" id="auth-password" required placeholder="Min 6 characters" minlength="6" autocomplete="current-password">
        </div>
        <div class="form-group auth-stay" id="auth-stay-group">
          <label class="auth-checkbox">
            <input type="checkbox" id="auth-stay" checked>
            <span>Stay signed in</span>
          </label>
        </div>
        <div id="auth-error" class="auth-error" style="display:none"></div>
        <button type="submit" class="btn btn-primary auth-submit" id="auth-submit">Log In</button>
      </form>
    </div>
  `;

  let mode = 'login';

  container.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.tab;
      container.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === mode));
      document.getElementById('auth-submit').textContent = mode === 'login' ? 'Log In' : 'Sign Up';
      document.getElementById('auth-password').setAttribute('autocomplete', mode === 'login' ? 'current-password' : 'new-password');
      document.getElementById('auth-stay-group').style.display = mode === 'login' ? '' : 'none';
      hideError();
    });
  });

  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const submitBtn = document.getElementById('auth-submit');

    submitBtn.disabled = true;
    submitBtn.textContent = mode === 'login' ? 'Logging in...' : 'Signing up...';
    hideError();

    let result;
    try {
      if (mode === 'login') {
        const stay = document.getElementById('auth-stay').checked;
        setAuthPersistence(stay);
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        setAuthPersistence(true);
        result = await supabase.auth.signUp({ email, password });
      }
    } catch (err) {
      showError(err?.message || 'Unable to reach authentication service. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = mode === 'login' ? 'Log In' : 'Sign Up';
      return;
    }

    if (result.error) {
      showError(result.error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = mode === 'login' ? 'Log In' : 'Sign Up';
      return;
    }

    if (mode === 'signup' && result.data?.user && !result.data.session) {
      showError('Check your email to confirm your account, then log in.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In';
      mode = 'login';
      container.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'login'));
      return;
    }

    // Auth state change listener in app.js will handle the rest
  });

  if (initialError) {
    showError(initialError);
  }
}

function showError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError() {
  const el = document.getElementById('auth-error');
  if (el) el.style.display = 'none';
}

export function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-container').style.display = 'none';
}

export function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-container').style.display = 'block';
}
