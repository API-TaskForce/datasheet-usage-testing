# Datasheet Usage Testing

Plataforma para gestionar templates de APIs, ejecutar pruebas de consumo y visualizar limites/cuotas con feedback en tiempo real.

## Estructura

- `backend/`: API REST (Node.js + Express)
- `frontend/`: aplicacion web (React + Vite)
- `docs/`: documentacion tecnica

# Instalación

## Requisitos de Instalación

- Node.js 18+
- npm 9+
- Git
- Docker (opcional, solo para Prometheus/Grafana) (De momento wip)

## Instalacion rapida

1. Clona el repositorio

```bash
git clone https://github.com/API-TaskForce/datasheet-usage-testing.git
cd datasheet-usage-testing
```

2. Instala dependencias del monorepo

```bash
npm install
```

3. Crea el archivo de entorno del backend

```bash
cp backend/.env.example backend/.env
```

Si usas Windows PowerShell y no tienes `cp`:

```powershell
Copy-Item backend/.env.example backend/.env
```

4. Inicia la aplicacion

```bash
npm run dev
```

Servicios levantados:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

## Configuracion minima recomendada

Edita `backend/.env` y deja al menos esto:

```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

Nota: No necesitas configurar todas las credenciales de APIs externas para arrancar la app. Solo agrega las que vayas a probar.

## Uso de la aplicacion (flujo sugerido)

1. Abre el frontend en `http://localhost:5173`.
2. Crea o edita un template de API con su `apiUri`, autenticacion y datasheet.
3. (Opcional) Define un test preconfigurado para esa API.
4. En el dashboard, ejecuta `Test`.
5. Revisa:
- peticiones en tiempo real
- historico de peticiones
- capacidad/cuota y eventos de cooldown
- limites detectados desde datasheet/respuesta

## Comandos utiles

Desde la raiz del repositorio:

```bash
# Arrancar backend + frontend
npm run dev

# Compilar frontend
npm run build

# Previsualizar build de frontend
npm run preview

# Ejecutar tests del backend
npm test
```

## Monitoreo opcional (Prometheus + Grafana) (WIP)

```bash
cd backend
docker-compose up -d
```

Accesos:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (user: `admin`, pass: `admin`)

Para detener:

```bash
cd backend
docker-compose down
```

## Problemas comunes

1. Puerto 3000 ocupado

```powershell
netstat -ano | findstr :3000
```

Cambia `PORT` en `backend/.env` si hace falta.

2. El frontend no conecta con el backend

Verifica `CORS_ORIGIN=http://localhost:5173` en `backend/.env`.

3. Fallan tests por timeout

Algunas APIs externas son lentas o inestables. Reintenta o ejecuta tests mas acotados.

## Documentacion adicional

- `docs/QUICK_START.md`
- `docs/SETUP.md`
- `docs/ARCHITECTURE.md`
- `docs/API_SPECIFICATION.md`
- `docs/TESTING_GUIDE.md`

## Licencia

ISC
