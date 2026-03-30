# Handoff y Operacion

## 1) Objetivo de esta fase

Facilitar que un nuevo equipo pueda continuar el desarrollo con bajo riesgo y contexto minimo inicial.

## 2) Checklist de arranque (primeros 2 dias)

1. Levantar entorno local con `npm install` y `npm run dev`.
2. Verificar frontend en `http://localhost:5173`.
3. Verificar backend en `http://localhost:3000/health`.
4. Probar flujo completo:
   - crear template,
   - ejecutar test,
   - revisar dashboard,
   - revisar logs,
   - borrar log de prueba.
5. Ejecutar tests backend: `npm run test`.

## 3) Convenciones practicas

- Mantener separacion por capas en backend: rutas -> controllers -> services.
- Evitar meter reglas de negocio en controllers.
- Mantener cliente HTTP frontend centralizado en `apiTemplateService.js`.
- Si cambia un payload del backend, actualizar en la misma rama la lectura en frontend.

## 4) Riesgos conocidos

- Documentacion historica con referencias a Vue (actualmente el frontend es React).
- Alta cantidad de archivos `*.corrupt-*` en `backend/data/`; revisar estrategia de limpieza/rotacion.
- `ApiDashboardView.jsx` es un archivo grande y sensible a regresiones funcionales.

## 5) Recomendaciones de corto plazo

1. Crear smoke tests E2E basicos para el flujo principal (crear template -> ejecutar test -> ver log).
2. Extraer partes de `ApiDashboardView.jsx` en hooks/componentes mas pequenos.
3. Definir versionado de contrato API (aunque sea interno) para reducir roturas frontend-backend.
4. Revisar politica de persistencia en archivos JSON y plan de migracion a DB mas robusta si crece volumen.

## 6) Mapa de lectura sugerido

1. `README.md`
2. `guide/01-backend.md`
3. `guide/02-frontend.md`
4. `docs/API_SPECIFICATION.md`
5. `docs/TESTING_GUIDE.md`
