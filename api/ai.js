const { applyEndpointRateLimits } = require('./_rateLimit.js');

module.exports = function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const identity = applyEndpointRateLimits(request, response, 'ai', {
    ip: 60,
    user: 30,
    windowMs: 60_000,
  });

  if (!identity) {
    return;
  }

  response.status(501).json({
    error: 'AI provider is not configured on the server yet',
    userId: identity.userId,
  });
};
