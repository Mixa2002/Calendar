import { generateId } from './utils.js';

const GOALS_KEY = 'calendar_goals';
const TASKS_KEY = 'calendar_tasks';

export const GOAL_COLORS = [
  '#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#be185d', '#65a30d', '#ea580c', '#6366f1',
];

// --- Goals ---

export function loadGoals() {
  return JSON.parse(localStorage.getItem(GOALS_KEY) || '[]');
}

function saveGoals(goals) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function addGoal(name, color = GOAL_COLORS[0]) {
  const goals = loadGoals();
  const goal = { id: generateId(), name, color, createdAt: new Date().toISOString() };
  goals.push(goal);
  saveGoals(goals);
  return goal;
}

export function updateGoal(id, fields) {
  const goals = loadGoals();
  const idx = goals.findIndex(g => g.id === id);
  if (idx === -1) return null;
  Object.assign(goals[idx], fields);
  saveGoals(goals);
  return goals[idx];
}

export function deleteGoal(id) {
  const goals = loadGoals().filter(g => g.id !== id);
  saveGoals(goals);
  // Unlink tasks from deleted goal
  const tasks = loadTasks().map(t => t.goalId === id ? { ...t, goalId: null } : t);
  saveTasks(tasks);
}

export function getGoalById(id) {
  return loadGoals().find(g => g.id === id) || null;
}

// --- Tasks ---

export function loadTasks() {
  return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
}

function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function addTask(title, date, goalId = null) {
  const tasks = loadTasks();
  const task = { id: generateId(), title, date, done: false, goalId };
  tasks.push(task);
  saveTasks(tasks);
  return task;
}

export function updateTask(id, fields) {
  const tasks = loadTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;
  Object.assign(tasks[idx], fields);
  saveTasks(tasks);
  return tasks[idx];
}

export function deleteTask(id) {
  const tasks = loadTasks().filter(t => t.id !== id);
  saveTasks(tasks);
}

export function toggleTask(id) {
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === id);
  if (!task) return null;
  task.done = !task.done;
  saveTasks(tasks);
  return task;
}

export function getTasksForDate(dateStr) {
  return loadTasks().filter(t => t.date === dateStr);
}

export function getTasksForGoal(goalId) {
  return loadTasks().filter(t => t.goalId === goalId);
}

export function getUnlinkedTasks() {
  return loadTasks().filter(t => !t.goalId);
}

export function getGoalCompletion(goalId) {
  const tasks = getTasksForGoal(goalId);
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  return { done, total, percentage: total === 0 ? 0 : Math.round((done / total) * 100) };
}
