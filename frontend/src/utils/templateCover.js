const NO_LOGO_DOMAINS = new Set([
  'jsonplaceholder.typicode.com',
  'httpbin.org',
  'reqres.in',
  'localhost',
  '127.0.0.1',
]);

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
  const domain = getDomainFromUri(template?.apiUri);

  if (template?.imageUrl) {
    const trimmedImageUrl = String(template.imageUrl).trim();
    if (!trimmedImageUrl) return null;

    if (trimmedImageUrl.includes('logo.clearbit.com/')) {
      const rawLogoDomain = trimmedImageUrl.split('logo.clearbit.com/')[1]?.split('/')[0] || '';
      const logoDomain = String(rawLogoDomain).split('?')[0].trim().toLowerCase();
      if (shouldSkipLogoDomain(logoDomain)) return null;
      return buildLogoUrl(logoDomain);
    }

    return trimmedImageUrl;
  }

  if (domain) {
    return buildLogoUrl(domain);
  }

  return null;
}
