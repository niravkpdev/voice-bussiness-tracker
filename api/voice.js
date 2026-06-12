const { applyEndpointRateLimits } = require('./_rateLimit.js');

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const identity = await applyEndpointRateLimits(request, response, 'voice', {
    ip: 30,
    user: 12,
    windowMs: 60_000,
  });

  if (!identity) {
    return;
  }

  response.status(501).json({
    error: 'Voice AI endpoint is not configured on the server yet',
    userId: identity.userId,
  });
};
