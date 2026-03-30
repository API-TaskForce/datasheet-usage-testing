# Backend - Guia Breve

## 1) Rol del backend

El backend expone una API REST para:

- gestionar plantillas de APIs (templates),
- ejecutar pruebas de consumo/rate limit,
- consultar logs/resultados,
- gestionar colecciones,
- exponer metricas para monitoreo.

Archivo de entrada principal: `backend/src/server.js`.

## 2) Estructura principal

- `backend/src/server.js`: bootstrap de Express, CORS, rutas, proxy, health, metrics.
- `backend/src/routes/index.js`: router unico con dispatch por tipo de ruta.
- `backend/src/controllers/`: capa HTTP (request/response).
- `backend/src/services/`: logica de negocio por modulo.
- `backend/src/engine.js`: ejecucion de pruebas y simulaciones, control de ritmo, cooldown.
- `backend/src/db/`: persistencia en archivos JSON.
- `backend/data/`: archivos de datos (`db.json`, `test-logs.json`, `test-configs.json`).

## 3) Flujo de una prueba

1. Frontend llama `POST /api/tests/run`.
2. Router redirige al controller de tests.
3. Service delega a `engine.startTest`.
4. `engine.js` crea job, ejecuta requests y actualiza estado.
5. Resultados se guardan en persistencia JSON.
6. Frontend consulta progreso con `GET /api/tests/:id/active` y resultado final con `GET /api/tests/:id`.

## 4) Endpoints clave

- Health:
  - `GET /health`
  - `GET /api/health`
- Proxy CORS hacia APIs externas:
  - `POST /proxy`
  - `POST /api/proxy`
- Tests:
  - `POST /api/tests/run`
  - `GET /api/tests`
  - `GET /api/tests/:id`
  - `GET /api/tests/:id/active`
  - `DELETE /api/tests/:id`
  - `DELETE /api/tests`
- Templates:
  - `GET /api/templates`
  - `POST /api/templates`
  - `PUT /api/templates/:id`
  - `GET /api/templates/:id/datasheet`
  - `GET /api/templates/:id/limits`
- Collections:
  - `GET /api/collections`
  - `POST /api/collections`
  - `PUT /api/collections/:id`
  - `DELETE /api/collections/:id`
- Monitoring:
  - `GET /api/monitoring/metrics`
  - `GET /metrics`

## 5) Configuracion importante

- Variables en `backend/.env`.
- Minimo recomendado:

```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

## 6) Comandos utiles

Desde la raiz:

```bash
npm run dev
npm run test
```

Solo backend:

```bash
npm run dev --workspace=backend
npm run test --workspace=backend
```

## 7) Donde tocar cuando haya cambios

- Nuevo endpoint o cambio de contrato:
  - `backend/src/routes/index.js`
  - controller correspondiente en `backend/src/controllers/`
  - service correspondiente en `backend/src/services/`
- Cambio de logica de pruebas/rate-limit:
  - `backend/src/engine.js`
- Cambio de validaciones:
  - `backend/src/middlewares/validator.js`
- Cambio de persistencia:
  - `backend/src/db/`
