import { renderCalendar } from './calendar.js';
import { renderDashboard } from './dashboard.js';
import { openGoalModal, setOnClose } from './modal.js';

function renderAll() {
  renderCalendar();
  renderDashboard();
}

// New Goal button
document.getElementById('btn-new-goal').addEventListener('click', () => {
  openGoalModal();
});

// Re-render everything when any modal closes
setOnClose(renderAll);

// Initial render
renderAll();
