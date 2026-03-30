# Ejemplos de Llamadas - Endpoints Backend

Esta guia muestra ejemplos de como configurar una llamada a cada endpoint principal del backend.

Base URL local:

```bash
http://localhost:3000
```

Recomendacion: usar siempre rutas con prefijo `/api` desde clientes frontend.

## 0) Variables utiles

```bash
BASE_URL="http://localhost:3000"
TEMPLATE_ID="reemplazar-template-id"
TEST_ID="reemplazar-test-id"
CONFIG_ID="reemplazar-config-id"
COLLECTION_ID="reemplazar-collection-id"
```

## 1) Salud del servicio

### GET /api/health

Devuelve el estado del servicio para validar que el backend esta disponible.

```bash
curl -X GET "$BASE_URL/api/health"
```

Respuesta esperada (ejemplo):

```json
{
  "service": "api-limiter-service",
  "status": "ok"
}
```

## 2) Proxy hacia APIs externas

### POST /api/proxy

Reenvia una peticion HTTP a una API externa desde el backend para evitar problemas de CORS en el frontend.

```bash
curl -X POST "$BASE_URL/api/proxy" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.github.com/repos/API-TaskForce/datasheet-usage-testing",
    "method": "GET",
    "headers": {
      "Accept": "application/vnd.github+json"
    }
  }'
```

Notas:

- `url` es obligatorio y debe ser URL valida.
- El proxy bloquea URLs locales como `localhost` o `127.0.0.1`.

## 3) Tests (ejecucion de pruebas)

### POST /api/tests/run

Crea un job de prueba de consumo/rate-limit y devuelve el identificador para hacer seguimiento.

```bash
curl -X POST "$BASE_URL/api/tests/run" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "https://jsonplaceholder.typicode.com/posts",
    "request": {
      "method": "GET",
      "headers": {
        "Accept": "application/json"
      }
    },
    "clients": 2,
    "totalRequests": 20,
    "intervalMs": 100,
    "timeoutMs": 5000,
    "rateControl": {
      "rateMax": 10,
      "windowModel": "FIXED_WINDOW",
      "windowSeconds": 60,
      "cooldownSeconds": 15
    }
  }'
```

### GET /api/tests

Lista todos los jobs de prueba guardados en el sistema.

```bash
curl -X GET "$BASE_URL/api/tests"
```

### GET /api/tests/:id

Consulta el detalle final de un job especifico (config, resultados y resumen).

```bash
curl -X GET "$BASE_URL/api/tests/$TEST_ID"
```

### GET /api/tests/:id/active

Obtiene el estado en memoria de un job en ejecucion (progreso en tiempo real).

```bash
curl -X GET "$BASE_URL/api/tests/$TEST_ID/active"
```

### DELETE /api/tests/:id

Elimina un log/job de prueba especifico por su id.

```bash
curl -X DELETE "$BASE_URL/api/tests/$TEST_ID"
```

### DELETE /api/tests

Elimina todos los logs/jobs de prueba almacenados.

```bash
curl -X DELETE "$BASE_URL/api/tests"
```

## 4) Templates

### POST /api/templates

Crea una nueva plantilla de API con su configuracion base y datasheet.

```bash
curl -X POST "$BASE_URL/api/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GitHub API",
    "authMethod": "BEARER",
    "authCredential": "${GITHUB_TOKEN}",
    "apiUri": "https://api.github.com",
    "datasheet": "name: GitHub API\nlimits:\n  rate:\n    requests: 5000\n    period: 1h\n"
  }'
```

### GET /api/templates

Devuelve el listado completo de plantillas registradas.

```bash
curl -X GET "$BASE_URL/api/templates"
```

### GET /api/templates/:id

Recupera una plantilla concreta por id.

```bash
curl -X GET "$BASE_URL/api/templates/$TEMPLATE_ID"
```

### PUT /api/templates/:id

Actualiza campos de una plantilla existente (por ejemplo nombre, URI, auth o datasheet).

```bash
curl -X PUT "$BASE_URL/api/templates/$TEMPLATE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GitHub API v2",
    "authMethod": "BEARER",
    "authCredential": "${GITHUB_TOKEN}",
    "apiUri": "https://api.github.com",
    "status": "active",
    "datasheet": "name: GitHub API\nlimits:\n  rate:\n    requests: 5000\n    period: 1h\n"
  }'
```

### GET /api/templates/:id/datasheet

Devuelve la plantilla junto al datasheet parseado para consumo del dashboard.

```bash
curl -X GET "$BASE_URL/api/templates/$TEMPLATE_ID/datasheet"
```

### GET /api/templates/:id/limits

Extrae y devuelve limites detectados desde el datasheet de la plantilla.

```bash
curl -X GET "$BASE_URL/api/templates/$TEMPLATE_ID/limits"
```

### DELETE /api/templates/:id

Elimina una plantilla por id.

```bash
curl -X DELETE "$BASE_URL/api/templates/$TEMPLATE_ID"
```

## 5) Test Configs

### POST /api/test-configs

Crea una configuracion de prueba reutilizable asociada a una plantilla.

```bash
curl -X POST "$BASE_URL/api/test-configs" \
  -H "Content-Type: application/json" \
  -d '{
    "apiTemplateId": "'$TEMPLATE_ID'",
    "testName": "Smoke GET",
    "endpoint": "https://api.github.com",
    "request": {
      "method": "GET",
      "headers": {
        "Accept": "application/vnd.github+json"
      }
    },
    "clients": 1,
    "totalRequests": 1
  }'
```

### GET /api/test-configs

Lista todas las configuraciones de prueba guardadas.

```bash
curl -X GET "$BASE_URL/api/test-configs"
```

### GET /api/test-configs?templateId=:templateId

Lista solo las configuraciones de prueba vinculadas a una plantilla especifica.

```bash
curl -X GET "$BASE_URL/api/test-configs?templateId=$TEMPLATE_ID"
```

### GET /api/test-configs/:id

Obtiene el detalle de una configuracion de prueba por id.

```bash
curl -X GET "$BASE_URL/api/test-configs/$CONFIG_ID"
```

### PUT /api/test-configs/:id

Actualiza parcialmente una configuracion de prueba existente.

```bash
curl -X PUT "$BASE_URL/api/test-configs/$CONFIG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "testName": "Smoke GET updated",
    "totalRequests": 2
  }'
```

### DELETE /api/test-configs/:id

Elimina una configuracion de prueba por id.

```bash
curl -X DELETE "$BASE_URL/api/test-configs/$CONFIG_ID"
```

## 6) Collections

### POST /api/collections

Crea una nueva coleccion para agrupar plantillas de API.

```bash
curl -X POST "$BASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product APIs",
    "description": "Coleccion principal para APIs de producto",
    "color": "#0ea5e9"
  }'
```

### GET /api/collections

Devuelve todas las colecciones existentes.

```bash
curl -X GET "$BASE_URL/api/collections"
```

### GET /api/collections/:id

Devuelve una coleccion especifica por id.

```bash
curl -X GET "$BASE_URL/api/collections/$COLLECTION_ID"
```

### PUT /api/collections/:id

    Actualiza nombre, descripcion o color de una coleccion.

```bash
curl -X PUT "$BASE_URL/api/collections/$COLLECTION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product APIs (Core)",
    "description": "Coleccion actualizada"
  }'
```

### DELETE /api/collections/:id

Elimina una coleccion; las APIs asociadas quedan sin coleccion.

```bash
curl -X DELETE "$BASE_URL/api/collections/$COLLECTION_ID"
```

## 7) Monitoring

### GET /api/monitoring/metrics (consulta instantanea)

Ejecuta una consulta instantanea de Prometheus usando el parametro `query`.

```bash
curl -G "$BASE_URL/api/monitoring/metrics" \
  --data-urlencode "query=up"
```

### GET /api/monitoring/metrics?type=range (consulta por rango)

Ejecuta una consulta por rango temporal en Prometheus (`start`, `end`, `step`).

```bash
curl -G "$BASE_URL/api/monitoring/metrics" \
  --data-urlencode "type=range" \
  --data-urlencode "query=up" \
  --data-urlencode "start=1710000000" \
  --data-urlencode "end=1710003600" \
  --data-urlencode "step=30"
```

### GET /metrics

Expone metricas internas del backend en formato Prometheus para scraping.

```bash
curl -X GET "$BASE_URL/metrics"
```

## 8) Ejemplo rapido en JavaScript (fetch)

```javascript
const BASE_URL = 'http://localhost:3000';

async function runTest() {
  const response = await fetch(`${BASE_URL}/api/tests/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: 'https://jsonplaceholder.typicode.com/posts',
      request: { method: 'GET', headers: { Accept: 'application/json' } },
      clients: 1,
      totalRequests: 5,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}
```
