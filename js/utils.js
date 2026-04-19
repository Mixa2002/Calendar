export function generateId() {
  return crypto.randomUUID();
}

export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getThreeWeekRange() {
  const monday = getMonday(new Date());
  const start = new Date(monday);
  const end = new Date(monday);
  end.setDate(end.getDate() + 20); // 3 weeks = 21 days, inclusive end date
  return { start, end };
}

export function getDaysInRange(start, dayCount) {
  const days = [];
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

export function isToday(dateStr) {
  return dateStr === formatDate(new Date());
}

export function getMonthLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function sanitizeColor(color) {
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#546B41';
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function getContrastTextColor(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#2d2a24' : '#ffffff';
}

export function announce(message) {
  const el = document.getElementById('status-announce');
  if (el) {
    el.textContent = '';
    requestAnimationFrame(() => { el.textContent = message; });
  }
}

export function showAppMessage(message) {
  const el = document.getElementById('app-message');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

export function clearAppMessage() {
  const el = document.getElementById('app-message');
  if (!el) return;
  el.hidden = true;
  el.textContent = '';
}
