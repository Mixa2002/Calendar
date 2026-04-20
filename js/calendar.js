import { formatDate, formatFullDate, getDaysInRange, getMonday, getMonthLabel, isToday, escapeHtml, sanitizeColor, getContrastTextColor, announce, showAppMessage, clearAppMessage } from './utils.js';
import { getTasksForDate, toggleTask, getGoalById } from './store.js';
import { openTaskModal } from './modal.js';
import { renderDashboard } from './dashboard.js';

let viewMode = '3weeks';
let monthOffset = 0;

export function renderCalendar() {
  const container = document.getElementById('calendar-panel');
  const todayStr = formatDate(new Date());

  let html = '<div class="calendar-toolbar">';
  html += '<div class="view-toggle" role="group" aria-label="Calendar view">';
  html += `<button class="${viewMode === 'today' ? 'active' : ''}" data-mode="today" aria-pressed="${viewMode === 'today'}">Today</button>`;
  html += `<button class="${viewMode === '3weeks' ? 'active' : ''}" data-mode="3weeks" aria-pressed="${viewMode === '3weeks'}">3 Weeks</button>`;
  html += `<button class="${viewMode === 'month' ? 'active' : ''}" data-mode="month" aria-pressed="${viewMode === 'month'}">Month</button>`;
  html += '</div>';

  if (viewMode === 'month') {
    const viewDate = new Date();
    viewDate.setDate(1);
    viewDate.setMonth(viewDate.getMonth() + monthOffset);
    const label = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    html += '<div class="month-nav">';
    html += '<button id="month-prev" aria-label="Previous month">&#8249;</button>';
    html += `<span class="month-label">${escapeHtml(label)}</span>`;
    html += '<button id="month-next" aria-label="Next month">&#8250;</button>';
    if (monthOffset !== 0) {
      html += '<button class="btn-today" id="month-today">Today</button>';
    }
    html += '</div>';
  }

  html += '</div>';

  if (viewMode === '3weeks') {
    html += renderThreeWeeks(todayStr);
  } else if (viewMode === 'month') {
    html += renderMonth(todayStr);
  } else {
    html += renderToday(todayStr);
  }

  container.innerHTML = html;
  wireEvents(container);
}

function getWeekLabel(monday) {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  const startLabel = monday.toLocaleDateString('en-US', opts);
  const endLabel = sunday.toLocaleDateString('en-US', opts);
  const d = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `Week ${weekNo} | ${startLabel} - ${endLabel}`;
}

function renderThreeWeeks(todayStr) {
  const monday = getMonday(new Date());
  const days = getDaysInRange(monday, 21);

  const months = new Set(days.map(d => getMonthLabel(d)));
  const headerText = [...months].join(' / ');

  let html = `<h2 class="calendar-header">${escapeHtml(headerText)}</h2>`;
  html += '<div class="calendar-grid" role="grid" aria-label="Calendar">';
  html += dayLabelsHtml();

  for (let i = 0; i < days.length; i++) {
    if (i % 7 === 0) {
      html += `<div class="week-label" role="row">${escapeHtml(getWeekLabel(days[i]))}</div>`;
    }
    const isAlt = Math.floor(i / 7) % 2 === 1;
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

  const firstOfMonth = new Date(year, month, 1);
  const startMonday = getMonday(firstOfMonth);

  const lastOfMonth = new Date(year, month + 1, 0);
  const lastDay = lastOfMonth.getDay();
  const endSunday = new Date(lastOfMonth);
  if (lastDay !== 0) {
    endSunday.setDate(endSunday.getDate() + (7 - lastDay));
  }

  const dayCount = Math.round((endSunday - startMonday) / (1000 * 60 * 60 * 24)) + 1;
  const days = getDaysInRange(startMonday, dayCount);

  let html = '<div class="calendar-grid" role="grid" aria-label="Calendar">';
  html += dayLabelsHtml();

  for (let i = 0; i < days.length; i++) {
    const isOtherMonth = days[i].getMonth() !== month;
    const isAlt = Math.floor(i / 7) % 2 === 1;
    html += renderDayCell(days[i], todayStr, isOtherMonth, isAlt);
  }

  html += '</div>';
  return html;
}

function renderToday(todayStr) {
  const today = new Date();
  const tasks = getTasksForDate(todayStr);
  const headerLabel = formatFullDate(today);

  let html = '<section class="today-view" aria-label="Today\'s tasks">';
  html += '<div class="today-header">';
  html += `<h2 class="today-title">${escapeHtml(headerLabel)}</h2>`;
  html += `<p class="today-count">${tasks.length === 0 ? 'Nothing scheduled' : `${tasks.length} task${tasks.length > 1 ? 's' : ''}`}</p>`;
  html += '</div>';

  if (tasks.length === 0) {
    html += `
      <div class="today-empty">
        <p>No tasks for today</p>
        <p class="empty-hint">Enjoy the day, or add something below.</p>
      </div>`;
  } else {
    html += '<ul class="today-list" role="list">';
    for (const task of tasks) {
      const goal = task.goalId ? getGoalById(task.goalId) : null;
      const doneClass = task.done ? ' done' : '';
      const goalPill = goal
        ? `<span class="today-goal-pill" style="background:${sanitizeColor(goal.color)};color:${getContrastTextColor(goal.color)}">${escapeHtml(goal.name)}</span>`
        : '';
      html += `
        <li class="today-item${doneClass}" data-task-id="${task.id}">
          <button class="today-check" data-task-id="${task.id}"
                  role="checkbox" aria-checked="${task.done}"
                  aria-label="${escapeHtml(task.title)}${task.done ? ' (completed)' : ''}">
            <span class="today-check-box" aria-hidden="true">
              ${task.done ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
            </span>
          </button>
          <button class="today-body" data-edit-task="${task.id}" aria-label="Edit task: ${escapeHtml(task.title)}">
            <span class="today-title-text">${escapeHtml(task.title)}</span>
            ${goalPill}
          </button>
        </li>`;
    }
    html += '</ul>';
  }

  html += '<button class="btn btn-primary today-add" id="today-add-btn">';
  html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
  html += 'Add task for today</button>';
  html += '</section>';
  return html;
}

function dayLabelsHtml() {
  const fullNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return fullNames
    .map(name => `<div class="calendar-day-label" role="columnheader" aria-label="${name}" title="${name}">${name.slice(0, 3)}</div>`)
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
  const dayLabel = day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const taskCount = tasks.length > 0 ? `, ${tasks.length} task${tasks.length > 1 ? 's' : ''}` : ', no tasks';

  let tasksHtml = '';
  for (const task of tasks) {
    const goal = task.goalId ? getGoalById(task.goalId) : null;
    const doneClass = task.done ? ' done' : '';
    const bgColor = goal ? sanitizeColor(goal.color) : '';
    const textColor = goal ? getContrastTextColor(goal.color) : '';
    const style = bgColor ? `style="background:${bgColor};color:${textColor}"` : '';
    tasksHtml += `
      <div class="task-pill${doneClass}" data-task-id="${task.id}" ${style}
           role="checkbox" aria-checked="${task.done}" tabindex="0"
           aria-label="${escapeHtml(task.title)}${task.done ? ' (completed)' : ''}">
        <span class="task-title">${escapeHtml(task.title)}</span>
        <button class="task-edit" data-edit-task="${task.id}" title="Edit task" aria-label="Edit task: ${escapeHtml(task.title)}">&#9998;</button>
      </div>`;
  }

  return `
    <div class="${classes.join(' ')}" data-date="${dateStr}" tabindex="0" role="gridcell"
         aria-label="${dayLabel}${taskCount}">
      <div class="day-number">${day.getDate()}</div>
      <div class="day-tasks">${tasksHtml}</div>
      <div class="day-add" aria-hidden="true">+ add task</div>
    </div>`;
}

function wireEvents(container) {
  // View mode toggle
  container.querySelectorAll('.view-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      viewMode = btn.dataset.mode;
      if (viewMode !== 'month') monthOffset = 0;
      renderCalendar();
    });
  });

  // Today view
  const todayAddBtn = container.querySelector('#today-add-btn');
  if (todayAddBtn) {
    todayAddBtn.addEventListener('click', () => {
      openTaskModal({ date: formatDate(new Date()) });
    });
  }

  container.querySelectorAll('.today-check').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (btn.disabled) return;
      btn.disabled = true;
      const wasDone = btn.getAttribute('aria-checked') === 'true';
      // toggleTask flips the cache synchronously before any await, so we can
      // re-render immediately for an instant response on mobile networks.
      const togglePromise = toggleTask(btn.dataset.taskId);
      clearAppMessage();
      announce(wasDone ? 'Task marked as incomplete' : 'Task marked as complete');
      renderCalendar();
      renderDashboard();
      try {
        await togglePromise;
      } catch (err) {
        // Network write failed — store rolled back the cache, so re-render to
        // restore the correct visual state.
        showAppMessage(err.message || 'Failed to update task.');
        announce('Failed to update task');
        renderCalendar();
        renderDashboard();
      }
    });
  });

  container.querySelectorAll('.today-body').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTaskModal({ taskId: btn.dataset.editTask });
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

    cell.addEventListener('click', (e) => {
      if (e.target.closest('.task-pill')) return;
      openTaskModal({ date: dateStr });
    });

    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (!e.target.closest('.task-pill')) {
          e.preventDefault();
          openTaskModal({ date: dateStr });
        }
      }
    });
  });

  // Task pills
  container.querySelectorAll('.task-pill').forEach(pill => {
    const handleToggle = async (e) => {
      if (e.target.closest('.task-edit')) return;
      e.stopPropagation();
      if (pill.dataset.pending === '1') return;
      pill.dataset.pending = '1';
      pill.classList.add('just-toggled');
      setTimeout(() => pill.classList.remove('just-toggled'), 300);
      const wasDone = pill.getAttribute('aria-checked') === 'true';
      // toggleTask flips the cache synchronously before any await, so we can
      // re-render immediately for an instant response on mobile networks.
      const togglePromise = toggleTask(pill.dataset.taskId);
      clearAppMessage();
      announce(wasDone ? 'Task marked as incomplete' : 'Task marked as complete');
      renderCalendar();
      renderDashboard();
      try {
        await togglePromise;
      } catch (err) {
        // Network write failed — store rolled back the cache, so re-render to
        // restore the correct visual state.
        showAppMessage(err.message || 'Failed to update task.');
        announce('Failed to update task');
        renderCalendar();
        renderDashboard();
      }
    };

    pill.addEventListener('click', handleToggle);
    pill.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle(e);
      }
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
