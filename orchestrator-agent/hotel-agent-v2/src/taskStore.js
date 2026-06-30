// taskStore.js — unchanged from a2a-flygpt/hotel-agent/src/taskStore.js

const { randomUUID } = require('crypto');

const tasks = new Map();

function createTask(skillId, input) {
  const taskId = randomUUID();
  const task = {
    id: taskId,
    skillId,
    input,
    status: 'submitted',
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.set(taskId, task);
  return task;
}

function updateTaskStatus(taskId, status, { result, error } = {}) {
  const task = tasks.get(taskId);
  if (!task) return null;

  task.status = status;
  task.updatedAt = new Date().toISOString();
  if (result !== undefined) task.result = result;
  if (error !== undefined) task.error = error;

  tasks.set(taskId, task);
  return task;
}

function getTask(taskId) {
  return tasks.get(taskId) || null;
}

module.exports = { createTask, updateTaskStatus, getTask };
