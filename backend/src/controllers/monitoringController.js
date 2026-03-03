import { queryPrometheus, queryPrometheusRange } from '../services/monitoringService.js';

export async function getMetrics(req, res) {
  const { query, start, end, step, type } = req.query;

  try {
    let data;
    if (type === 'range') {
      data = await queryPrometheusRange(query, start, end, step);
    } else {
      data = await queryPrometheus(query);
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
