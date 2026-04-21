import { loadGoals, addTask, updateTask, deleteTask, addGoal, updateGoal, deleteGoal, getTasksForGoal } from './store.js';
import { loadTasks } from './store.js';
import { GOAL_COLORS, COLOR_NAMES } from './store.js';
import { escapeHtml } from './utils.js';

let onCloseCallback = null;
let focusTrapCleanup = null;
let triggerElement = null;
let didMutate = false;

export function setOnClose(cb) {
  onCloseCallback = cb;
}

function getOverlay() { return document.getElementById('modal-overlay'); }
function getContent() { return document.getElementById('modal-content'); }

export function closeModal({ mutated = didMutate } = {}) {
  const overlay = getOverlay();
  const content = getContent();
  if (!overlay?.classList.contains('open')) return;

  overlay.classList.remove('open');
  content.innerHTML = '';
  document.getElementById('app-container')?.removeAttribute('aria-hidden');
  if (focusTrapCleanup) {
    focusTrapCleanup();
    focusTrapCleanup = null;
  }
  if (triggerElement) {
    triggerElement.focus();
    triggerElement = null;
  }
  didMutate = false;
  if (onCloseCallback) onCloseCallback(mutated);
}

function openOverlay() {
  const overlay = getOverlay();
  const modal = getContent();
  overlay.classList.add('open');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  document.getElementById('app-container')?.setAttribute('aria-hidden', 'true');
  const heading = modal.querySelector('h3');
  if (heading) {
    heading.id = 'modal-heading';
    modal.setAttribute('aria-labelledby', 'modal-heading');
  }
  trapFocus(modal);
}

function trapFocus(container) {
  const sel = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function handleKeydown(e) {
    if (e.key !== 'Tab') return;
    const focusable = [...container.querySelectorAll(sel)];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  document.addEventListener('keydown', handleKeydown);
  focusTrapCleanup = () => document.removeEventListener('keydown', handleKeydown);
}

// --- Task Modal ---

export function openTaskModal({ date = '', taskId = null } = {}) {
  triggerElement = document.activeElement;
  didMutate = false;
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
      <div id="modal-error" class="modal-error" role="alert" aria-live="assertive"></div>
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
    hideModalError();
    const title = document.getElementById('task-title').value.trim();
    const dateVal = document.getElementById('task-date').value;
    const goalId = document.getElementById('task-goal').value || null;
    if (!title || !dateVal) return;
    const submitBtn = e.submitter;
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (isEdit) {
        await updateTask(taskId, { title, date: dateVal, goalId });
      } else {
        await addTask(title, dateVal, goalId);
      }
      closeModal({ mutated: true });
    } catch (err) {
      if (submitBtn) submitBtn.disabled = false;
      showModalError(err.message);
    }
  });

  document.getElementById('btn-cancel').addEventListener('click', closeModal);

  if (isEdit) {
    document.getElementById('btn-delete-task').addEventListener('click', () => {
      const actions = getContent().querySelector('.modal-actions');
      actions.innerHTML = `
        <span class="delete-confirm-text">Delete this task?</span>
        <button type="button" class="btn btn-ghost" id="btn-cancel-delete">Keep it</button>
        <button type="button" class="btn btn-danger" id="btn-confirm-delete">Yes, delete</button>
      `;
      document.getElementById('btn-cancel-delete').addEventListener('click', closeModal);
      document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
        hideModalError();
        document.getElementById('btn-confirm-delete').disabled = true;
        try {
          await deleteTask(taskId);
          closeModal({ mutated: true });
        } catch (err) {
          showModalError(err.message);
        }
      });
    });
  }
}

// --- Goal Modal with color picker ---

export function openGoalModal({ goalId = null } = {}) {
  triggerElement = document.activeElement;
  didMutate = false;
  const isEdit = !!goalId;
  let goal = null;
  if (isEdit) {
    goal = loadGoals().find(g => g.id === goalId);
    if (!goal) return;
  }

  const linkedCount = isEdit ? getTasksForGoal(goalId).length : 0;
  const selectedColor = goal ? goal.color : GOAL_COLORS[0];

  const swatchesHtml = GOAL_COLORS.map((c, i) => {
    const isSelected = c === selectedColor;
    return `<div class="color-swatch${isSelected ? ' selected' : ''}" data-color="${c}" style="background:${c}" role="radio" aria-checked="${isSelected}" aria-label="${COLOR_NAMES[c] || c}" tabindex="${isSelected ? '0' : '-1'}"></div>`;
  }).join('');

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
      <div id="modal-error" class="modal-error" role="alert" aria-live="assertive"></div>
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
      s.setAttribute('tabindex', '-1');
    });
    swatch.classList.add('selected');
    swatch.setAttribute('aria-checked', 'true');
    swatch.setAttribute('tabindex', '0');
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
      return;
    }
    // Arrow key navigation
    const swatches = [...picker.querySelectorAll('.color-swatch')];
    const current = swatches.indexOf(swatch);
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      next = (current + 1) % swatches.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      next = (current - 1 + swatches.length) % swatches.length;
    }
    if (next !== -1) {
      selectSwatch(swatches[next]);
      swatches[next].focus();
    }
  });

  document.getElementById('goal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideModalError();
    const name = document.getElementById('goal-name').value.trim();
    const color = document.getElementById('goal-color').value;
    if (!name) return;
    const submitBtn = e.submitter;
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (isEdit) {
        await updateGoal(goalId, { name, color });
      } else {
        await addGoal(name, color);
      }
      closeModal({ mutated: true });
    } catch (err) {
      if (submitBtn) submitBtn.disabled = false;
      showModalError(err.message);
    }
  });

  document.getElementById('btn-cancel').addEventListener('click', closeModal);

  if (isEdit) {
    document.getElementById('btn-delete-goal').addEventListener('click', async () => {
      const msg = linkedCount > 0
        ? `Delete this goal? ${linkedCount} linked task(s) will be unlinked. This cannot be undone.`
        : 'Delete this goal? This cannot be undone.';
      if (!confirm(msg)) return;
      hideModalError();
      try {
        await deleteGoal(goalId);
        closeModal({ mutated: true });
      } catch (err) {
        showModalError(err.message);
      }
    });
  }
}

function showModalError(msg) {
  const el = document.getElementById('modal-error');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

function hideModalError() {
  const el = document.getElementById('modal-error');
  if (el) {
    el.textContent = '';
    el.style.display = 'none';
  }
}

// Close on overlay click or Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && getOverlay()?.classList.contains('open')) closeModal();
});

document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
  if (e.target === getOverlay()) closeModal();
});
