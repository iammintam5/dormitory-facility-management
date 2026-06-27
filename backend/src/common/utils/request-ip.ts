export function getRequestIp(request: any): string | null {
  const forwardedFor = firstHeaderValue(request?.headers?.['x-forwarded-for']);
  const realIp = firstHeaderValue(request?.headers?.['x-real-ip']);
  const cfIp = firstHeaderValue(request?.headers?.['cf-connecting-ip']);
  const rawIp =
    forwardedFor ??
    realIp ??
    cfIp ??
    request?.ip ??
    request?.socket?.remoteAddress ??
    request?.connection?.remoteAddress ??
    null;

  return normalizeIp(rawIp);
}

function firstHeaderValue(value: unknown): string | null {
  if (Array.isArray(value)) return firstHeaderValue(value[0]);
  if (typeof value !== 'string') return null;
  const first = value.split(',')[0]?.trim();
  return first || null;
}

function normalizeIp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const ip = value.trim();
  if (!ip) return null;
  if (ip === '::1') return '127.0.0.1';
  if (ip.startsWith('::ffff:')) return ip.slice('::ffff:'.length);
  return ip;
}
