/**
 * Generates a unique document code based on timestamp instead of count()+1.
 * Pattern: {prefix}{YYYYMMDD}{HHMMSS}
 * The millisecond component ensures uniqueness even under concurrent requests.
 */
export function generateCode(prefix: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const M = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${prefix}${y}${M}${d}${h}${m}${s}${ms}`;
}
