const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const ACTIVE = LEVELS[(process.env.LOG_LEVEL || '').toUpperCase()] ?? LEVELS.INFO;

function log(level, tag, ...args) {
  if (LEVELS[level] < ACTIVE) return;
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 23);
  const prefix = `[${ts}] [${level.padEnd(5)}] [${tag}]`;
  (level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log)(prefix, ...args);
}

/** @param {string} tag */
const makeLogger = (tag) => ({
  debug: (...a) => log('DEBUG', tag, ...a),
  info:  (...a) => log('INFO',  tag, ...a),
  warn:  (...a) => log('WARN',  tag, ...a),
  error: (...a) => log('ERROR', tag, ...a),
});

module.exports = makeLogger;
