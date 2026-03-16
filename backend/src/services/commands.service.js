const fsp = require('fs').promises;
const path = require('path');
const { getCommandsPath } = require('../utils/sanitize');

async function read(email) {
  const fp = getCommandsPath(email);
  if (!fp) return [];
  try {
    const raw = await fsp.readFile(fp, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function write(email, commands) {
  const fp = getCommandsPath(email);
  if (!fp) return;
  await fsp.mkdir(path.dirname(fp), { recursive: true });
  await fsp.writeFile(fp, JSON.stringify(commands, null, 2), 'utf8');
}

async function getCommands(email) {
  return read(email);
}

async function addCommand(email, { keyword, url, label }) {
  const commands = await read(email);
  if (commands.some(c => c.keyword.toLowerCase() === keyword.trim().toLowerCase())) {
    const err = new Error('A command with that keyword already exists.');
    err.status = 409;
    throw err;
  }
  commands.push({ keyword: keyword.trim(), url: url.trim(), label: (label || keyword).trim() });
  await write(email, commands);
  return commands;
}

async function deleteCommand(email, keyword) {
  const commands = await read(email);
  const filtered = commands.filter(c => c.keyword.toLowerCase() !== keyword.trim().toLowerCase());
  await write(email, filtered);
  return filtered;
}

module.exports = { getCommands, addCommand, deleteCommand };
