# Response Logging & Tracing

## Descripción General

El engine ahora captura trazas completas de cada solicitud y respuesta, permitiendo análisis detallado de los rate limits, errores y patrones de comportamiento de las APIs.

## Estructura de Resultados

Cada resultado en `job.results` contiene la siguiente estructura:

```javascript
{
  // Información básica
  seq: number,                      // Número secuencial de la petición
  timestamp: string,                // ISO timestamp cuando se completó
  status: "ok" | "error" | "rate_limited",  // Estado resumido
  statusCode: number,               // Código HTTP (0 si error de conexión)
  durationMs: number,               // Tiempo total en milisegundos
  retryAfter: string | null,        // Valor del header Retry-After si aplica
  
  // Trazas de la solicitud enviada
  request: {
    url: string,                    // URL del endpoint
    method: string,                 // GET, POST, PUT, DELETE, etc.
    headers: object,                // Headers enviados (sin truncado)
    body: string | null,            // Body de la solicitud (truncado a 100KB si es muy grande)
  },
  
  // Trazas de la respuesta recibida
  response: {
    status: number,                 // Código HTTP de la respuesta
    statusText: string,             // Texto del status (ej: "OK", "Not Found")
    headers: object,                // Headers de la respuesta
    body: string | null,            // Body de la respuesta (truncado a 100KB)
  } | null,                         // null si hubo error de conexión
  
  // Información de error si aplica
  error: {
    message: string,                // Mensaje de error
    code: string,                   // Código de error (ej: "ECONNREFUSED", "ETIMEDOUT")
    errorType: string,              // Tipo de error (ej: "Error", "AxiosError")
  } | null,                         // null si no hubo error
}
```

## Ejemplos

### Respuesta Exitosa (200 OK)
```javascript
{
  seq: 1,
  timestamp: "2026-02-24T10:30:45.123Z",
  status: "ok",
  statusCode: 200,
  durationMs: 245,
  retryAfter: null,
  request: {
    url: "https://api.example.com/data",
    method: "GET",
    headers: { "Authorization": "Bearer token123" },
    body: null
  },
  response: {
    status: 200,
    statusText: "OK",
    headers: {
      "content-type": "application/json",
      "x-ratelimit-remaining": "99",
      "x-ratelimit-limit": "100"
    },
    body: '{"id":1,"name":"Example","created":"2026-02-24T10:30:45Z"}'
  },
  error: null
}
```

### Rate Limited (429)
```javascript
{
  seq: 5,
  timestamp: "2026-02-24T10:30:50.456Z",
  status: "rate_limited",
  statusCode: 429,
  durationMs: 102,
  retryAfter: "60",
  request: {
    url: "https://api.example.com/data",
    method: "GET",
    headers: { "Authorization": "Bearer token123" },
    body: null
  },
  response: {
    status: 429,
    statusText: "Too Many Requests",
    headers: {
      "content-type": "application/json",
      "retry-after": "60",
      "x-ratelimit-remaining": "0",
      "x-ratelimit-limit": "100"
    },
    body: '{"error":"Rate limit exceeded","retryAfter":60}'
  },
  error: null
}
```

### Error de Conexión (Sin respuesta)
```javascript
{
  seq: 3,
  timestamp: "2026-02-24T10:30:48.789Z",
  status: "error",
  statusCode: 0,
  durationMs: 5000,
  retryAfter: null,
  request: {
    url: "https://api.invalid.com/data",
    method: "GET",
    headers: {},
    body: null
  },
  response: null,
  error: {
    message: "getaddrinfo ENOTFOUND api.invalid.com",
    code: "ENOTFOUND",
    errorType: "Error"
  }
}
```

### Error 4xx/5xx
```javascript
{
  seq: 2,
  timestamp: "2026-02-24T10:30:46.234Z",
  status: "error",
  statusCode: 401,
  durationMs: 340,
  retryAfter: null,
  request: {
    url: "https://api.example.com/protected",
    method: "GET",
    headers: { "Authorization": "Bearer invalid" },
    body: null
  },
  response: {
    status: 401,
    statusText: "Unauthorized",
    headers: {
      "content-type": "application/json",
      "www-authenticate": "Bearer realm=api"
    },
    body: '{"error":"Invalid authentication token"}'
  },
  error: null
}
```

## Límites y Truncado

### MAX_BODY_SIZE
- **Límite**: 100 KB (102400 bytes)
- **Aplicado a**: Request body y response body
- **Cuando se sobrepasa**: Se trunca y se añade `\n... (truncated)` al final

### Headers
- No tienen límite de tamaño
- Se capturan completos
- Se normalizan a un objeto plano

## Cómo Analizar Logs

### Detectar Rate Limits
```javascript
const rateLimited = job.results.filter(r => r.statusCode === 429);
const retryAfterValues = rateLimited.map(r => r.retryAfter);
```

### Analizar Errores de Conexión
```javascript
const connectionErrors = job.results.filter(r => r.statusCode === 0 && r.error);
const errorCodes = connectionErrors.map(r => r.error.code);
```

### Comparar Tiempos de Respuesta
```javascript
const avgDuration = job.results.reduce((sum, r) => sum + r.durationMs, 0) / job.results.length;
const slowRequests = job.results.filter(r => r.durationMs > avgDuration * 1.5);
```

### Inspeccionar Headers de Rate Limit
```javascript
job.results.forEach(r => {
  if (r.response && r.response.headers) {
    console.log(`Request ${r.seq}:`, {
      remaining: r.response.headers['x-ratelimit-remaining'],
      limit: r.response.headers['x-ratelimit-limit'],
      reset: r.response.headers['x-ratelimit-reset']
    });
  }
});
```

## Notas de Implementación

### Serialización de Body
- **Strings**: Se almacenan tal cual
- **Objetos**: Se convierten a JSON
- **Otros tipos**: Se convierten a string
- **Errores de serialización**: Se almacena un mensaje de error

### Extracción de Headers
- Soporta AxiosHeaders (método `.toJSON()`)
- Soporta objetos planos JavaScript
- Devuelve `{}` si los headers no están disponibles
- En caso de error, devuelve `{ error: "mensaje" }`

### Performance
- Las trazas se construyen después de cada respuesta
- El tamaño total de los logs es proporcional al número de peticiones
- Considerar los límites de memoria para tests con miles de peticiones
- Los logs se persisten en la base de datos (JSON file), considerar el tamaño

## Casos de Uso

### 1. Análisis Detallado de Rate Limits
Accedes a `response.headers` para ver los valores exactos de:
- `x-ratelimit-limit`
- `x-ratelimit-remaining`
- `x-ratelimit-reset`
- `retry-after`

### 2. Debugging de Errores
Los logs contienen toda la información necesaria para reproducir problemas:
- URL exacta
- Headers enviados
- Body enviado
- Respuesta completa del servidor
- Códigos de error de conexión

### 3. Análisis de Patrones
Con las trazas completas puedes:
- Identificar cambios en headers de rate limit
- Detectar patrones de timeout
- Analizar evolución de códigos de error
- Estudiar comportamiento bajo carga

### 4. Auditoría y Compliance
- Registro completo de lo que se envió y se recibió
- Timestamps exactos
- Duración de cada petición
- Información de errores para compliance

## Limitaciones Conocidas

- Bodies mayores a 100 KB se truncan
- Información binaria no se captura (ej: imágenes, archivos)
- Para APIs con respuestas muy grandes, considerar aumentar MAX_BODY_SIZE
- Cierta información sensible (tokens, passwords) se captura tal cual - revisar logs antes de compartir
