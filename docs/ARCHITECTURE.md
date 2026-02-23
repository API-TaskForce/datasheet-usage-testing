# Arquitectura del Proyecto

## Visión General

Este es un proyecto **monorepo** que combina un backend API (Node.js + Express) con un frontend moderno (Vue 3 + Vite).

## Estructura del Monorepo

```
datasheet-usage-testing/
│
├── backend/                  # API REST (Node.js + Express)
│   ├── src/
│   │   ├── server.js         # Configuración de Express
│   │   ├── engine.js         # Lógica de ejecución de tests
│   │   ├── db.js             # Gestión de base de datos
│   │   ├── routes/           # Definición de rutas REST
│   │   ├── controllers/      # Handlers de rutas
│   │   ├── services/         # Lógica de negocio
│   │   ├── middlewares/      # Middlewares (logger, validador, error handler)
│   │   └── lib/              # Utilidades (https client, logging)
│   ├── tests/                # Tests unitarios (Jest)
│   ├── data/
│   │   └── db.json           # Base de datos local (JSON)
│   ├── package.json
│   ├── jest.config.cjs
│   └── .env.example
│
├── frontend/                 # Aplicación web (Vue 3 + Vite)
│   ├── src/
│   │   ├── main.js           # Punto de entrada
│   │   ├── App.vue           # Componente raíz
│   │   └── style.css         # Estilos globales
│   ├── index.html            # HTML principal
│   ├── vite.config.js        # Configuración de Vite
│   ├── package.json
│   └── README.md
│
├── package.json              # Configuración del monorepo
├── README.md                 # Documentación principal
├── SETUP.md                  # Guía de instalación
└── ARCHITECTURE.md           # Este archivo
```

## Backend - API Limiter Service

### Propósito

El backend es un **API Limiter & Monitor** que:
- Ejecuta tests de límites de rate en APIs externas
- Orquesta múltiples pruebas concurrentes
- Almacena resultados de tests
- Expone un API REST para consultar y ejecutar tests

### Tecnologías

- **Express.js** - Framework web
- **Joi** - Validación de schemas
- **Axios** - Cliente HTTP
- **Jest** - Testing
- **Nodemon** - Hot reload en desarrollo

### Flujo de Arquitectura

```
Cliente Frontend
      ↓
    CORS
      ↓
Express Server (Puerto 3000)
      ↓
   Router → /tests
      ↓
Controller/Handler
      ↓
Service Layer (testsService)
      ↓
Engine (engine.js) - Ejecuta tests
      ↓
HTTP Client (httpClient.js) → APIs Externas
```

### Endpoints Principales

- `POST /tests/run` - Crear y ejecutar un test
- `GET /tests/:id` - Obtener estado/resultado de un test

### Middlewares

1. **Logger** - Registra todas las requests
2. **Validator** - Valida payloads con Joi
3. **Error Handler** - Maneja errores globalmente
4. **CORS** - Permite requests desde el frontend

## Frontend - Vue 3 + Vite

### Propósito

El frontend es una interfaz web que:
- Permite crear y ejecutar tests
- Visualiza resultados de tests
- Monitorea límites de rate en tiempo real

### Tecnologías

- **Vue 3** - Framework UI con Composition API
- **Vite** - Build tool y dev server
- **Axios** - Cliente HTTP para requests al backend

### Características Vite

- Dev server ultra-rápido con HMR (Hot Module Replacement)
- Build optimizado para producción
- Proxy automático a `/api/*` → backend

### Configuración del Proxy

En `frontend/vite.config.js`:

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

Durante desarrollo, requests a `/api/tests/run` se redirigen automáticamente a `http://localhost:3000/tests/run`.

## Flujo de Datos

```
┌─────────────────────────────────────────────────┐
│          Frontend (Vue 3 + Vite)               │
│         http://localhost:5173                  │
├─────────────────────────────────────────────────┤
│  ├─ User Interface                             │
│  ├─ Form Input para crear tests                │
│  └─ Results Display                            │
└──────────────────┬──────────────────────────────┘
                   │
                   │ HTTP Requests
                   │ /api/tests/run (POST)
                   │ /api/tests/:id (GET)
                   ↓
┌─────────────────────────────────────────────────┐
│           Backend (Node.js + Express)           │
│          http://localhost:3000                  │
├─────────────────────────────────────────────────┤
│  ├─ CORS Middleware                            │
│  ├─ Router (/tests)                            │
│  ├─ Controller (testsController)               │
│  ├─ Service (testsService)                     │
│  ├─ Engine (Executes tests)                    │
│  └─ HTTP Client (Calls external APIs)          │
└──────────────────┬──────────────────────────────┘
                   │
                   │ HTTP Requests
                   ↓
         ┌─────────────────────┐
         │ External APIs       │
         │ ├─ Amadeus          │
         │ ├─ MailerSend       │
         │ ├─ Spoonacular      │
         │ ├─ Vimeo            │
         │ ├─ Azure Translator │
         │ └─ ... más APIs     │
         └─────────────────────┘
```

## Workspaces de NPM

Este proyecto usa **npm workspaces** para gestionar dependencias de forma centralizada.

### Ventajas

- Instalar todas las dependencias con `npm install`
- Ejecutar scripts en workspaces específicos
- Compartir dependencias comunes

### Comandos Típicos

```bash
# Instalar paquete en el backend
npm install --workspace=backend paquete-name

# Instalar paquete en el frontend
npm install --workspace=frontend paquete-name

# Ejecutar script en workspace específico
npm run dev --workspace=backend
npm run dev --workspace=frontend

# Ejecutar en todos los workspaces
npm run dev
```

## Ciclo de Desarrollo

### Local Development

```bash
npm install        # Instalar dependencias
npm run dev        # Ejecutar backend + frontend
```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

### Testing

```bash
npm run test       # Ejecutar tests del backend
```

### Production Build

```bash
npm run build      # Build del frontend
```

Genera carpeta `frontend/dist/` con archivos optimizados.

## Variables de Entorno

### Backend (.env)

```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
AMADEUS_CLIENT_ID=...
AMADEUS_CLIENT_SECRET=...
# ... más variables
```

### Frontend

No requiere .env. La configuración está en el código y `vite.config.js`.

## Consideraciones de Seguridad

1. **CORS**: El backend solo acepta requests desde `http://localhost:5173` en desarrollo
2. **API Keys**: Almacenadas en `.env` (nunca en el repositorio)
3. **Validación**: Todo payload es validado con Joi en el backend
4. **Error Handling**: Los errores se manejan globalmente sin exponer detalles sensibles

## Escalabilidad Futura

Posibles mejoras arquitectónicas:

1. **Database**: Migrar de JSON a MongoDB/PostgreSQL
2. **Auth**: Agregar autenticación JWT
3. **WebSocket**: Real-time updates de test status
4. **Docker**: Containerización para deployment
5. **CI/CD**: Pipeline de testing y deployment automático
6. **Logging**: ELK Stack para logging centralizado
