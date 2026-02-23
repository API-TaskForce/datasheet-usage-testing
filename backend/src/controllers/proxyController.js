import { log, error as logError } from '../lib/log.js';

/**
 * Proxy endpoint to forward API requests from frontend to external APIs
 * Solves CORS issues by making requests from backend instead of frontend
 */
export const proxyRequest = async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, body = null } = req.body;

    log(`Proxy request received: ${method} ${url}`);

    // Validate URL
    if (!url) {
      log('URL parameter missing');
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate URL format
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (err) {
      log(`Invalid URL format: ${url}`);
      return res.status(400).json({ error: `Invalid URL format: ${err.message}` });
    }

    // Prevent access to internal/local URLs
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1' || urlObj.hostname === '0.0.0.0') {
      log(`Blocked local URL: ${url}`);
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

    // Add body for methods that support it
    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // Make the request
    let response;
    try {
      response = await fetch(url, options);
    } catch (fetchErr) {
      log(`Fetch error: ${fetchErr.message}`);
      return res.status(502).json({ 
        error: 'Bad Gateway - Failed to reach external API',
        details: fetchErr.message 
      });
    }

    // Get response text
    let responseText;
    try {
      responseText = await response.text();
    } catch (textErr) {
      log(`Text parsing error: ${textErr.message}`);
      responseText = '';
    }

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

    log(`Response status: ${response.status} from ${url}`);

    // Return response with rate limit headers
    res.status(response.status).json({
      status: response.status,
      statusText: response.statusText,
      data: responseBody,
      headers: rateLimitHeaders,
    });
  } catch (err) {
    logError(`Proxy request error: ${err.message}`);
    logError(err.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      details: err.message 
    });
  }
};
