# Setup del Proyecto - Datasheet Usage Testing

Este documento describe cómo configurar y ejecutar el proyecto completo (backend + frontend).

## Requisitos Previos

- Node.js (v16 o superior)
- npm (v7 o superior, para soporte de workspaces)

## Instalación

### 1. Instalar todas las dependencias

```bash
npm install
```

Esto instalará las dependencias tanto del backend como del frontend automáticamente gracias a los workspaces.

## Ejecución del Proyecto

### Opción 1: Ejecutar Backend y Frontend juntos (Recomendado)

```bash
npm run dev
```

Esto ejecutará simultáneamente:
- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:5173

El frontend tiene un proxy configurado que redirige las requests `/api/*` al backend automáticamente.

### Opción 2: Ejecutar solo Backend

```bash
npm run dev --workspace=backend
```

El backend escuchará en `http://localhost:3000`

### Opción 3: Ejecutar solo Frontend

```bash
npm run dev --workspace=frontend
```

El frontend escuchará en `http://localhost:5173`

## Otras Operaciones

### Testing

Ejecutar todos los tests del backend:

```bash
npm run test
```

### Build para Producción

Compilar el frontend:

```bash
npm run build
```

### Preview de Producción

Visualizar la versión de producción del frontend:

```bash
npm run preview
```

## Estructura del Proyecto

```
datasheet-usage-testing/
├── backend/
│   ├── src/
│   │   ├── server.js          # Punto de entrada del servidor
│   │   ├── engine.js          # Lógica de ejecución
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── lib/
│   │   └── middlewares/
│   ├── tests/                 # Pruebas del backend
│   ├── data/
│   │   └── db.json            # Base de datos local
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.js            # Punto de entrada
│   │   ├── App.vue            # Componente raíz
│   │   └── style.css
│   ├── index.html             # HTML principal
│   ├── vite.config.js         # Configuración de Vite
│   └── package.json
├── package.json               # Package.json raíz (monorepo)
├── README.md
└── SETUP.md (este archivo)
```

## Variables de Entorno

### Backend

Crear un archivo `.env` en la carpeta `backend/`:

```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

### Frontend

No requiere configuración especial. Los endpoints del API se configuran en el código.

## Comunicación Backend-Frontend

El frontend está configurado con un proxy Vite que redirige las requests:
- `http://localhost:5173/api/*` → `http://localhost:3000/*`

Esto permite que el frontend haga requests sin preocuparse por CORS durante desarrollo.

## Solución de Problemas

### Puerto 3000 o 5173 ya está en uso

**Backend**: Cambiar el puerto en el `.env`:
```env
PORT=3001
```

**Frontend**: Vite usará automáticamente otro puerto si el 5173 está ocupado.

### Dependencias no se instalan correctamente

Limpiar caché de npm y reinstalar:

```bash
npm cache clean --force
rm -rf node_modules backend/node_modules frontend/node_modules
npm install
```

### CORS errors al hacer requests desde el frontend

Verificar que:
1. El backend está ejecutándose en `http://localhost:3000`
2. La variable `CORS_ORIGIN` en el backend está correctamente configurada
3. El frontend proxy en `vite.config.js` está bien configurado

## Desarrollo

### Agregar nuevas dependencias al Backend

```bash
npm install --workspace=backend nombre-paquete
```

### Agregar nuevas dependencias al Frontend

```bash
npm install --workspace=frontend nombre-paquete
```

### Agregar dependencias de desarrollo

```bash
npm install --workspace=backend --save-dev nombre-paquete
npm install --workspace=frontend --save-dev nombre-paquete
```

## Más Información

- [Backend README](./backend/README.md) - Detalles específicos del backend
- [Frontend README](./frontend/README.md) - Detalles específicos del frontend
