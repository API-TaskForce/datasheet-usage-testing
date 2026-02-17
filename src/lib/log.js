const RESET = '\x1b[0m';
const BRIGHT = '\x1b[1m';
const DIM = '\x1b[2m';
const FG_RED = '\x1b[31m';
const FG_GREEN = '\x1b[32m';
const FG_YELLOW = '\x1b[33m';
const FG_BLUE = '\x1b[34m';

function timeStamp() {
  return new Date().toISOString();
}

function format(levelLabel, color, msg) {
  return `${BRIGHT}${color} [${levelLabel}]${RESET} ${DIM}${timeStamp()}${RESET} — ${msg}`;
}

export function info(msg) {
  console.log(format('INFO', FG_BLUE, msg));
}

export function success(msg) {
  console.log(format('SUCCESS', FG_GREEN , msg));
}

export function error(msg) {
  console.error(format('ERROR', FG_RED, msg));
}

// generic logger (accepts structured meta optionally)
export function log(level = 'INFO', msg, meta) {
  const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
  const out = `${level.toUpperCase()} ${text}` + (meta ? ` ${JSON.stringify(meta)}` : '');
  switch (level.toLowerCase()) {
    case 'error':
      return error(out);
    case 'success':
      return success(out);
    default:
      return info(out);
  }
}
