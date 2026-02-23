export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

export function sleep(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
