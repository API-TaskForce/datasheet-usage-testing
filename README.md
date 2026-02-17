# Pruebas de uso para datasheets

## Introducción

En este repositorio, implementaremos pruebas para comprobar y corroborar los límites de uso para ciertas APIs en concreto.

## Objetivos

- [ ] Creación de un limitador general a nivel de cliente.
- [ ] Comprobación mediante tests de las respuestas esperadas.

---

## Estructura propuesta ✅

El backend está organizado para ser un **API Limiter & Monitor** (orquestador de pruebas). Estructura inicial creada en este repo:

/api-limiter-service
├── src/
│   ├── engine.js               # Lógica de ejecución (worker/engine)
│   ├── routes/                 # Rutas REST (index.js)
│   │   └── index.js
│   ├── controllers/            # Handlers por ruta (separación controller/service)
│   │   └── testsController.js
│   ├── services/               # Lógica de negocio / orquestación (service layer)
│   │   └── testsService.js
│   ├── lib/                    # Utilities / adapters (http client, etc.)
│   │   └── httpClient.js
│   ├── middlewares/            # Validator, logger y error handler
│   └── server.js               # Punto de entrada
└── .env

## Cómo usar (rápido) ⚡

1. Instalar dependencias:

   `npm install`

2. Arrancar en modo desarrollo (con nodemon):

   `npm run dev`

3. Endpoints principales:

- `POST /tests/run` — enviar configuración de prueba (valida con Joi)
- `GET /tests/:id`  — ver estado/resultados de la prueba

## Esquema de entrada (ejemplo)

POST /tests/run
{
  "endpoint": "https://api.example.com/health",
  "request": { "method": "GET" },
  "clients": 2,
  "totalRequests": 10,
  "intervalMs": 100
}

---

## Siguientes pasos sugeridos 💡

- Persistir en DB real (SQLite / Postgres) para análisis a largo plazo
- Añadir autenticación y control de acceso
- Implementar colas y workers distribuidos (Bull, Redis)
- Añadir métricas y dashboard (Grafana / Prometheus)
