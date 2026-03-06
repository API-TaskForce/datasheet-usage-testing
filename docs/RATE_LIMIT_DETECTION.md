# Detección de Rate Limiting en Respuestas de APIs

## Descripción

Se ha implementado una función reutilizable `detectRateLimitInfo()` que extrae automáticamente información de rate limiting de los headers HTTP de las respuestas de APIs externas.

## Características

La función detecta automáticamente:

### En respuestas 200 (exitosas):
- **Peticiones restantes**: Cuántas peticiones quedan en el período actual
- **Límite total**: Límite de peticiones por período
- **Reset time**: Timestamp cuando se resetea el contador
- **Duración del período**: Ventana de tiempo del rate limit
- **Policy**: Descripción de la política de rate limit
- **Scope**: Ámbito del rate limit (user, api-key, ip, etc.)

### En respuestas 429 (Rate Limited) y 503:
- **Retry-After**: Tiempo de espera antes de reintentar (en segundos o fecha HTTP)
- **Fecha de retry**: Timestamp calculado para reintentar
- **Información de reset**: Momento cuando se permite volver a hacer peticiones

### En respuestas 409 (Conflict):
- **Cooldown time**: Tiempo de espera especial
- **Backoff headers**: Headers personalizados de espera

### Consideraciones especiales:
- ⚠️ **Cooling down progresivo**: La función detecta cuando las APIs incrementan el tiempo de espera si no se respeta el período inicial
- 🔄 **Múltiples formatos**: Soporta diferentes variaciones de headers (`X-RateLimit-*`, `X-Rate-Limit-*`, `RateLimit-*`, etc.)
- 📊 **Valores derivados**: Calcula automáticamente valores como `used` (peticiones usadas) cuando solo están disponibles `limit` y `remaining`

## Ubicación

**Archivo**: `backend/src/lib/utils.js`

**Funciones exportadas**:
- `detectRateLimitInfo(headers, statusCode)` - Detecta información de rate limit
- `formatRateLimitInfo(rateLimitInfo)` - Formatea la información en texto legible

## Uso

### En el Engine de Tests

Automáticamente integrado en `backend/src/engine.js`. Cada resultado de test incluye:

```javascript
{
  seq: 1,
  timestamp: "2026-03-06T...",
  status: "ok",
  statusCode: 200,
  durationMs: 234,
  // ... otros campos
  rateLimit: {
    detected: true,
    remaining: 950,
    limit: 1000,
    reset: 1678886400,
    resetDate: "2023-03-15T13:20:00.000Z",
    resetIn: 3600,
    window: 3600,
    used: 50,
    policy: "1000req/hour",
    raw: { /* headers originales */ }
  }
}
```

### En el Proxy Controller

Automáticamente integrado en `backend/src/controllers/proxyController.js`. Las respuestas del proxy incluyen:

```javascript
{
  status: 200,
  statusText: "OK",
  data: { /* respuesta de la API */ },
  headers: { /* headers originales */ },
  rateLimit: {
    detected: true,
    remaining: 4800,
    limit: 5000,
    resetIn: 3600,
    // ... más información
  }
}
```

### Uso manual en código personalizado

```javascript
import { detectRateLimitInfo, formatRateLimitInfo } from './lib/utils.js';

// Después de hacer una petición HTTP
const response = await fetch('https://api.example.com/data');

// Extraer información de rate limit
const rateLimitInfo = detectRateLimitInfo(response.headers, response.status);

if (rateLimitInfo.detected) {
  console.log(`Peticiones restantes: ${rateLimitInfo.remaining}/${rateLimitInfo.limit}`);
  
  if (rateLimitInfo.resetIn) {
    console.log(`Se resetea en ${rateLimitInfo.resetIn} segundos`);
  }
  
  if (rateLimitInfo.retryAfter) {
    console.log(`Esperar ${rateLimitInfo.retryAfter} segundos antes de reintentar`);
  }

  // Formato legible para logs
  console.log(formatRateLimitInfo(rateLimitInfo));
  // Output: "950/1000 requests remaining, resets in 3600s, policy: 1000req/hour"
}
```

## Headers Detectados

La función busca automáticamente estas variaciones de headers:

### Límite de peticiones:
- `x-ratelimit-limit`
- `x-rate-limit-limit`
- `ratelimit-limit`
- `x-ratelimit-maximum`
- `rate-limit-limit`
- `x-rate-limit-max`

### Peticiones restantes:
- `x-ratelimit-remaining`
- `x-rate-limit-remaining`
- `ratelimit-remaining`
- `x-ratelimit-available`
- `rate-limit-remaining`

### Reset time:
- `x-ratelimit-reset`
- `x-rate-limit-reset`
- `ratelimit-reset`
- `x-rate-limit-reset-time`
- `rate-limit-reset`

### Retry-After (429/503):
- `retry-after`
- `x-retry-after`
- `x-ratelimit-retry-after`
- `ratelimit-retry-after`

### Cooldown (409):
- `x-ratelimit-cooldown`
- `x-cooldown`
- `x-backoff`

### Información adicional:
- `x-ratelimit-window` / `x-rate-limit-window` - Duración del período
- `x-ratelimit-policy` - Descripción de la política
- `x-ratelimit-scope` - Ámbito del rate limit
- `x-ratelimit-used` - Peticiones ya usadas

## Formato de Respuesta

```typescript
{
  detected: boolean,         // true si se detectó algún header de rate limit
  remaining: number | null,  // Peticiones restantes
  limit: number | null,      // Límite total de peticiones
  reset: number | null,      // Timestamp Unix del reset (segundos)
  resetDate: string | null,  // Fecha ISO del reset
  resetIn: number | null,    // Segundos hasta el reset
  window: number | null,     // Duración del período (segundos)
  retryAfter: number | null, // Segundos de espera (429/503/409)
  retryAfterDate: string | null, // Fecha ISO para reintentar
  used: number | null,       // Peticiones usadas (calculado)
  policy: string | null,     // Política de rate limit
  scope: string | null,      // Ámbito (user, api-key, etc.)
  raw: object               // Headers originales detectados
}
```

## Ejemplos de APIs Reales

### GitHub API
```javascript
// Headers típicos:
// x-ratelimit-limit: 5000
// x-ratelimit-remaining: 4999
// x-ratelimit-reset: 1678886400
// x-ratelimit-used: 1
```

### Stripe API
```javascript
// Headers típicos en 429:
// retry-after: 2
// x-ratelimit-limit: 100
// x-ratelimit-remaining: 0
```

### Twitter API
```javascript
// Headers típicos:
// x-rate-limit-limit: 180
// x-rate-limit-remaining: 179
// x-rate-limit-reset: 1678886400
```

## Testing

Ver archivo `backend/tests/rateLimitDetector.test.js` para ejemplos completos de uso y casos de prueba.

Para ejecutar pruebas manuales:
```bash
cd backend
node -e "import('./src/lib/utils.js').then(m => {
  const info = m.detectRateLimitInfo({'x-ratelimit-limit': '1000', 'x-ratelimit-remaining': '950'}, 200);
  console.log(m.formatRateLimitInfo(info));
});"
```

## Notas Importantes

1. **Compatibilidad con AxiosHeaders**: La función funciona tanto con objetos planos como con objetos tipo `AxiosHeaders` que tienen método `.get()`

2. **Reset timestamp vs relativo**: La función detecta automáticamente si el valor de reset es un timestamp Unix (>1000000000) o un valor relativo en segundos

3. **Case-insensitive**: La búsqueda de headers es insensible a mayúsculas/minúsculas

4. **Valores derivados**: Si solo están disponibles `limit` y `remaining`, se calcula automáticamente `used = limit - remaining`

5. **Headers raw**: Siempre se preservan los headers originales detectados en el campo `raw` para debugging

## Beneficios

✅ **Evita rate limiting**: Permite implementar lógica de backoff inteligente
✅ **Monitoreo proactivo**: Detecta cuando se está cerca del límite
✅ **Debugging mejorado**: Logs más informativos con datos de rate limit
✅ **Reutilizable**: Una sola función para todas las APIs
✅ **Automático**: Se integra sin cambios en código existente
✅ **Flexible**: Soporta múltiples variaciones de headers
