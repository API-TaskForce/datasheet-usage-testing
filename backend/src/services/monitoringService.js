import axios from 'axios';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';

export async function queryPrometheus(query) {
  try {
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
      params: { query }
    });
    return response.data;
  } catch (error) {
    console.error('Error querying Prometheus:', error.message);
    throw error;
  }
}

export async function queryPrometheusRange(query, start, end, step) {
  try {
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query_range`, {
      params: { query, start, end, step }
    });
    return response.data;
  } catch (error) {
    console.error('Error querying Prometheus Range:', error.message);
    throw error;
  }
}
