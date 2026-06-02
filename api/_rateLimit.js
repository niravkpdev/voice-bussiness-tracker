const buckets = new Map();

function base64UrlDecode(value) {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function getRequestIdentity(request) {
  const authorization = request.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const payload = token ? base64UrlDecode(token.split('.')[1] || '') : null;
  const userId = payload?.user_id || payload?.sub || 'anonymous';
  const ip = String(request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();

  return { token, userId, ip };
}

function requireBearerToken(request, response) {
  const identity = getRequestIdentity(request);
  if (!identity.token) {
    response.status(401).json({ error: 'Authentication required' });
    return null;
  }

  return identity;
}

function enforceRateLimit({ key, limit, windowMs }) {
  const now = Date.now();
  const existing = buckets.get(key) || [];
  const recent = existing.filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000)),
    };
  }

  buckets.set(key, [...recent, now]);
  return { allowed: true, retryAfter: 0 };
}

function applyEndpointRateLimits(request, response, endpoint, limits) {
  const identity = requireBearerToken(request, response);
  if (!identity) {
    return null;
  }

  const checks = [
    enforceRateLimit({
      key: `${endpoint}:ip:${identity.ip}`,
      limit: limits.ip,
      windowMs: limits.windowMs,
    }),
    enforceRateLimit({
      key: `${endpoint}:user:${identity.userId}`,
      limit: limits.user,
      windowMs: limits.windowMs,
    }),
  ];

  const blocked = checks.find((check) => !check.allowed);
  if (blocked) {
    response.setHeader('Retry-After', String(blocked.retryAfter));
    response.status(429).json({ error: 'Too many requests', retryAfter: blocked.retryAfter });
    return null;
  }

  return identity;
}

module.exports = {
  applyEndpointRateLimits,
};
