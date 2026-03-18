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
  timeoutMs: Joi.number().integer().min(0).default(5000),
  pacing: Joi.object({
    meanMs: Joi.number().integer().min(1).optional(),
    stdDevMs: Joi.number().integer().min(1).optional(),
    minMs: Joi.number().integer().min(0).optional(),
    maxMs: Joi.number().integer().min(1).optional(),
  }).optional(),
  rateControl: Joi.object({
    rateMax: Joi.number().integer().min(1).optional(),
    windowModel: Joi.string().valid('FIXED_WINDOW', 'SLIDING_WINDOW').optional(),
    windowSeconds: Joi.number().integer().min(1).optional(),
    cooldownSeconds: Joi.number().integer().min(1).optional(),
  }).optional().allow(null),
  dummyMode: Joi.boolean().optional().default(false),
  dummyConfig: Joi.object({
    quotaMax: Joi.number().integer().min(1).optional(),
    rateMax: Joi.number().integer().min(1).optional(),
    windowModel: Joi.string().valid('FIXED_WINDOW', 'SLIDING_WINDOW').optional(),
    windowSeconds: Joi.number().integer().min(1).optional(),
    cooldownSeconds: Joi.number().integer().min(1).optional(),
    totalRequests: Joi.number().integer().min(1).optional()
  }).optional().allow(null)
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
    .valid('', 'API_TOKEN', 'BASIC_AUTH', 'BEARER', 'RAPID_API', 'OAUTH2')
    .messages({
      'any.only': 'Auth method must be one of: API_TOKEN, BASIC_AUTH, BEARER, RAPID_API, OAUTH2'
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

  imageUrl: Joi.string()
    .optional()
    .allow('', null)
    .uri()
    .messages({
      'string.uri': 'Image URL must be a valid URL'
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
    .default('active'),

  collectionId: Joi.string()
    .optional()
    .allow(null, ''),

  collectionOrder: Joi.number()
    .integer()
    .min(1)
    .optional()
    .allow(null),

  isDummy: Joi.boolean().optional(),

  dummyConfig: Joi.object({
    quotaMax: Joi.number().integer().min(1).optional(),
    rateMax: Joi.number().integer().min(1).optional(),
    windowModel: Joi.string().valid('FIXED_WINDOW', 'SLIDING_WINDOW').optional(),
    windowType: Joi.string().valid('FIXED_WINDOW', 'SLIDING_WINDOW').optional(),
    windowSeconds: Joi.number().integer().min(1).optional(),
    cooldownSeconds: Joi.number().integer().min(1).optional(),
    coolingPeriodMs: Joi.number().integer().min(1).optional(),
    totalRequests: Joi.number().integer().min(1).optional()
  })
    .optional()
    .allow(null)
});

const collectionSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(2)
    .max(80)
    .trim(),
  description: Joi.string()
    .optional()
    .allow('')
    .max(240),
  color: Joi.string()
    .optional()
    .allow('')
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .messages({
      'string.pattern.base': 'Color must be a valid hex code (e.g. #0ea5e9)'
    })
});

const collectionUpdateSchema = Joi.object({
  name: Joi.string()
    .optional()
    .min(2)
    .max(80)
    .trim(),
  description: Joi.string()
    .optional()
    .allow('')
    .max(240),
  color: Joi.string()
    .optional()
    .allow('')
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .messages({
      'string.pattern.base': 'Color must be a valid hex code (e.g. #0ea5e9)'
    })
}).min(1);

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

export function validateCollectionSchema(req, res, next) {
  const { error, value } = collectionSchema.validate(req.body, {
    stripUnknown: true,
    abortEarly: false,
  });
  if (error) {
    const details = error.details.reduce((acc, err) => {
      acc[err.path.join('.')] = err.message;
      return acc;
    }, {});
    return res.status(400).json({ error: 'Validation failed', details });
  }
  req.body = value;
  next();
}

export function validateCollectionUpdateSchema(req, res, next) {
  const { error, value } = collectionUpdateSchema.validate(req.body, {
    stripUnknown: true,
    abortEarly: false,
  });
  if (error) {
    const details = error.details.reduce((acc, err) => {
      acc[err.path.join('.')] = err.message;
      return acc;
    }, {});
    return res.status(400).json({ error: 'Validation failed', details });
  }
  req.body = value;
  next();
}

export { testSchema, templateSchema, collectionSchema, collectionUpdateSchema }; 
