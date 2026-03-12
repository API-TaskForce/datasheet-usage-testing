import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const TEMPLATES_FILE = path.join(DATA_DIR, 'db.json');
const CONFIGS_FILE = path.join(DATA_DIR, 'test-configs.json');
const LOGS_FILE = path.join(DATA_DIR, 'test-logs.json');

const nowIso = () => new Date().toISOString();

const PUBLIC_API_SEEDS = [
  {
    name: 'JSONPlaceholder',
    apiUri: 'https://jsonplaceholder.typicode.com',
    docUrl: 'https://jsonplaceholder.typicode.com',
    path: '/todos/1',
    datasheet: [
      'associatedSaaS: jsonplaceholder',
      'url: "https://jsonplaceholder.typicode.com/"',
      'planReference: OPEN_ACCESS',
      'type: "Public API"',
      'capacity:',
      '  - value: "Unlimited"',
      '    type: QUOTA',
      '    quotaResetTime: INSTANT',
      '    windowType: SLIDING',
      '    autoRecharge: monthly',
      '    extraCharge: 0.00 USD',
      'maxPower:',
      '  value: "100 requests/minute"',
      '  type: RATE_LIMIT',
      '  description: "Public demo API with soft limits by IP."',
      'coolingPeriod: "None"',
      'segmentation:',
      '  Key Level: "No-Key (Acceso anonimo)."',
    ].join('\n'),
  },
  {
    name: 'Dog API',
    apiUri: 'https://dog.ceo/api',
    docUrl: 'https://dog.ceo/dog-api',
    path: '/breeds/image/random',
    datasheet: [
      'associatedSaaS: dog-ceo-api',
      'url: "https://dog.ceo/dog-api/"',
      'planReference: OPEN_ACCESS',
      'type: "Public API"',
      'capacity:',
      '  - value: "Unlimited"',
      '    type: QUOTA',
      '    quotaResetTime: INSTANT',
      '    windowType: SLIDING',
      '    autoRecharge: monthly',
      '    extraCharge: 0.00 USD',
      'maxPower:',
      '  value: "20 requests/second"',
      '  type: RATE_LIMIT',
      '  description: "Proteccion perimetral mediante Cloudflare."',
      'coolingPeriod: "None"',
      'segmentation:',
      '  Key Level: "No-Key (Acceso anonimo)."',
    ].join('\n'),
  },
  {
    name: 'PokeAPI',
    apiUri: 'https://pokeapi.co/api/v2',
    docUrl: 'https://pokeapi.co/docs/v2',
    path: '/pokemon/pikachu',
    datasheet: [
      'associatedSaaS: pokeapi',
      'url: "https://pokeapi.co/docs/v2"',
      'planReference: OPEN_ACCESS',
      'type: "Public API"',
      'capacity:',
      '  - value: "Unlimited"',
      '    type: QUOTA',
      '    quotaResetTime: INSTANT',
      '    windowType: SLIDING',
      '    autoRecharge: monthly',
      '    extraCharge: 0.00 USD',
      'maxPower:',
      '  value: "100 requests/minute"',
      '  type: RATE_LIMIT',
      '  description: "Limites por IP para garantizar estabilidad del servicio."',
      'coolingPeriod: "None"',
      'segmentation:',
      '  Key Level: "No-Key (Acceso anonimo)."',
      '  Cache Level: "Uso intensivo de cache local recomendado."',
    ].join('\n'),
  },
  {
    name: 'Open-Meteo',
    apiUri: 'https://api.open-meteo.com/v1',
    docUrl: 'https://open-meteo.com/en/docs',
    path: '/forecast?latitude=40.4168&longitude=-3.7038&current=temperature_2m',
    datasheet: [
      'associatedSaaS: open-meteo',
      'url: "https://open-meteo.com/en/docs"',
      'planReference: NON_COMMERCIAL',
      'type: "Partial SaaS"',
      'capacity:',
      '  - value: "10000 requests"',
      '    type: QUOTA',
      '    quotaResetTime: CALENDAR_DAY',
      '    windowType: FIXED',
      '    autoRecharge: monthly',
      '    extraCharge: 0.00 USD',
      'maxPower:',
      '  value: "600 requests/minute"',
      '  type: RATE_LIMIT',
      '  description: "Alto rendimiento para uso no comercial."',
      'coolingPeriod: "Hourly"',
      'segmentation:',
      '  Key Level: "No-Key (Basado en IP del cliente)."',
      '  Usage Level: "Uso comercial requiere suscripcion de pago."',
    ].join('\n'),
  },
  {
    name: 'Cat Facts',
    apiUri: 'https://catfact.ninja',
    docUrl: 'https://catfact.ninja',
    path: '/fact',
    datasheet: [
      'associatedSaaS: cat-fact-api',
      'url: "https://catfact.ninja/"',
      'planReference: OPEN_ACCESS',
      'type: "Public API"',
      'capacity:',
      '  - value: "Unlimited"',
      '    type: QUOTA',
      '    quotaResetTime: INSTANT',
      '    windowType: SLIDING',
      '    autoRecharge: monthly',
      '    extraCharge: 0.00 USD',
      'maxPower:',
      '  value: "120 requests/minute"',
      '  type: RATE_LIMIT',
      '  description: "Limite estandar de servidor web Nginx."',
      'coolingPeriod: "None"',
      'segmentation:',
      '  Key Level: "No-Key (Acceso anonimo)."',
    ].join('\n'),
  },
  {
    name: 'Official Joke API',
    apiUri: 'https://official-joke-api.appspot.com',
    docUrl: 'https://github.com/15Dkatz/official_joke_api',
    path: '/random_joke',
    datasheet: [
      'associatedSaaS: official-joke-api',
      'url: "https://github.com/15Dkatz/official_joke_api"',
      'planReference: OPEN_ACCESS',
      'type: "Public API"',
      'capacity:',
      '  - value: "Unlimited"',
      '    type: QUOTA',
      '    quotaResetTime: INSTANT',
      '    windowType: SLIDING',
      '    autoRecharge: monthly',
      '    extraCharge: 0.00 USD',
      'maxPower:',
      '  value: "100 requests/minute"',
      '  type: RATE_LIMIT',
      '  description: "Limite por IP para evitar saturacion del motor Express."',
      'coolingPeriod: "None"',
      'segmentation:',
      '  Key Level: "No-Key (Acceso anonimo)."',
    ].join('\n'),
  },
];

function buildTemplateFromSeed(seed) {
  const createdAt = nowIso();
  return {
    id: randomUUID(),
    name: seed.name,
    authMethod: '',
    authCredential: '',
    requestMethod: 'GET',
    apiUri: seed.apiUri,
    datasheet: seed.datasheet,
    status: 'active',
    isDummy: false,
    dummyConfig: null,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildDefaultConfig(template, pathValue) {
  return {
    testName: `Smoke GET ${pathValue}`,
    method: 'GET',
    path: pathValue,
    clients: 1,
    totalRequests: 10,
    timeoutMs: 5000,
    headers: [],
    body: '',
    isDefault: true,
    apiTemplateId: template.id,
    apiTemplateName: template.name,
    id: randomUUID(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

async function readJson(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content || JSON.stringify(fallback));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

async function seedTemplatesDb() {
  const db = await readJson(TEMPLATES_FILE, { apiTemplates: {} });
  db.apiTemplates = db.apiTemplates || {};
  const existingByUri = new Map(
    Object.values(db.apiTemplates)
      .filter((t) => t && t.apiUri)
      .map((t) => [String(t.apiUri).toLowerCase(), t])
  );

  let added = 0;
  let updated = 0;
  const resolvedByUri = new Map(existingByUri);

  for (const seed of PUBLIC_API_SEEDS) {
    const key = String(seed.apiUri).toLowerCase();
    if (resolvedByUri.has(key)) {
      const existingTemplate = resolvedByUri.get(key);
      if (
        existingTemplate &&
        typeof existingTemplate === 'object' &&
        !existingTemplate.isDummy &&
        existingTemplate.datasheet !== seed.datasheet
      ) {
        const patched = {
          ...existingTemplate,
          datasheet: seed.datasheet,
          updatedAt: nowIso(),
        };
        db.apiTemplates[patched.id] = patched;
        resolvedByUri.set(key, patched);
        updated += 1;
      }
      continue;
    }

    const template = buildTemplateFromSeed(seed);
    db.apiTemplates[template.id] = template;
    resolvedByUri.set(key, template);
    added += 1;
  }

  if (added > 0 || updated > 0) {
    await writeJson(TEMPLATES_FILE, db);
    console.log(
      `[db:seed] Added ${added} public API template(s) and updated ${updated} datasheet(s) in db.json.`
    );
  } else {
    console.log('[db:seed] db.json already contains public API templates and datasheets.');
  }

  return resolvedByUri;
}

async function seedConfigsDb(templatesByUri) {
  const cfg = await readJson(CONFIGS_FILE, { configs: {} });
  cfg.configs = cfg.configs || {};
  const existingConfigs = Object.values(cfg.configs);
  let added = 0;

  for (const seed of PUBLIC_API_SEEDS) {
    const template = templatesByUri.get(String(seed.apiUri).toLowerCase());
    if (!template?.id) continue;

    const existsForTemplate = existingConfigs.some(
      (c) => c && c.apiTemplateId === template.id && (c.isDefault || c.method === 'GET')
    );

    if (existsForTemplate) {
      continue;
    }

    const config = buildDefaultConfig(template, seed.path);
    cfg.configs[config.id] = config;
    existingConfigs.push(config);
    added += 1;
  }

  if (added > 0) {
    await writeJson(CONFIGS_FILE, cfg);
    console.log(`[db:seed] Added ${added} public API test config(s) to test-configs.json.`);
  } else {
    console.log('[db:seed] test-configs.json already has default configs for public APIs.');
  }
}

async function ensureLogsDb() {
  const logs = await readJson(LOGS_FILE, { jobs: {} });
  if (typeof logs !== 'object' || logs === null) {
    await writeJson(LOGS_FILE, { jobs: {} });
    console.log('[db:seed] Normalized test-logs.json.');
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(logs, 'jobs')) {
    logs.jobs = {};
    await writeJson(LOGS_FILE, logs);
    console.log('[db:seed] Added jobs bucket to test-logs.json.');
    return;
  }

  console.log('[db:seed] test-logs.json already ready.');
}

async function run() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const templatesByUri = await seedTemplatesDb();
  await seedConfigsDb(templatesByUri);
  await ensureLogsDb();
  console.log('[db:seed] Done.');
}

run().catch((err) => {
  console.error('[db:seed] Failed:', err.message);
  process.exit(1);
});
