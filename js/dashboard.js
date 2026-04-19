import { loadGoals, getGoalCompletion, getTasksForGoal, getUnlinkedTasks } from './store.js';
import { openGoalModal } from './modal.js';

export function renderDashboard() {
  const container = document.getElementById('dashboard-panel');
  const goals = loadGoals();

  if (goals.length === 0) {
    container.innerHTML = `
      <h2>Goals</h2>
      <div class="empty-state">
        <span class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary-light)">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="6"></circle>
            <circle cx="12" cy="12" r="2"></circle>
          </svg>
        </span>
        <p>No goals yet</p>
        <p class="empty-hint">Click "+ New Goal" above to start tracking your progress.</p>
      </div>`;
    return;
  }

  let html = '<h2>Goals</h2>';

  for (const goal of goals) {
    const { done, total, percentage } = getGoalCompletion(goal.id);
    const tasks = getTasksForGoal(goal.id);

    let taskListHtml = '';
    const sorted = [...tasks].sort((a, b) => a.date.localeCompare(b.date));
    for (const t of sorted) {
      const checkIcon = t.done
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary-light); flex-shrink:0"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--border); flex-shrink:0"><circle cx="12" cy="12" r="10"></circle></svg>';
      taskListHtml += `
        <div class="goal-task-item ${t.done ? 'done' : ''}">
          ${checkIcon}
          <span class="goal-task-date">${formatTaskDate(t.date)}</span>
          <span>${escapeHtml(t.title)}</span>
        </div>`;
    }

    const statsLabel = total > 0 ? `${done}/${total}` : '0';
    const expandIcon = '<span class="goal-expand-icon">&#9660;</span>';

    html += `
      <div class="goal-card" data-goal-id="${goal.id}">
        <div class="goal-header">
          <span class="goal-color-dot" style="background:${goal.color}"></span>
          <span class="goal-name">${escapeHtml(goal.name)}</span>
          <span class="goal-stats">${percentage}%</span>
          ${expandIcon}
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${percentage}%;background:${goal.color}"></div>
        </div>
        <div class="goal-tasks-list">
          ${taskListHtml || '<div style="color:var(--text-faint);font-size:12px;padding:4px 0;text-align:center">No tasks linked yet</div>'}
          <div class="goal-actions">
            <button class="btn btn-ghost btn-edit-goal" data-goal-id="${goal.id}">Edit Goal</button>
          </div>
        </div>
      </div>`;
  }

  const unlinked = getUnlinkedTasks();
  const unlinkedDone = unlinked.filter(t => t.done).length;
  if (unlinked.length > 0) {
    html += `
      <div class="unlinked-summary">
        ${unlinked.length} task${unlinked.length !== 1 ? 's' : ''} without a goal · ${unlinkedDone} done
      </div>`;
  }

  container.innerHTML = html;

  container.querySelectorAll('.goal-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-edit-goal')) return;
      card.classList.toggle('expanded');
    });
  });

  container.querySelectorAll('.btn-edit-goal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openGoalModal({ goalId: btn.dataset.goalId });
    });
  });
}

function formatTaskDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
