import axios from 'axios';

const instance = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
  },
});

// Error interceptor
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[axios error]', error.response?.status, error.response?.data);
    const message = error.response?.data?.error || error.response?.data?.details || error.message || 'Unknown error';
    const errorObj = new Error(message);
    errorObj.status = error.response?.status;
    errorObj.response = error.response;
    return Promise.reject(errorObj);
  }
);

// =============== API TEMPLATES ===============

/**
 * Get all templates
 */
export async function getTemplates() {
  const response = await instance.get('/templates');
  return response.data.data;
}

/**
 * Get single template by ID
 */
export async function getTemplate(id) {
  const response = await instance.get(`/templates/${id}`);
  return response.data;
}

/**
 * Get template with parsed datasheet
 */
export async function getTemplateDatasheet(id) {
  const response = await instance.get(`/templates/${id}/datasheet`);
  return response.data;
}

/**
 * Create new template
 */
export async function createTemplate(templateData) {
  const response = await instance.post('/templates', templateData);
  return response.data;
}

/**
 * Update template
 */
export async function updateTemplate(id, templateData) {
  const response = await instance.put(`/templates/${id}`, templateData);
  return response.data;
}

/**
 * Delete template
 */
export async function deleteTemplate(id) {
  await instance.delete(`/templates/${id}`);
}

/**
 * Execute test with logging to database
 * Creates a job and polls for completion, saves all results to DB
 * @param {string} url - Full URL to test
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {object} headers - Custom headers
 * @param {object} body - Request body for POST/PUT/PATCH
 * @returns {Promise<object>} Test results with { status, statusText, data, headers, url, method }
 */
export async function executeTestWithLogging(url, method = 'GET', headers = {}, body = null) {
  try {
    console.log('[executeTestWithLogging] Starting logged test:', { url, method });
    
    // Handle body parsing - body can be string or already parsed object
    let parsedBody = null;
    if (body) {
      if (typeof body === 'string') {
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          parsedBody = body;
        }
      } else {
        parsedBody = body;
      }
    }
    
    // Create the test config
    const testConfig = {
      endpoint: url,
      request: {
        method,
        headers,
        body: parsedBody,
      },
      clients: 1,
      totalRequests: 1,
    };

    // Execute test
    const { jobId } = await testApi(testConfig);
    console.log('[executeTestWithLogging] Job created:', jobId);

    // Poll for results with timeout of 30 seconds
    let job;
    let attempts = 0;
    const maxAttempts = 60; // 60 * 500ms = 30s

    while (attempts < maxAttempts) {
      job = await getTestResults(jobId);
      
      if (job.status === 'completed' || job.status === 'failed') {
        console.log('[executeTestWithLogging] Job completed:', job.status);
        break;
      }

      // Wait 500ms before retry
      await new Promise(r => setTimeout(r, 500));
      attempts++;
    }

    // Extract result from the job
    const result = job.results?.[0] || {};
    
    return {
      status: result.statusCode || 500,
      statusText: result.response?.statusText || 'Unknown',
      data: result.response?.body || '',
      headers: result.response?.headers || {},
      url,
      method,
      requestHeaders: headers,
      requestBody: body,
      jobId: jobId,
      duration: result.durationMs || 0,
    };
  } catch (err) {
    console.error('[executeTestWithLogging] Error:', err);
    throw err;
  }
}

/**
 * Proxy request to external API (solves CORS)
 * @param {string} url - Full URL to fetch
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {object} headers - Custom headers
 * @param {object} body - Request body for POST/PUT/PATCH
 * @returns {Promise<object>} Response with { status, statusText, data, headers }
 */
export async function proxyRequest(url, method = 'GET', headers = {}, body = null) {
  try {
    console.log('[proxyRequest] Sending request:', { url, method, headers, body });
    const response = await instance.post('/proxy', {
      url,
      method,
      headers,
      body,
    });
    console.log('[proxyRequest] Response received:', response.data);
    return response.data;
  } catch (err) {
    console.error('[proxyRequest] Error:', err);
    throw err;
  }
}

// =============== API TESTS (Rate Limiting) ===============

/**
 * Execute a rate limit test for an API
 * @param {object} testConfig - Test configuration
 * @returns {Promise<object>} Job data with { jobId }
 */
export async function testApi(testConfig) {
  try {
    const response = await instance.post('/tests/run', testConfig);
    return response.data;
  } catch (err) {
    console.error('[testApi] Error:', err);
    throw err;
  }
}

/**
 * Get test results by job ID
 * @param {string} jobId - Job ID
 * @returns {Promise<object>} Job data with { id, status, results, summary }
 */
export async function getTestResults(jobId) {
  try {
    const response = await instance.get(`/tests/${jobId}`);
    return response.data;
  } catch (err) {
    console.error('[getTestResults] Error:', err);
    throw err;
  }
}

/**
 * Get all test logs/jobs
 * @returns {Promise<array>} Array of test jobs
 */
export async function getTestLogs() {
  try {
    const response = await instance.get('/tests');
    return response.data.data;
  } catch (err) {
    console.error('[getTestLogs] Error:', err);
    throw err;
  }
}

export default instance;
