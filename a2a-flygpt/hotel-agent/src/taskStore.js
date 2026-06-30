// taskStore.js — the async task lifecycle
//
// A2A models every request as a TASK with a lifecycle, not a one-shot
// request/response. This matters because real agent work can take time —
// the caller needs to be able to check status, not just block and wait.
//
// Task states (per the A2A spec):
//   submitted → working → completed
//                       → failed
//                       → input-required  (needs more info)
//
// In production this would be backed by Redis or a database so it survives
// restarts and scales across multiple server instances. For this demo, an
// in-memory Map is enough to show the pattern correctly.

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
