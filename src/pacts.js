const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'pacts.json');

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '{}\n', 'utf8');
  }
}

function readAll() {
  ensureStore();

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (error) {
    throw new Error(`Unable to read ${DATA_FILE}: ${error.message}`);
  }
}

function writeAll(data) {
  ensureStore();

  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tempFile, DATA_FILE);
}

function hasPact(userId) {
  const data = readAll();
  return Boolean(data[userId]);
}

function getPact(userId) {
  return readAll()[userId] || null;
}

function savePact(userId, pact) {
  const data = readAll();
  data[userId] = pact;
  writeAll(data);
}

function resetPact(userId) {
  const data = readAll();

  if (!data[userId]) {
    return false;
  }

  delete data[userId];
  writeAll(data);
  return true;
}

module.exports = {
  ensureStore,
  hasPact,
  getPact,
  savePact,
  resetPact,
};
