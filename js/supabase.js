const SUPABASE_URL = 'https://bjbjhoyhxrodwcvyayvx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYmpob3loeHJvZHdjdnlheXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1OTA0MTUsImV4cCI6MjA5MjE2NjQxNX0.XaVmYxk1lrJWHNJG4pcpsIyNygDfP8RpMo_O8CaIhcg';

const PERSIST_FLAG_KEY = 'calendar.auth.persist';

export function setAuthPersistence(persist) {
  try {
    if (persist) {
      localStorage.setItem(PERSIST_FLAG_KEY, '1');
    } else {
      localStorage.removeItem(PERSIST_FLAG_KEY);
    }
  } catch (_) {}
}

function shouldPersist() {
  try {
    return localStorage.getItem(PERSIST_FLAG_KEY) !== null;
  } catch (_) {
    return true;
  }
}

const hybridStorage = {
  getItem(key) {
    try {
      const s = sessionStorage.getItem(key);
      if (s !== null) return s;
    } catch (_) {}
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  },
  setItem(key, value) {
    if (shouldPersist()) {
      try { localStorage.setItem(key, value); } catch (_) {}
      try { sessionStorage.removeItem(key); } catch (_) {}
    } else {
      try { sessionStorage.setItem(key, value); } catch (_) {}
      try { localStorage.removeItem(key); } catch (_) {}
    }
  },
  removeItem(key) {
    try { sessionStorage.removeItem(key); } catch (_) {}
    try { localStorage.removeItem(key); } catch (_) {}
  },
};

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: hybridStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
