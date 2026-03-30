# Introducción al proyecto

## ¿Qué es esto?

**Datasheet Usage Testing** es una plataforma interna para probar, simular y analizar el comportamiento de APIs frente a límites de tasa (*rate limits*) y cuotas de uso.

Su objetivo principal es permitir al equipo entender cómo se comportará una API real bajo carga antes de integrarla en producción: cuántas peticiones por ventana admite, cómo detectar el cooldown tras exceder el límite, y cómo varía el comportamiento según la distribución del tráfico.

---

## Conceptos clave

| Concepto | Descripción |
|---|---|
| **Template** | Ficha de una API: URL, método, headers, auth, y configuración de rate limit esperada. |
| **Dummy API** | API simulada localmente. No hace llamadas reales; el comportamiento lo controla el propio panel. |
| **Colección** | Agrupación lógica de templates (por proyecto, cliente, entorno, etc.). |
| **Test config** | Configuración reutilizable de una prueba (requests, concurrencia, retraso entre peticiones). |
| **Log de prueba** | Registro persistido de resultados de una prueba real o simulada. |
| **Dashboard** | Vista por template con gráficas de tráfico, capacidad y estado en tiempo real. |

---

## Flujo de uso típico

```
Crear template → (opcionalmente agrupar en colección)
       ↓
Abrir Dashboard del template
       ↓
Ejecutar escenario de showcase (simulación instantánea)
  o configurar y lanzar prueba real/dummy
       ↓
Analizar gráficas de tráfico y capacidad
       ↓
Revisar logs de prueba para historial
```

---

## Estado actual del proyecto

- **Modo simulación activo**: `SIMULATION_ONLY_MODE = true`. El dashboard ejecuta las pruebas en modo simulado por defecto. Las pruebas reales contra APIs externas están disponibles en el backend pero desactivadas en la UI.
- **Persistencia local**: el historial del dashboard se almacena en `localStorage` del navegador (no en el servidor).
- **Backend funcional**: gestiona templates, colecciones, logs y configuraciones sobre archivos JSON.

---

## Estructura del repositorio

```
datasheet-usage-testing/
├── backend/        API REST (Node.js + Express)
├── frontend/       Aplicación web (React + Vite)
├── docs/           Documentación técnica detallada
├── guide/          Guía de continuidad del proyecto (este directorio)
└── package.json    Monorepo (npm workspaces)
```

---

## Lectura recomendada

1. [01-backend.md](01-backend.md) — arquitectura y lógica del servidor
2. [02-frontend.md](02-frontend.md) — funcionalidades de la UI
3. [03-handoff-operacion.md](03-handoff-operacion.md) — runbook operativo y checklist
4. [04-endpoints-backend-ejemplos.md](04-endpoints-backend-ejemplos.md) — ejemplos curl de cada endpoint
