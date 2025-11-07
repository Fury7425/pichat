export function ulid() {
  // minimal, good-enough ulid-ish for demo only
  return '01' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
