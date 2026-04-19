import { supabase } from './supabase.js';

export const GOAL_COLORS = [
  '#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#be185d', '#65a30d', '#ea580c', '#6366f1',
];

// In-memory cache — rendering reads from here (synchronous)
let goalsCache = [];
let tasksCache = [];

// --- Data loading (call on init and after mutations) ---

export async function refreshData() {
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: true });
  goalsCache = (goals || []).map(g => ({
    id: g.id,
    name: g.name,
    color: g.color,
    createdAt: g.created_at,
  }));

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: true });
  tasksCache = (tasks || []).map(t => ({
    id: t.id,
    title: t.title,
    date: t.date,
    done: t.done,
    goalId: t.goal_id,
  }));
}

// --- Synchronous reads (from cache) ---

export function loadGoals() {
  return goalsCache;
}

export function loadTasks() {
  return tasksCache;
}

export function getGoalById(id) {
  return goalsCache.find(g => g.id === id) || null;
}

export function getTasksForDate(dateStr) {
  return tasksCache.filter(t => t.date === dateStr);
}

export function getTasksForGoal(goalId) {
  return tasksCache.filter(t => t.goalId === goalId);
}

export function getUnlinkedTasks() {
  return tasksCache.filter(t => !t.goalId);
}

export function getGoalCompletion(goalId) {
  const tasks = getTasksForGoal(goalId);
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  return { done, total, percentage: total === 0 ? 0 : Math.round((done / total) * 100) };
}

// --- Async mutations (write to Supabase, then refresh cache) ---

export async function addGoal(name, color = GOAL_COLORS[0]) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('goals').insert({
    name,
    color,
    user_id: user.id,
  });
  await refreshData();
}

export async function updateGoal(id, fields) {
  const updates = {};
  if (fields.name !== undefined) updates.name = fields.name;
  if (fields.color !== undefined) updates.color = fields.color;
  await supabase.from('goals').update(updates).eq('id', id);
  await refreshData();
}

export async function deleteGoal(id) {
  // Unlink tasks first
  await supabase.from('tasks').update({ goal_id: null }).eq('goal_id', id);
  await supabase.from('goals').delete().eq('id', id);
  await refreshData();
}

export async function addTask(title, date, goalId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('tasks').insert({
    title,
    date,
    goal_id: goalId,
    user_id: user.id,
  });
  await refreshData();
}

export async function updateTask(id, fields) {
  const updates = {};
  if (fields.title !== undefined) updates.title = fields.title;
  if (fields.date !== undefined) updates.date = fields.date;
  if (fields.goalId !== undefined) updates.goal_id = fields.goalId;
  if (fields.done !== undefined) updates.done = fields.done;
  await supabase.from('tasks').update(updates).eq('id', id);
  await refreshData();
}

export async function deleteTask(id) {
  await supabase.from('tasks').delete().eq('id', id);
  await refreshData();
}

export async function toggleTask(id) {
  const task = tasksCache.find(t => t.id === id);
  if (!task) return;
  await supabase.from('tasks').update({ done: !task.done }).eq('id', id);
  await refreshData();
}
