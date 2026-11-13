// Slows down password guessing: after too many wrong tries, from one address
// or against one account, further tries are refused for a while. Only wrong
// tries count, and a right one clears them, so normal use never hits it.
// Kept in memory: fine for one server; a restart simply starts over.

const WINDOW_MS = 15 * 60 * 1000;

export function createAttemptLimiter({ perKey = 8, perIp = 30, windowMs = WINDOW_MS } = {}) {
  const fails = new Map(); // key -> timestamps of wrong tries

  const recent = (key, now) => {
    const list = (fails.get(key) || []).filter((t) => now - t < windowMs);
    if (list.length) fails.set(key, list);
    else fails.delete(key);
    return list;
  };

  // drop old entries now and then so the map can't grow without end
  setInterval(() => {
    const now = Date.now();
    for (const key of fails.keys()) recent(key, now);
  }, windowMs).unref();

  const keys = (ip, account) => [`ip:${ip}`, `acct:${ip}:${account}`, `acct:*:${account}`];

  return {
    // seconds to wait before trying again, or 0 when a try is allowed
    blockedFor(ip, account) {
      const now = Date.now();
      const [ipKey, pairKey, acctKey] = keys(ip, account);
      const over = [
        [recent(ipKey, now), perIp],
        [recent(pairKey, now), perKey],
        // one account from many addresses: a looser cap
        [recent(acctKey, now), perIp],
      ].filter(([list, max]) => list.length >= max);
      if (!over.length) return 0;
      const oldest = Math.max(...over.map(([list, max]) => list[list.length - max]));
      return Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    },
    fail(ip, account) {
      const now = Date.now();
      for (const key of keys(ip, account)) {
        const list = recent(key, now);
        list.push(now);
        fails.set(key, list);
      }
    },
    succeed(ip, account) {
      const [, pairKey] = keys(ip, account);
      fails.delete(pairKey);
    },
  };
}

export const tooMany = (res, seconds) => {
  res.set("Retry-After", String(seconds));
  return res.status(429).json({
    success: false,
    message: `Too many wrong tries. Please wait ${Math.ceil(seconds / 60)} minute(s) and try again.`,
  });
};
