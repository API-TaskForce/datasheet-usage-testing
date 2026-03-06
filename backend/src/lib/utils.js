export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

export function sleep(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Detecta y extrae información de rate limiting de los headers de respuesta HTTP.
 * Útil para APIs que proporcionan información sobre límites de peticiones.
 * 
 * @param {Object} headers - Headers de la respuesta HTTP (puede ser objeto plano o AxiosHeaders)
 * @param {number} statusCode - Código de estado HTTP de la respuesta
 * @returns {Object} Información estructurada de rate limiting
 * 
 * @example
 * // Para respuesta 200 exitosa:
 * const info = detectRateLimitInfo(headers, 200);
 * // { remaining: 950, limit: 1000, reset: 1234567890, ... }
 * 
 * // Para respuesta 429 (rate limited):
 * const info = detectRateLimitInfo(headers, 429);
 * // { retryAfter: 60, retryAfterDate: '2026-03-06T...', ... }
 */
export function detectRateLimitInfo(headers, statusCode) {
  const info = {
    detected: false,
    remaining: null,         // Peticiones restantes en el período actual
    limit: null,             // Límite total de peticiones por período
    reset: null,             // Timestamp (segundos) cuando se resetea el contador
    resetDate: null,         // Fecha ISO cuando se resetea
    resetIn: null,           // Segundos hasta el reset
    window: null,            // Duración del período en segundos
    retryAfter: null,        // Segundos de espera antes de reintentar (429/503)
    retryAfterDate: null,    // Fecha ISO para reintentar
    used: null,              // Peticiones usadas en el período
    policy: null,            // Política de rate limit si está disponible
    scope: null,             // Ámbito del rate limit (user, ip, api-key, etc.)
    raw: {}                  // Headers originales detectados
  };

  if (!headers) return info;

  // Normalizar headers a objeto plano (por si viene AxiosHeaders)
  const getHeader = (key) => {
    if (typeof headers.get === 'function') {
      return headers.get(key);
    }
    // Buscar case-insensitive en objeto plano
    const lowerKey = key.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === lowerKey) return v;
    }
    return null;
  };

  // Lista de variaciones comunes de headers de rate limit
  const headerVariations = {
    limit: [
      'x-ratelimit-limit',
      'x-rate-limit-limit',
      'ratelimit-limit',
      'x-ratelimit-maximum',
      'rate-limit-limit',
      'x-rate-limit-max'
    ],
    remaining: [
      'x-ratelimit-remaining',
      'x-rate-limit-remaining',
      'ratelimit-remaining',
      'x-ratelimit-available',
      'rate-limit-remaining'
    ],
    reset: [
      'x-ratelimit-reset',
      'x-rate-limit-reset',
      'ratelimit-reset',
      'x-rate-limit-reset-time',
      'rate-limit-reset'
    ],
    window: [
      'x-ratelimit-window',
      'x-rate-limit-window',
      'ratelimit-window',
      'x-ratelimit-interval',
      'rate-limit-window'
    ],
    retryAfter: [
      'retry-after',
      'x-retry-after',
      'x-ratelimit-retry-after',
      'ratelimit-retry-after'
    ],
    used: [
      'x-ratelimit-used',
      'x-rate-limit-used',
      'ratelimit-used'
    ],
    policy: [
      'x-ratelimit-policy',
      'ratelimit-policy',
      'x-rate-limit-policy'
    ],
    scope: [
      'x-ratelimit-scope',
      'ratelimit-scope',
      'x-rate-limit-scope'
    ]
  };

  // Detectar cada tipo de información
  for (const [key, variations] of Object.entries(headerVariations)) {
    for (const header of variations) {
      const value = getHeader(header);
      if (value !== null && value !== undefined) {
        info.raw[header] = value;
        info.detected = true;

        const numValue = Number(value);

        switch (key) {
          case 'limit':
            if (!isNaN(numValue)) info.limit = numValue;
            break;
          case 'remaining':
            if (!isNaN(numValue)) info.remaining = numValue;
            break;
          case 'reset':
            if (!isNaN(numValue)) {
              info.reset = numValue;
              // Determinar si es timestamp Unix o segundos relativos
              // Timestamps típicamente > 1000000000 (Sep 2001)
              if (numValue > 1000000000) {
                info.resetDate = new Date(numValue * 1000).toISOString();
                info.resetIn = Math.max(0, numValue - Math.floor(Date.now() / 1000));
              } else {
                // Probablemente segundos relativos
                info.resetIn = numValue;
                info.resetDate = new Date(Date.now() + numValue * 1000).toISOString();
              }
            }
            break;
          case 'window':
            if (!isNaN(numValue)) info.window = numValue;
            break;
          case 'retryAfter':
            if (!isNaN(numValue)) {
              info.retryAfter = numValue;
              info.retryAfterDate = new Date(Date.now() + numValue * 1000).toISOString();
            } else {
              // Puede ser una fecha HTTP
              try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  info.retryAfterDate = date.toISOString();
                  info.retryAfter = Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000));
                }
              } catch (e) {
                // Ignorar formato inválido
              }
            }
            break;
          case 'used':
            if (!isNaN(numValue)) info.used = numValue;
            break;
          case 'policy':
            info.policy = String(value);
            break;
          case 'scope':
            info.scope = String(value);
            break;
        }
        break; // Usar solo la primera variación encontrada
      }
    }
  }

  // Calcular valores derivados
  if (info.limit !== null && info.remaining !== null && info.used === null) {
    info.used = info.limit - info.remaining;
  }

  if (info.limit !== null && info.used !== null && info.remaining === null) {
    info.remaining = Math.max(0, info.limit - info.used);
  }

  // Para códigos 429/503/509, priorizar retry-after si está disponible
  if ((statusCode === 429 || statusCode === 503 || statusCode === 509) && !info.retryAfter && info.resetIn) {
    info.retryAfter = info.resetIn;
    if (info.resetDate && !info.retryAfterDate) {
      info.retryAfterDate = info.resetDate;
    }
  }

  // Para códigos 409, buscar información en headers específicos de conflicto
  if (statusCode === 409) {
    const cooldownHeaders = [
      'x-ratelimit-cooldown',
      'x-cooldown',
      'x-backoff'
    ];
    for (const header of cooldownHeaders) {
      const value = getHeader(header);
      if (value) {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          info.retryAfter = numValue;
          info.retryAfterDate = new Date(Date.now() + numValue * 1000).toISOString();
          info.detected = true;
          info.raw[header] = value;
          break;
        }
      }
    }
  }

  return info;
}

/**
 * Formatea información de rate limit en texto legible para logs
 * @param {Object} rateLimitInfo - Objeto retornado por detectRateLimitInfo
 * @returns {string} Texto formateado
 */
export function formatRateLimitInfo(rateLimitInfo) {
  if (!rateLimitInfo || !rateLimitInfo.detected) {
    return 'No rate limit info detected';
  }

  const parts = [];
  
  if (rateLimitInfo.remaining !== null && rateLimitInfo.limit !== null) {
    parts.push(`${rateLimitInfo.remaining}/${rateLimitInfo.limit} requests remaining`);
  }
  
  if (rateLimitInfo.resetIn !== null) {
    parts.push(`resets in ${rateLimitInfo.resetIn}s`);
  }
  
  if (rateLimitInfo.window !== null) {
    parts.push(`window: ${rateLimitInfo.window}s`);
  }
  
  if (rateLimitInfo.retryAfter !== null) {
    parts.push(`retry after ${rateLimitInfo.retryAfter}s`);
  }

  if (rateLimitInfo.policy) {
    parts.push(`policy: ${rateLimitInfo.policy}`);
  }

  return parts.join(', ') || 'Rate limit detected but no details available';
}
