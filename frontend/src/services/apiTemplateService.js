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

export default instance;
