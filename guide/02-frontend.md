# Frontend - Guia Detallada

## 1) Objetivo del frontend

El frontend es la consola operativa del proyecto para:

- administrar APIs templates,
- organizar templates por colecciones,
- simular y visualizar comportamiento de rate limit/quota,
- inspeccionar datasheets,
- revisar historico de ejecuciones.

Stack actual real:

- React 19 + Vite.
- Axios para llamadas HTTP.
- uPlot para graficas de alto rendimiento.
- Lucide React para iconografia.

## 2) Navegacion principal (usuario)

La app usa navegacion por estado interno (sin router):

- APIs: catalogo de templates.
- Colecciones: agrupacion y gestion masiva de templates.
- Registros de pruebas: historial y auditoria.
- API Dashboard: vista tecnica de una API seleccionada.

Archivo orquestador: `frontend/src/App.jsx`.

## 3) Arquitectura funcional

Capas principales:

- Vistas: `frontend/src/views/`.
- Componentes UI: `frontend/src/components/`.
- Servicios HTTP: `frontend/src/services/`.
- Hooks de logica: `frontend/src/hooks/`.
- Estado global ligero (toasts): `frontend/src/stores/toastStore.jsx`.

Flujo de datos:

1. Vista dispara accion de usuario.
2. Servicio Axios llama backend (`/api/*`).
3. Respuesta se transforma en estado local.
4. Componentes de dashboard renderizan metricas, series y tablas.
5. Notificaciones se publican via toast global.

## 4) Funcionalidades implementadas por modulo

### 4.1 Gestion de APIs templates (vista APIs)

Ubicacion principal:

- `frontend/src/views/TemplatesPage.jsx`
- `frontend/src/components/TemplateForm.jsx`
- `frontend/src/components/ApiTemplateCard.jsx`

Funcionalidades disponibles:

- Crear template.
  - Uso: boton `+ Nueva API`.
  - Finalidad: registrar una API para testing y monitoreo.
- Editar template.
  - Uso: menu de acciones en cada tarjeta.
  - Finalidad: actualizar URI, auth, datasheet, estado o coleccion.
- Eliminar template.
  - Uso: menu de acciones con confirmacion.
  - Finalidad: limpiar APIs obsoletas.
- Seleccionar template para dashboard.
  - Uso: boton `Dashboard` en tarjeta.
  - Finalidad: abrir analitica y simulacion de esa API.

Capacidades del formulario de template:

- Soporte de auth methods: `API_TOKEN`, `BASIC_AUTH`, `BEARER`, `RAPID_API`, `OAUTH2`.
- Si auth esta desactivada, usa credencial por defecto `NO_AUTH_REQUIRED`.
- Datasheet en YAML por dos modos:
  - subir archivo `.yml/.yaml`,
  - pegar manualmente.
- Validacion y formateo YAML en cliente.
- Toggle para `Dummy API` con autocompletado de datos base.
- Asignacion de template a coleccion desde el mismo formulario.

### 4.2 Dashboard de API (analitica y simulacion)

Ubicacion principal:

- `frontend/src/views/ApiDashboardView.jsx`

Funcionalidades disponibles para usuario:

- KPIs en cabecera.
  - Total requests, success, rate-limited y latencia promedio.
  - Finalidad: lectura rapida del estado historico.
- Controles de showcase.
  - Seleccion de ventana (`5m`, `10m`, `15m`, `30m`, `1h`).
  - Seleccion de perfil (`Buena reputacion`, `Conservador`, `Por rafagas`, `Consumo intensivo`, `Mala reputacion`).
  - Accion `Aplicar Perfil Showcase` para inyectar trafico sintetico realista.
  - Finalidad: demostrar y comparar comportamiento bajo distintos patrones.
- Panel de control Dummy (solo APIs Dummy).
  - Configura `rateMax`, `quotaMax`, `windowModel`, `windowSeconds`, `cooldownSeconds`, `totalRequests` y burst.
  - Presets: `Normal`, `Stress`, `Recovery`.
  - Boton `Aplicar` persiste configuracion en backend.
  - Finalidad: experimentar limites sin depender de proveedor externo.
- Visualizacion de datasheet.
  - Modal con parseo por estructura estandar o custom.
  - Secciones plegables: info, autenticacion, capacity, rate limits, endpoints, headers, segmentacion y raw data.
  - Finalidad: inspeccion funcional de contrato y restricciones de API.
- Edicion rapida desde dashboard.
  - Icono de lapiz abre `TemplateForm` modal.
  - Finalidad: ajustar template sin volver al listado.

Analitica y graficas implementadas:

- Trafico de peticiones.
  - Barras de instantaneas + linea de trafico acumulado + linea rate limit + overlay cooldown.
  - Zoom por arrastre y reset por doble click.
- Capacidad efectiva.
  - Series: capacidad consumida, perdida por cooldown y restante.
  - Intervalo configurable (`auto`, `5s`, `15s`, `30s`, `60s`, `120s`, `300s`).
- Tarjeta API Limits & Quota.
  - Muestra origen de limites (`datasheet`, `template`, `runtime`, `response`, `dummy`) y modelo de ventana.
- Panel realtime (tab dedicado).
  - Vista simple: estado de cada request con iconos.
  - Vista avanzada: request/response con metodo, URL, codigo y body parcial.

Comportamientos tecnicos relevantes ya implementados:

- Simulacion progresiva con reproduccion organica del tiempo.
- Manejo de ventanas `FIXED_WINDOW` y `SLIDING_WINDOW`.
- Deteccion de cooldown y sombreado en graficas.
- Extraccion de limites desde backend y fallback por respuesta.
- Historial interno por template mediante `useTestHistory`.
- Semilla automatica inicial de datos simulados cuando no hay historial.
- Modo global forzado a simulado (`SIMULATION_ONLY_MODE = true`).

### 4.3 Colecciones

Ubicacion principal:

- `frontend/src/views/CollectionsPage.jsx`
- `frontend/src/components/CollectionForm.jsx`
- `frontend/src/components/ApiTemplateSelectorModal.jsx`

Funcionalidades disponibles:

- Crear, editar y eliminar colecciones.
  - Finalidad: organizar templates por dominio/equipo/uso.
- Expandir/colapsar cada coleccion para ver APIs asociadas.
- Crear API directamente dentro de una coleccion.
- Añadir APIs existentes a una coleccion (seleccion multiple).
- Orden visual de APIs por `collectionOrder` y nombre.
- Backfill automatico de imagenes de cover/logo cuando faltan.

### 4.4 Registros de pruebas

Ubicacion principal:

- `frontend/src/views/TestLogsPage.jsx`
- `frontend/src/components/TestLogDetailModal.jsx`

Funcionalidades disponibles:

- Cargar logs con orden descendente por fecha.
- Filtro por estado: `all`, `completed`, `running`, `queued`, `failed`.
- Agrupacion inteligente por template:
  - por `templateId` directo,
  - o por matching de `endpoint` contra `apiUri`.
- Expandir/colapsar grupos.
- Modo seleccion multiple:
  - seleccionar items,
  - seleccionar todo,
  - borrado masivo.
- Eliminacion individual y eliminacion total.
- Modal de detalle por log con:
  - configuracion,
  - resumen,
  - resultados request por request,
  - copia rapida de response body.

### 4.5 Configuraciones predefinidas de test

Ubicacion principal:

- `frontend/src/components/TestConfigModal.jsx`
- `frontend/src/components/TemplateTestView.jsx`

Funcionalidades implementadas:

- CRUD de test configs por template.
- Marcar una configuracion como predeterminada (solo una activa).
- Parametrizacion de:
  - metodo,
  - path,
  - clients,
  - totalRequests,
  - timeout,
  - body JSON,
  - flag `isDefault`.
- Formateo y correccion basica de JSON en body.
- Carga de config predeterminada en formularios de test.

## 5) Servicios y endpoints consumidos

Cliente principal:

- `frontend/src/services/apiTemplateService.js`

Configuracion:

- `baseURL = /api`
- timeout base 5s
- interceptor que normaliza errores backend a `Error` con `status`.

Endpoints usados por frontend:

- Templates: `/api/templates*`
- Tests: `/api/tests*`
- Test configs: `/api/test-configs*`
- Collections: `/api/collections*`
- Proxy: `/api/proxy`
- Monitoring: `/api/monitoring/metrics` (via `monitoringService.js`)

## 6) Estado, persistencia y UX transversal

### 6.1 Toasts

Ubicacion: `frontend/src/stores/toastStore.jsx`

- Toast provider global.
- Dedupe por `groupKey` para evitar spam.
- Auto-dismiss configurable por tipo.

### 6.2 Historial local

Ubicacion: `frontend/src/hooks/useTestHistory.js`

- Persistencia opcional por template en `localStorage`.
- Compactacion de resultados para evitar overflow de cuota.
- Limite de entradas (`MAX_STORED_TESTS`) y resultados por test.
- Sincronizacion entre pestañas por evento `storage`.
- Funciones de agregacion temporal para series.

## 7) Funciones implementadas pero no expuestas hoy en UI

Las siguientes piezas existen en codigo pero actualmente no estan visibles para usuario final en el flujo principal:

- `ApiDashboardActionBar` y `SafeModeAutoRefreshCard` en `ApiDashboardView`.
  - La seccion esta comentada en el render actual.
- `TemplateTestView` modal de configuracion manual en dashboard.
  - Sigue implementado, pero su acceso depende del bloque de action bar comentado.
- Modo `real` en dashboard.
  - El codigo fuerza modo simulado (`SIMULATION_ONLY_MODE = true`).
- `RateLimitInfo.jsx` y `StorageInfoPanel.jsx`.
  - Estan implementados pero sin uso en vistas actuales.
- `templateStore.js`.
  - Store legado en Pinia/Vue, no utilizado por la app React actual.

## 8) Guia de uso operativo rapido

Flujo recomendado para nuevo equipo:

1. Crear una API template con datasheet valido.
2. Entrar al dashboard de la API.
3. Aplicar un perfil de showcase y observar:
   - trafico,
   - capacidad,
   - rate limit,
   - eventos de cooldown.
4. Si la API es Dummy, ajustar limites en panel Dummy y volver a ejecutar.
5. Revisar historico global en Registros de pruebas.
6. Organizar templates en Colecciones.

## 9) Comandos utiles

Desde la raiz:

```bash
npm run dev
npm run build
npm run preview
```

Solo frontend:

```bash
npm run dev --workspace=frontend
npm run build --workspace=frontend
```

## 10) Puntos de atencion para mantenimiento

- `ApiDashboardView.jsx` concentra la mayor parte de la logica funcional.
- Validar siempre regresiones en:
  - agregacion de series,
  - deteccion de cooldown,
  - perfiles showcase,
  - estado de tabs realtime/charts.
- Mantener contratos backend/frontend sincronizados.
- Evitar persistir payloads completos en historial local; usar formato compacto.
