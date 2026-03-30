# Guia de Continuidad del Proyecto

Esta carpeta contiene una guia corta para el equipo que continuara el desarrollo.

## Archivos

- [00-introduccion.md](00-introduccion.md): **empieza aquí** — qué es el proyecto, conceptos clave y flujo de uso.
- [01-backend.md](01-backend.md): como funciona el backend y donde hacer cambios.
- [02-frontend.md](02-frontend.md): como funciona el frontend y flujo de UI.
- [03-handoff-operacion.md](03-handoff-operacion.md): runbook de continuidad, riesgos y checklist.
- [04-endpoints-backend-ejemplos.md](04-endpoints-backend-ejemplos.md): ejemplos de llamadas para cada endpoint.

## Stack real actual

- Monorepo con npm workspaces.
- Backend: Node.js + Express.
- Frontend: React + Vite.

Nota: algunos documentos historicos mencionan Vue. El estado real actual del codigo es React.

## Inicio rapido

Desde la raiz del repo:

```bash
npm install
npm run dev
```

Servicios por defecto:

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
