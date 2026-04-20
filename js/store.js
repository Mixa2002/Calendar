import { supabase } from './supabase.js';
import { sanitizeColor } from './utils.js';

export const GOAL_COLORS = [
  '#546B41', '#b45309', '#0f766e', '#92400e', '#7c3aed',
  '#0891b2', '#be185d', '#4d7c0f', '#b91c1c', '#6d5a3a',
];

export const COLOR_NAMES = {
  '#546B41': 'Forest',
  '#b45309': 'Amber',
  '#0f766e': 'Teal',
  '#92400e': 'Bronze',
  '#7c3aed': 'Purple',
  '#0891b2': 'Cyan',
  '#be185d': 'Pink',
  '#4d7c0f': 'Olive',
  '#b91c1c': 'Red',
  '#6d5a3a': 'Walnut',
};

// In-memory cache; rendering reads from here synchronously.
let goalsCache = [];
let tasksCache = [];
let tasksByDate = new Map();
let tasksByGoal = new Map();

function throwIfError(error, message) {
  if (error) {
    console.error(message, error);
    throw new Error(message, { cause: error });
  }
}

function rebuildTaskIndexes() {
  tasksByDate = new Map();
  tasksByGoal = new Map();
  for (const t of tasksCache) {
    if (!tasksByDate.has(t.date)) tasksByDate.set(t.date, []);
    tasksByDate.get(t.date).push(t);
    const key = t.goalId || '__unlinked__';
    if (!tasksByGoal.has(key)) tasksByGoal.set(key, []);
    tasksByGoal.get(key).push(t);
  }
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  throwIfError(error, 'Failed to verify your session.');
  if (!data.user) {
    throw new Error('Your session expired. Please log in again.');
  }
  return data.user;
}

// --- Data loading (call on init and after mutations) ---

export async function refreshData() {
  const [goalsResult, tasksResult] = await Promise.all([
    supabase.from('goals').select('*').order('created_at', { ascending: true }),
    supabase.from('tasks').select('*').order('created_at', { ascending: true }),
  ]);

  throwIfError(goalsResult.error, 'Failed to load goals.');
  throwIfError(tasksResult.error, 'Failed to load tasks.');

  goalsCache = (goalsResult.data || []).map(g => ({
    id: g.id,
    name: g.name,
    color: sanitizeColor(g.color),
    createdAt: g.created_at,
  }));

  tasksCache = (tasksResult.data || []).map(t => ({
    id: t.id,
    title: t.title,
    date: t.date,
    done: t.done,
    goalId: t.goal_id,
  }));

  rebuildTaskIndexes();
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
  return tasksByDate.get(dateStr) || [];
}

export function getTasksForGoal(goalId) {
  return tasksByGoal.get(goalId) || [];
}

export function getUnlinkedTasks() {
  return tasksByGoal.get('__unlinked__') || [];
}

export function getGoalCompletion(goalId) {
  const tasks = getTasksForGoal(goalId);
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  return { done, total, percentage: total === 0 ? 0 : Math.round((done / total) * 100) };
}

// --- Async mutations (write to Supabase, then refresh cache) ---

export async function addGoal(name, color = GOAL_COLORS[0]) {
  const user = await requireUser();
  const { error } = await supabase.from('goals').insert({
    name,
    color: sanitizeColor(color),
    user_id: user.id,
  });
  throwIfError(error, 'Failed to create goal.');
  await refreshData();
}

export async function updateGoal(id, fields) {
  const updates = {};
  if (fields.name !== undefined) updates.name = fields.name;
  if (fields.color !== undefined) updates.color = sanitizeColor(fields.color);
  const { error } = await supabase.from('goals').update(updates).eq('id', id);
  throwIfError(error, 'Failed to update goal.');
  await refreshData();
}

export async function deleteGoal(id) {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  throwIfError(error, 'Failed to delete goal.');
  await refreshData();
}

export async function addTask(title, date, goalId = null) {
  const user = await requireUser();
  const { error } = await supabase.from('tasks').insert({
    title,
    date,
    goal_id: goalId,
    user_id: user.id,
  });
  throwIfError(error, 'Failed to create task.');
  await refreshData();
}

export async function updateTask(id, fields) {
  const updates = {};
  if (fields.title !== undefined) updates.title = fields.title;
  if (fields.date !== undefined) updates.date = fields.date;
  if (fields.goalId !== undefined) updates.goal_id = fields.goalId;
  if (fields.done !== undefined) updates.done = fields.done;
  const { error } = await supabase.from('tasks').update(updates).eq('id', id);
  throwIfError(error, 'Failed to update task.');
  await refreshData();
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  throwIfError(error, 'Failed to delete task.');
  await refreshData();
}

export async function toggleTask(id) {
  const task = tasksCache.find(t => t.id === id);
  if (!task) throw new Error('Task no longer exists.');
  const originalDone = task.done;
  // Optimistic update — flip in cache immediately so callers can re-render
  // without waiting for the network round-trip.
  task.done = !task.done;
  rebuildTaskIndexes();
  try {
    const { data, error } = await supabase
      .from('tasks').update({ done: task.done })
      .eq('id', id).eq('done', originalDone).select();
    throwIfError(error, 'Failed to update task.');
    await refreshData();
    if (!data || data.length === 0) {
      throw new Error('Task was changed on another device. Refreshed to latest state.');
    }
  } catch (err) {
    // Roll back to the exact pre-toggle state before re-throwing.
    task.done = originalDone;
    rebuildTaskIndexes();
    throw err;
  }
}
