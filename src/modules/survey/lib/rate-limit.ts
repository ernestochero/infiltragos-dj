const requests = new Map<string, number>();

export function checkRateLimit(ip: string, intervalMs = 10000) {
  const now = Date.now();
  const last = requests.get(ip) ?? 0;
  if (now - last < intervalMs) {
    const retryAfter = Math.ceil((intervalMs - (now - last)) / 1000);
    return { allowed: false, retryAfter };
  }
  requests.set(ip, now);
  return { allowed: true };
}

export function resetRateLimit() {
  requests.clear();
}
