import { log, error as logError } from '../lib/log.js';
import { httpClient } from '../lib/httpClient.js';

/**
 * Proxy endpoint to forward API requests from frontend to external APIs
 * Solves CORS issues by making requests from backend instead of frontend
 */
export const proxyRequest = async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, body = null } = req.body;

    // Validate URL
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Prevent access to internal/local URLs
    const urlObj = new URL(url);
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      return res.status(403).json({ error: 'Access to local URLs is not allowed' });
    }

    log(`Proxying ${method} request to ${url}`);

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const responseText = await response.text();

    // Parse response body
    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }

    // Extract rate limit headers from external API
    const rateLimitHeaders = {};
    const commonRateLimitHeaders = [
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
      'x-rate-limit-limit',
      'x-rate-limit-remaining',
      'x-rate-limit-reset',
      'ratelimit-limit',
      'ratelimit-remaining',
      'ratelimit-reset',
    ];

    commonRateLimitHeaders.forEach((h) => {
      const value = response.headers.get(h);
      if (value) rateLimitHeaders[h] = value;
    });

    // Return response with rate limit headers
    res.status(response.status).json({
      status: response.status,
      statusText: response.statusText,
      data: responseBody,
      headers: rateLimitHeaders,
    });
  } catch (err) {
    logError(`Proxy request error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};
