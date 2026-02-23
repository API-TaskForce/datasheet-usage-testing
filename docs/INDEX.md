# 📋 Índice de Documentación - Plan de Desarrollo

## 🎯 Punto de Inicio

**Eres nuevo en el proyecto?** Comienza aquí:

1. Leer [README.md](README.md) - Introducción general
2. Leer [QUICK_START.md](QUICK_START.md) - Comandos básicos  
3. Ejecutar `npm install && npm run dev` - Start dev environment

---

## 📚 Documentación Disponible

### 🏗️ Arquitectura y Configuración

| Archivo | Contenido |
|---------|-----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitectura técnica del sistema, flujos de datos, patrones |
| [SETUP.md](SETUP.md) | Instalación, configuración, variables de entorno |
| [QUICK_START.md](QUICK_START.md) | Referencia rápida de comandos más usados |

### 📝 Plan de Implementación

| Archivo | Contenido |
|---------|-----------|
| **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** | **Plan detallado con 4 sprints, desglose de tareas** |
| **[ROADMAP.md](ROADMAP.md)** | **Timeline, checklists por tarea, DoD, métricas** |
| **[API_SPECIFICATION.md](API_SPECIFICATION.md)** | **Especificación completa de endpoints REST** |

---

## 🎬 Flujo de Trabajo Recomendado

### Para Developers

```
1. Clone proyecto → npm install
2. Leer ARCHITECTURE.md (entender flujos)
3. Leer IMPLEMENTATION_PLAN.md (saber qué construir)
4. Seguir ROADMAP.md (checklist de tareas)
5. Consultar API_SPECIFICATION.md (para endpoints)
```

### Para Product/Project Managers

```
1. Leer README.md (visión general)
2. Consultar ROADMAP.md (timeline y sprints)
3. Ver IMPLEMENTATION_PLAN.md (features)
4. Revisar QUICK_START.md (comandos para demos)
```

### Para QA/Testing

```
1. Leer API_SPECIFICATION.md (entender endpoints)
2. Consultar IMPLEMENTATION_PLAN.md (sección testing)
3. ROADMAP.md tiene "Criterios de Listo (DoD)"
4. Usar QUICK_START.md para ejecutar proyecto
```

---

## 🎯 Plan de 4 Sprints

### Sprint 1: Backend Core (3-4 días)
**Archivos**: [IMPLEMENTATION_PLAN.md → FASE 1](IMPLEMENTATION_PLAN.md#-fase-1-backend)

Tareas:
- [ ] Database schema
- [ ] Service layer
- [ ] Controller
- [ ] Routes & Validation
- [ ] Tests (100%)

---

### Sprint 2: Frontend Foundation (3-4 días)
**Archivos**: [IMPLEMENTATION_PLAN.md → FASE 2](IMPLEMENTATION_PLAN.md#-fase-2-frontend)

Tareas:
- [ ] Dependencies
- [ ] Pinia Store
- [ ] API Service
- [ ] TemplateForm
- [ ] TemplateList

---

### Sprint 3: Dashboard (2-3 días)
**Archivos**: [IMPLEMENTATION_PLAN.md → FASE 3](IMPLEMENTATION_PLAN.md#-fase-3-testing--integración)

Tareas:
- [ ] Dashboard Component
- [ ] DatasheetViewer
- [ ] UsageCharts (Pie)
- [ ] Routing
- [ ] Integration

---

### Sprint 4: Advanced (2-3 días)

Tareas:
- [ ] TestExecutor
- [ ] Logging
- [ ] E2E tests
- [ ] UI Polish

---

## 🔗 Enlaces Rápidos

### Documentación Técnica
- [API Endpoints](API_SPECIFICATION.md#-enpoints) - Especificación REST completa
- [Esquema de Datos](IMPLEMENTATION_PLAN.md#-esquema-de-datos---api-template) - Modelos
- [Validación](API_SPECIFICATION.md#-schema-validation-joi) - Joi schemas

### Guías Prácticas
- [Instalar dependencias](SETUP.md#instalación) - npm install
- [Ejecutar proyecto](QUICK_START.md#-inicio-rápido) - npm run dev
- [Testing](ROADMAP.md#-checklist-por-tarea) - npm run test

### Componentes Frontend
- [TemplateForm](IMPLEMENTATION_PLAN.md#25-componente-templateform) - Crear/Editar
- [Dashboard](IMPLEMENTATION_PLAN.md#27-componente-dashboard) - Vista principal
- [UsageCharts](IMPLEMENTATION_PLAN.md#29-componente-usagecharts) - Gráficos

### Controladores Backend
- [apiTemplatesController](IMPLEMENTATION_PLAN.md#14-controller) - CRUD handler
- [apiTemplatesService](IMPLEMENTATION_PLAN.md#13-service-layer) - Business logic

---

## 📊 Métricas de Progreso

Usa [ROADMAP.md → Checklist por Tarea](ROADMAP.md#-checklist-por-tarea) para tracking:

```
Sprint 1: [████████████████░░] 80%
Sprint 2: [████████░░░░░░░░░░] 40%
Sprint 3: [░░░░░░░░░░░░░░░░░░] 0%
Sprint 4: [░░░░░░░░░░░░░░░░░░] 0%
```

---

## 🚀 Comandos Esenciales

```bash
# Setup
npm install

# Development
npm run dev                      # Todo (backend + frontend)
npm run dev --workspace=backend  # Solo backend
npm run dev --workspace=frontend # Solo frontend

# Testing
npm run test                     # Backend tests

# Build
npm run build                    # Frontend production
npm run preview                  # Preview build local
```

Ver [QUICK_START.md](QUICK_START.md) para más comandos.

---

## ❓ FAQ - Dónde encontrar información

### "¿Cómo inicio el proyecto?"
→ [QUICK_START.md](QUICK_START.md#-inicio-rápido)

### "¿Cuál es la arquitectura?"
→ [ARCHITECTURE.md](ARCHITECTURE.md)

### "¿Qué componentes necesito hacer?"
→ [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md#-fase-2-frontend)

### "¿Cuáles son los endpoints?"
→ [API_SPECIFICATION.md](API_SPECIFICATION.md#-enpoints)

### "¿Cuál es el timeline?"
→ [ROADMAP.md → Sprint Timeline](ROADMAP.md#-sprint-timeline)

### "¿Qué database schema necesito?"
→ [IMPLEMENTATION_PLAN.md → 1.1 Modelo](IMPLEMENTATION_PLAN.md#11-modelo-y-base-de-datos)

### "¿Cómo instalar dependencias nuevas?"
→ [SETUP.md → Desarrollo](SETUP.md#desarrollo)

### "¿Cómo hacer tests?"
→ [ROADMAP.md → Sprint 1](ROADMAP.md#task-15-testing)

---

## 📌 Notas Importantes

- ✅ Todo el código debe pasar tests
- ✅ Backend 100% validado con Joi
- ✅ Frontend responsive (mobile + desktop)
- ✅ Credenciales encriptadas en BD
- ✅ CORS configurado correctamente
- ✅ Logs centralizados

---

## 🎓 Documentos por Rol

### For Backend Developer
1. [ARCHITECTURE.md](ARCHITECTURE.md) - Entender flujos
2. [IMPLEMENTATION_PLAN.md - FASE 1](IMPLEMENTATION_PLAN.md#-fase-1-backend) - Qué construir
3. [API_SPECIFICATION.md](API_SPECIFICATION.md) - Endpoints exactos
4. [ROADMAP.md - Task 1.x](ROADMAP.md#task-11-database-schema) - Checklist

### For Frontend Developer
1. [ARCHITECTURE.md](ARCHITECTURE.md) - Entender flujos
2. [IMPLEMENTATION_PLAN.md - FASE 2](IMPLEMENTATION_PLAN.md#-fase-2-frontend) - Componentes
3. [API_SPECIFICATION.md](API_SPECIFICATION.md) - API calls
4. [ROADMAP.md - Task 2.x](ROADMAP.md#task-21-dependencies) - Checklist

### For QA/Tester
1. [IMPLEMENTATION_PLAN.md - FASE 3](IMPLEMENTATION_PLAN.md#-fase-3-testing--integración) - Casos de prueba
2. [API_SPECIFICATION.md](API_SPECIFICATION.md) - Endpoints a testear
3. [ROADMAP.md - DoD](ROADMAP.md#-definiciones-de-listo-dod---definition-of-done) - Criterios
4. [QUICK_START.md](QUICK_START.md) - Cómo ejecutar

---

## 🔄 Control de Cambios

Cuando realices cambios:

1. Crea un branch: `git checkout -b feature/nombre`
2. Sigue los [criterios de DoD](ROADMAP.md#-definiciones-de-listo-dod---definition-of-done)
3. Pasa todos los tests
4. Crea un Pull Request
5. Actualiza documentación si aplica

---

**Última actualización**: Febrero 2025  
**Estado**: 🟢 En preparación para desarrollo
