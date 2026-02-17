import axios from 'axios';

export async function request(opts = {}) {
  const { retries = 0, retryDelay = 200, ...axiosOpts } = opts;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios.request(axiosOpts);
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const backoff = retryDelay * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  }
  throw lastError;
} 
