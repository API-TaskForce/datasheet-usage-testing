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

const templateSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(3)
    .max(100)
    .trim()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 3 characters',
      'string.max': 'Name must not exceed 100 characters'
    }),
  
  authMethod: Joi.string()
    .optional()
    .allow('')
    .valid('', 'API_TOKEN', 'BASIC_AUTH', 'BEARER', 'OAUTH2')
    .messages({
      'any.only': 'Auth method must be one of: API_TOKEN, BASIC_AUTH, BEARER, OAUTH2'
    }),
  
  authCredential: Joi.string()
    .optional()
    .allow('')
    .trim()
    .messages({
      'string.empty': 'Auth credential is required'
    }),
  
  apiUri: Joi.string()
    .required()
    .uri()
    .trim()
    .messages({
      'string.uri': 'API URI must be a valid URL'
    }),
  
  datasheet: Joi.string()
    .required()
    .min(10)
    .messages({
      'string.empty': 'Datasheet content is required',
      'string.min': 'Datasheet must contain at least 10 characters'
    }),
  
  status: Joi.string()
    .optional()
    .valid('active', 'inactive')
    .default('active')
});

export function validateTestSchema(req, res, next) {
  const { error, value } = testSchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.details.map(d => d.message).join(', ') });
  req.body = value; // sanitized
  next();
}

export function validateTemplateSchema(req, res, next) {
  const { error, value } = templateSchema.validate(req.body, { stripUnknown: true, abortEarly: false });
  if (error) {
    const details = error.details.reduce((acc, err) => {
      acc[err.path.join('.')] = err.message;
      return acc;
    }, {});
    return res.status(400).json({ error: 'Validation failed', details });
  }
  req.body = value; // sanitized
  next();
}

export { testSchema, templateSchema }; 
