import Joi from 'joi';

const testSchema = Joi.object({
  endpoint: Joi.string().uri().required(),
  request: Joi.object({
    method: Joi.string().valid('GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS').default('GET'),
    name: Joi.string().optional(),
    headers: Joi.object().pattern(/.*/, Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())).optional(),
    body: Joi.any().optional()
  }).required(),
  clients: Joi.number().integer().min(1).default(1),
  totalRequests: Joi.number().integer().min(1).default(1),
  intervalMs: Joi.number().integer().min(0).default(0),
  timeoutMs: Joi.number().integer().min(0).default(5000)
});

export function validateTestSchema(req, res, next) {
  const { error, value } = testSchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.details.map(d => d.message).join(', ') });
  req.body = value; // sanitized
  next();
}

export { testSchema }; 
