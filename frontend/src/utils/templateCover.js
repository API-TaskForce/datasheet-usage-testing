const NO_LOGO_DOMAINS = new Set([
  'jsonplaceholder.typicode.com',
  'httpbin.org',
  'reqres.in',
  'localhost',
  '127.0.0.1',
]);

const BLANK_LOGO_PATTERNS = [
  'logo.clearbit.com/',
  '/blank',
  '/placeholder',
  'default-logo',
  'no-logo',
];

function shouldSkipLogoDomain(domain) {
  if (!domain) return true;
  const normalized = String(domain).trim().toLowerCase();
  if (!normalized) return true;
  if (NO_LOGO_DOMAINS.has(normalized)) return true;
  if (normalized.endsWith('.local')) return true;
  return false;
}

function buildLogoUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

function buildDuckDuckGoLogoUrl(domain) {
  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
}

function buildIconHorseLogoUrl(domain) {
  return `https://icon.horse/icon/${encodeURIComponent(domain)}`;
}

function getFallbackLabel(template) {
  const raw = String(template?.name || template?.apiUri || 'API').trim();
  if (!raw) return 'API';
  return raw;
}

function buildFallbackSvgUrl(template) {
  const label = getFallbackLabel(template);
  const words = label
    .split(/\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const initials = (words[0]?.[0] || 'A') + (words[1]?.[0] || (words[0]?.[1] || 'P'));
  const safeInitials = initials.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2) || 'AP';

  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">',
    '<defs>',
    '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0%" stop-color="#0284c7"/>',
    '<stop offset="100%" stop-color="#0369a1"/>',
    '</linearGradient>',
    '</defs>',
    '<rect width="128" height="128" rx="24" fill="url(#g)"/>',
    `<text x="64" y="74" font-size="44" font-family="Arial, sans-serif" text-anchor="middle" fill="#ffffff" font-weight="700">${safeInitials}</text>`,
    '</svg>',
  ].join('');

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function isLikelyBlankLogoUrl(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;
  return BLANK_LOGO_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function appendCandidate(candidates, value) {
  const normalized = String(value || '').trim();
  if (!normalized) return;
  if (candidates.includes(normalized)) return;
  candidates.push(normalized);
}

function extractDomainFromLogoUrl(imageUrl) {
  const trimmedImageUrl = String(imageUrl || '').trim();
  if (!trimmedImageUrl) return null;

  if (trimmedImageUrl.includes('logo.clearbit.com/')) {
    const rawLogoDomain = trimmedImageUrl.split('logo.clearbit.com/')[1]?.split('/')[0] || '';
    const logoDomain = String(rawLogoDomain).split('?')[0].trim().toLowerCase();
    return logoDomain || null;
  }

  try {
    const url = new URL(trimmedImageUrl);
    return String(url.hostname || '').trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

function buildDomainLogoCandidates(domain) {
  const normalizedDomain = String(domain || '').trim().toLowerCase();
  if (shouldSkipLogoDomain(normalizedDomain)) return [];

  return [
    buildDuckDuckGoLogoUrl(normalizedDomain),
    buildLogoUrl(normalizedDomain),
    buildIconHorseLogoUrl(normalizedDomain),
  ];
}

function getDomainFromUri(apiUri) {
  if (!apiUri) return null;

  try {
    const trimmed = String(apiUri).trim();
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const { hostname } = new URL(normalized);
    const normalizedHost = String(hostname || '').trim().toLowerCase();
    if (shouldSkipLogoDomain(normalizedHost)) return null;
    return normalizedHost;
  } catch {
    return null;
  }
}

export function buildTemplateCoverUrl(template) {
  const candidates = buildTemplateCoverCandidates(template);
  return candidates[0] || null;
}

export function buildTemplateCoverCandidates(template) {
  const candidates = [];
  const domainFromApiUri = getDomainFromUri(template?.apiUri);
  const imageUrl = String(template?.imageUrl || '').trim();

  if (imageUrl && !isLikelyBlankLogoUrl(imageUrl)) {
    appendCandidate(candidates, imageUrl);
  }

  const domainFromImageUrl = extractDomainFromLogoUrl(imageUrl);
  const selectedDomain = domainFromApiUri || domainFromImageUrl;
  const domainCandidates = buildDomainLogoCandidates(selectedDomain);
  domainCandidates.forEach((url) => appendCandidate(candidates, url));

  // Last-resort deterministic SVG so the UI always renders a visible cover.
  appendCandidate(candidates, buildFallbackSvgUrl(template));

  return candidates;
}
