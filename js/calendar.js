import { formatDate, getDaysInRange, getMonday, getMonthLabel, isToday } from './utils.js';
import { getTasksForDate, toggleTask, getGoalById } from './store.js';
import { openTaskModal } from './modal.js';
import { renderDashboard } from './dashboard.js';

let viewMode = '3weeks'; // '3weeks' or 'month'
let monthOffset = 0; // 0 = current month, +1 = next, -1 = prev

export function renderCalendar() {
  const container = document.getElementById('calendar-panel');
  const todayStr = formatDate(new Date());

  // Toolbar: view toggle + month nav
  let html = '<div class="calendar-toolbar">';
  html += '<div class="view-toggle">';
  html += `<button class="${viewMode === '3weeks' ? 'active' : ''}" data-mode="3weeks">3 Weeks</button>`;
  html += `<button class="${viewMode === 'month' ? 'active' : ''}" data-mode="month">Month</button>`;
  html += '</div>';

  if (viewMode === 'month') {
    const viewDate = new Date();
    viewDate.setDate(1);
    viewDate.setMonth(viewDate.getMonth() + monthOffset);
    const label = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    html += '<div class="month-nav">';
    html += '<button id="month-prev" aria-label="Previous month">&#8249;</button>';
    html += `<span class="month-label">${label}</span>`;
    html += '<button id="month-next" aria-label="Next month">&#8250;</button>';
    if (monthOffset !== 0) {
      html += '<button class="btn-today" id="month-today">Today</button>';
    }
    html += '</div>';
  }

  html += '</div>';

  if (viewMode === '3weeks') {
    html += renderThreeWeeks(todayStr);
  } else {
    html += renderMonth(todayStr);
  }

  container.innerHTML = html;
  wireEvents(container, todayStr);
}

function getWeekLabel(monday) {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  const startLabel = monday.toLocaleDateString('en-US', opts);
  const endLabel = sunday.toLocaleDateString('en-US', opts);
  // Get ISO week number
  const d = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `Week ${weekNo}  ·  ${startLabel} – ${endLabel}`;
}

function renderThreeWeeks(todayStr) {
  const monday = getMonday(new Date());
  const days = getDaysInRange(monday, 21);

  const months = new Set(days.map(d => getMonthLabel(d)));
  const headerText = [...months].join(' / ');

  let html = `<div class="calendar-header">${headerText}</div>`;
  html += '<div class="calendar-grid">';
  html += dayLabelsHtml();

  for (let i = 0; i < days.length; i++) {
    // Insert week label at the start of each week
    if (i % 7 === 0) {
      const weekMonday = days[i];
      html += `<div class="week-label">${getWeekLabel(weekMonday)}</div>`;
    }
    const weekIndex = Math.floor(i / 7);
    const isAlt = weekIndex % 2 === 1;
    html += renderDayCell(days[i], todayStr, false, isAlt);
  }

  html += '</div>';
  return html;
}

function renderMonth(todayStr) {
  const viewDate = new Date();
  viewDate.setDate(1);
  viewDate.setMonth(viewDate.getMonth() + monthOffset);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Find the Monday on or before the 1st of the month
  const firstOfMonth = new Date(year, month, 1);
  const startMonday = getMonday(firstOfMonth);

  // Find the last day of the month, then the Sunday on or after
  const lastOfMonth = new Date(year, month + 1, 0);
  const lastDay = lastOfMonth.getDay();
  const endSunday = new Date(lastOfMonth);
  if (lastDay !== 0) {
    endSunday.setDate(endSunday.getDate() + (7 - lastDay));
  }

  const dayCount = Math.round((endSunday - startMonday) / (1000 * 60 * 60 * 24)) + 1;
  const days = getDaysInRange(startMonday, dayCount);

  let html = '<div class="calendar-grid">';
  html += dayLabelsHtml();

  for (let i = 0; i < days.length; i++) {
    const isOtherMonth = days[i].getMonth() !== month;
    const weekIndex = Math.floor(i / 7);
    const isAlt = weekIndex % 2 === 1;
    html += renderDayCell(days[i], todayStr, isOtherMonth, isAlt);
  }

  html += '</div>';
  return html;
}

function dayLabelsHtml() {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    .map(l => `<div class="calendar-day-label">${l}</div>`)
    .join('');
}

function renderDayCell(day, todayStr, isOtherMonth, isAlt = false) {
  const dateStr = formatDate(day);
  const today = isToday(dateStr);
  const past = dateStr < todayStr;
  const classes = ['calendar-day'];
  if (today) classes.push('today');
  if (past) classes.push('past');
  if (isOtherMonth) classes.push('other-month');
  if (isAlt) classes.push('week-alt');

  const tasks = getTasksForDate(dateStr);

  let tasksHtml = '';
  for (const task of tasks) {
    const goal = task.goalId ? getGoalById(task.goalId) : null;
    const doneClass = task.done ? ' done' : '';
    const bgColor = goal ? goal.color : '';
    const textColor = goal ? '#fff' : '';
    const style = bgColor ? `style="background:${bgColor};color:${textColor}"` : '';
    tasksHtml += `
      <div class="task-pill${doneClass}" data-task-id="${task.id}" ${style}>
        <span class="task-title">${escapeHtml(task.title)}</span>
        <button class="task-edit" data-edit-task="${task.id}" title="Edit" aria-label="Edit task">&#9998;</button>
      </div>`;
  }

  return `
    <div class="${classes.join(' ')}" data-date="${dateStr}">
      <div class="day-number">${day.getDate()}</div>
      <div class="day-tasks">${tasksHtml}</div>
      <div class="day-add" role="button" tabindex="0" aria-label="Add task on ${dateStr}">+ add task</div>
    </div>`;
}

function wireEvents(container) {
  // View mode toggle
  container.querySelectorAll('.view-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      viewMode = btn.dataset.mode;
      if (viewMode === '3weeks') monthOffset = 0;
      renderCalendar();
    });
  });

  // Month nav
  const prevBtn = container.querySelector('#month-prev');
  const nextBtn = container.querySelector('#month-next');
  const todayBtn = container.querySelector('#month-today');
  if (prevBtn) prevBtn.addEventListener('click', () => { monthOffset--; renderCalendar(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { monthOffset++; renderCalendar(); });
  if (todayBtn) todayBtn.addEventListener('click', () => { monthOffset = 0; renderCalendar(); });

  // Day cells
  container.querySelectorAll('.calendar-day').forEach(cell => {
    const dateStr = cell.dataset.date;

    const addBtn = cell.querySelector('.day-add');
    const openAdd = (e) => {
      e.stopPropagation();
      openTaskModal({ date: dateStr });
    };
    addBtn.addEventListener('click', openAdd);
    addBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openAdd(e);
      }
    });

    cell.addEventListener('click', (e) => {
      if (e.target.closest('.task-pill') || e.target.closest('.day-add')) return;
      openTaskModal({ date: dateStr });
    });
  });

  // Task pills
  container.querySelectorAll('.task-pill').forEach(pill => {
    pill.addEventListener('click', async (e) => {
      if (e.target.closest('.task-edit')) return;
      e.stopPropagation();
      // Add toggle animation
      pill.classList.add('just-toggled');
      setTimeout(() => pill.classList.remove('just-toggled'), 300);
      await toggleTask(pill.dataset.taskId);
      renderCalendar();
      renderDashboard();
    });
  });

  // Edit buttons
  container.querySelectorAll('.task-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTaskModal({ taskId: btn.dataset.editTask });
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
