import { detectRateLimitInfo, formatRateLimitInfo } from '../src/lib/utils.js';

describe('detectRateLimitInfo', () => {
  describe('Respuestas 200 exitosas', () => {
    it('debe detectar headers estándar X-RateLimit-*', () => {
      const headers = {
        'x-ratelimit-limit': '1000',
        'x-ratelimit-remaining': '950',
        'x-ratelimit-reset': '1678886400', // Timestamp Unix
      };

      const info = detectRateLimitInfo(headers, 200);

      expect(info.detected).toBe(true);
      expect(info.limit).toBe(1000);
      expect(info.remaining).toBe(950);
      expect(info.used).toBe(50);
      expect(info.reset).toBe(1678886400);
      expect(info.resetDate).toBeTruthy();
      expect(info.resetIn).toBeGreaterThanOrEqual(0);
    });

    it('debe detectar variaciones de headers con guiones', () => {
      const headers = {
        'x-rate-limit-limit': '5000',
        'x-rate-limit-remaining': '4800',
        'x-rate-limit-reset': '1678886400',
      };

      const info = detectRateLimitInfo(headers, 200);

      expect(info.detected).toBe(true);
      expect(info.limit).toBe(5000);
      expect(info.remaining).toBe(4800);
      expect(info.used).toBe(200);
    });

    it('debe detectar headers sin prefijo X-', () => {
      const headers = {
        'ratelimit-limit': '100',
        'ratelimit-remaining': '75',
        'ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
      };

      const info = detectRateLimitInfo(headers, 200);

      expect(info.detected).toBe(true);
      expect(info.limit).toBe(100);
      expect(info.remaining).toBe(75);
      expect(info.used).toBe(25);
    });

    it('debe calcular `used` cuando falta', () => {
      const headers = {
        'x-ratelimit-limit': '1000',
        'x-ratelimit-remaining': '850',
      };

      const info = detectRateLimitInfo(headers, 200);

      expect(info.used).toBe(150);
    });

    it('debe calcular `remaining` cuando falta', () => {
      const headers = {
        'x-ratelimit-limit': '1000',
        'x-ratelimit-used': '200',
      };

      const info = detectRateLimitInfo(headers, 200);

      expect(info.remaining).toBe(800);
    });

    it('debe detectar información de window/periodo', () => {
      const headers = {
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '99',
        'x-ratelimit-window': '3600', // 1 hora
      };

      const info = detectRateLimitInfo(headers, 200);

      expect(info.window).toBe(3600);
    });

    it('debe detectar policy y scope', () => {
      const headers = {
        'x-ratelimit-limit': '1000',
        'x-ratelimit-policy': '1000req/hour',
        'x-ratelimit-scope': 'api-key',
      };

      const info = detectRateLimitInfo(headers, 200);

      expect(info.policy).toBe('1000req/hour');
      expect(info.scope).toBe('api-key');
    });
  });

  describe('Respuestas 429 (Rate Limited)', () => {
    it('debe detectar Retry-After en segundos', () => {
      const headers = {
        'retry-after': '60',
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '0',
      };

      const info = detectRateLimitInfo(headers, 429);

      expect(info.detected).toBe(true);
      expect(info.retryAfter).toBe(60);
      expect(info.retryAfterDate).toBeTruthy();
      expect(info.remaining).toBe(0);
    });

    it('debe detectar Retry-After como fecha HTTP', () => {
      const futureDate = new Date(Date.now() + 120000); // +2 minutos
      const headers = {
        'retry-after': futureDate.toUTCString(),
      };

      const info = detectRateLimitInfo(headers, 429);

      expect(info.detected).toBe(true);
      expect(info.retryAfter).toBeGreaterThan(0);
      expect(info.retryAfter).toBeLessThanOrEqual(120);
      expect(info.retryAfterDate).toBeTruthy();
    });

    it('debe priorizar retry-after sobre reset en 429', () => {
      const headers = {
        'retry-after': '30',
        'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
      };

      const info = detectRateLimitInfo(headers, 429);

      expect(info.retryAfter).toBe(30);
      expect(info.reset).toBeTruthy();
    });

    it('debe usar reset como retry-after si no hay retry-after explícito', () => {
      const resetTime = Math.floor(Date.now() / 1000) + 45;
      const headers = {
        'x-ratelimit-reset': String(resetTime),
        'x-ratelimit-remaining': '0',
      };

      const info = detectRateLimitInfo(headers, 429);

      expect(info.retryAfter).toBeGreaterThan(0);
      expect(info.retryAfter).toBeLessThanOrEqual(46);
    });
  });

  describe('Respuestas 409 (Conflict/Cooldown)', () => {
    it('debe detectar headers de cooldown personalizados', () => {
      const headers = {
        'x-ratelimit-cooldown': '120',
      };

      const info = detectRateLimitInfo(headers, 409);

      expect(info.detected).toBe(true);
      expect(info.retryAfter).toBe(120);
      expect(info.retryAfterDate).toBeTruthy();
    });

    it('debe detectar X-Cooldown header', () => {
      const headers = {
        'x-cooldown': '300',
      };

      const info = detectRateLimitInfo(headers, 409);

      expect(info.retryAfter).toBe(300);
    });

    it('debe detectar X-Backoff header', () => {
      const headers = {
        'x-backoff': '180',
      };

      const info = detectRateLimitInfo(headers, 409);

      expect(info.retryAfter).toBe(180);
    });
  });

  describe('Manejo de AxiosHeaders', () => {
    it('debe funcionar con objetos que tienen método get()', () => {
      const headers = {
        get: (key) => {
          const data = {
            'x-ratelimit-limit': '1000',
            'x-ratelimit-remaining': '900',
          };
          return data[key.toLowerCase()] || null;
        },
      };

      const info = detectRateLimitInfo(headers, 200);

      expect(info.detected).toBe(true);
      expect(info.limit).toBe(1000);
      expect(info.remaining).toBe(900);
    });
  });

  describe('Casos edge', () => {
    it('debe retornar detected:false sin headers', () => {
      const info = detectRateLimitInfo(null, 200);

      expect(info.detected).toBe(false);
      expect(info.limit).toBeNull();
      expect(info.remaining).toBeNull();
    });

    it('debe retornar detected:false con headers vacíos', () => {
      const info = detectRateLimitInfo({}, 200);

      expect(info.detected).toBe(false);
    });

    it('debe manejar valores no numéricos', () => {
      const headers = {
        'x-ratelimit-limit': 'invalid',
        'x-ratelimit-remaining': '50',
      };

      const info = detectRateLimitInfo(headers, 200);

      // Debería detectar remaining pero no limit
      expect(info.detected).toBe(true);
      expect(info.limit).toBeNull();
      expect(info.remaining).toBe(50);
    });

    it('debe guardar headers originales en raw', () => {
      const headers = {
        'x-ratelimit-limit': '1000',
        'x-ratelimit-remaining': '500',
        'x-custom-header': 'ignored',
      };

      const info = detectRateLimitInfo(headers, 200);

      expect(info.raw['x-ratelimit-limit']).toBe('1000');
      expect(info.raw['x-ratelimit-remaining']).toBe('500');
      expect(info.raw['x-custom-header']).toBeUndefined();
    });

    it('debe manejar reset como segundos relativos', () => {
      const headers = {
        'x-ratelimit-reset': '300', // 5 minutos (valor relativo pequeño)
      };

      const info = detectRateLimitInfo(headers, 200);

      expect(info.resetIn).toBe(300);
      expect(info.resetDate).toBeTruthy();
    });
  });

  describe('formatRateLimitInfo', () => {
    it('debe formatear información completa', () => {
      const info = {
        detected: true,
        remaining: 50,
        limit: 100,
        resetIn: 300,
        window: 3600,
        retryAfter: null,
        policy: 'standard',
      };

      const formatted = formatRateLimitInfo(info);

      expect(formatted).toContain('50/100 requests remaining');
      expect(formatted).toContain('resets in 300s');
      expect(formatted).toContain('window: 3600s');
      expect(formatted).toContain('policy: standard');
    });

    it('debe mostrar mensaje cuando no hay detección', () => {
      const info = { detected: false };

      const formatted = formatRateLimitInfo(info);

      expect(formatted).toBe('No rate limit info detected');
    });

    it('debe incluir retry-after cuando está presente', () => {
      const info = {
        detected: true,
        retryAfter: 60,
      };

      const formatted = formatRateLimitInfo(info);

      expect(formatted).toContain('retry after 60s');
    });
  });
});
