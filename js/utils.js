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
  end.setDate(end.getDate() + 20); // 3 weeks = 21 days, end is exclusive
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
