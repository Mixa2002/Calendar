import { loadGoals, addTask, updateTask, deleteTask, addGoal, updateGoal, deleteGoal, getTasksForGoal } from './store.js';
import { loadTasks } from './store.js';
import { GOAL_COLORS } from './store.js';

let onCloseCallback = null;

export function setOnClose(cb) {
  onCloseCallback = cb;
}

function getOverlay() { return document.getElementById('modal-overlay'); }
function getContent() { return document.getElementById('modal-content'); }

export function closeModal() {
  getOverlay().classList.remove('open');
  getContent().innerHTML = '';
  if (onCloseCallback) onCloseCallback();
}

function openOverlay() {
  getOverlay().classList.add('open');
}

// --- Task Modal ---

export function openTaskModal({ date = '', taskId = null } = {}) {
  const isEdit = !!taskId;
  let task = null;
  if (isEdit) {
    task = loadTasks().find(t => t.id === taskId);
    if (!task) return;
  }

  const goals = loadGoals();

  const goalOptions = goals.map(g =>
    `<option value="${g.id}" ${task && task.goalId === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`
  ).join('');

  getContent().innerHTML = `
    <h3>${isEdit ? 'Edit Task' : 'New Task'}</h3>
    <form id="task-form">
      <div class="form-group">
        <label for="task-title">Title</label>
        <input type="text" id="task-title" required value="${task ? escapeHtml(task.title) : ''}" placeholder="What needs to be done?" autocomplete="off">
      </div>
      <div class="form-group">
        <label for="task-date">Date</label>
        <input type="date" id="task-date" required value="${task ? task.date : date}">
      </div>
      <div class="form-group">
        <label for="task-goal">Goal (optional)</label>
        <select id="task-goal">
          <option value="">No goal</option>
          ${goalOptions}
        </select>
      </div>
      <div class="modal-actions">
        ${isEdit ? '<button type="button" class="btn btn-danger" id="btn-delete-task">Delete</button>' : ''}
        <button type="button" class="btn btn-ghost" id="btn-cancel">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Task'}</button>
      </div>
    </form>
  `;

  openOverlay();
  document.getElementById('task-title').focus();

  document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value.trim();
    const dateVal = document.getElementById('task-date').value;
    const goalId = document.getElementById('task-goal').value || null;
    if (!title || !dateVal) return;

    if (isEdit) {
      await updateTask(taskId, { title, date: dateVal, goalId });
    } else {
      await addTask(title, dateVal, goalId);
    }
    closeModal();
  });

  document.getElementById('btn-cancel').addEventListener('click', closeModal);

  if (isEdit) {
    document.getElementById('btn-delete-task').addEventListener('click', async () => {
      await deleteTask(taskId);
      closeModal();
    });
  }
}

// --- Goal Modal with color picker ---

export function openGoalModal({ goalId = null } = {}) {
  const isEdit = !!goalId;
  let goal = null;
  if (isEdit) {
    goal = loadGoals().find(g => g.id === goalId);
    if (!goal) return;
  }

  const linkedCount = isEdit ? getTasksForGoal(goalId).length : 0;
  const selectedColor = goal ? goal.color : GOAL_COLORS[0];

  const swatchesHtml = GOAL_COLORS.map(c =>
    `<div class="color-swatch${c === selectedColor ? ' selected' : ''}" data-color="${c}" style="background:${c}" role="radio" aria-checked="${c === selectedColor}" aria-label="Color ${c}" tabindex="0"></div>`
  ).join('');

  getContent().innerHTML = `
    <h3>${isEdit ? 'Edit Goal' : 'New Goal'}</h3>
    <form id="goal-form">
      <div class="form-group">
        <label for="goal-name">Goal name</label>
        <input type="text" id="goal-name" required value="${goal ? escapeHtml(goal.name) : ''}" placeholder="e.g. Learn Spanish" autocomplete="off">
      </div>
      <div class="form-group">
        <label>Color</label>
        <div class="color-picker" id="color-picker" role="radiogroup" aria-label="Goal color">
          ${swatchesHtml}
        </div>
        <input type="hidden" id="goal-color" value="${selectedColor}">
      </div>
      <div class="modal-actions">
        ${isEdit ? `<button type="button" class="btn btn-danger" id="btn-delete-goal">Delete${linkedCount > 0 ? ` (${linkedCount} tasks)` : ''}</button>` : ''}
        <button type="button" class="btn btn-ghost" id="btn-cancel">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Goal'}</button>
      </div>
    </form>
  `;

  openOverlay();
  document.getElementById('goal-name').focus();

  // Color picker interaction
  const picker = document.getElementById('color-picker');
  const selectSwatch = (swatch) => {
    picker.querySelectorAll('.color-swatch').forEach(s => {
      s.classList.remove('selected');
      s.setAttribute('aria-checked', 'false');
    });
    swatch.classList.add('selected');
    swatch.setAttribute('aria-checked', 'true');
    document.getElementById('goal-color').value = swatch.dataset.color;
  };

  picker.addEventListener('click', (e) => {
    const swatch = e.target.closest('.color-swatch');
    if (!swatch) return;
    selectSwatch(swatch);
  });

  picker.addEventListener('keydown', (e) => {
    const swatch = e.target.closest('.color-swatch');
    if (!swatch) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectSwatch(swatch);
    }
  });

  document.getElementById('goal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('goal-name').value.trim();
    const color = document.getElementById('goal-color').value;
    if (!name) return;

    if (isEdit) {
      await updateGoal(goalId, { name, color });
    } else {
      await addGoal(name, color);
    }
    closeModal();
  });

  document.getElementById('btn-cancel').addEventListener('click', closeModal);

  if (isEdit) {
    document.getElementById('btn-delete-goal').addEventListener('click', async () => {
      await deleteGoal(goalId);
      closeModal();
    });
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Close on overlay click or Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
  if (e.target === getOverlay()) closeModal();
});
