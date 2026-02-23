# 🚀 Datasheet Usage Testing - API Monitor & Tester

> *Aplicación web para monitorear, gestionar y testear límites de rate en APIs externas*

## 📖 Descripción

Este proyecto es una **plataforma integral** que permite a los usuarios:

✅ **Gestionar API Templates** - Crear, editar y almacenar configuración de APIs  
✅ **Monitorear Límites** - Visualizar cuotas y límites de rate con gráficos  
✅ **Testear Endpoints** - Ejecutar requests contra APIs y analizar respuestas  
✅ **Ver Datasheets** - Documentación formateada de cada API  

---

## 🏗️ Estructura del Proyecto

Este es un **monorepo** con arquitectura completa frontend + backend:

```
datasheet-usage-testing/
├── backend/                    # API REST (Node.js + Express)
├── frontend/                   # SPA (Vue 3 + Vite)
├── IMPLEMENTATION_PLAN.md      # Plan detallado de desarrollo
├── API_SPECIFICATION.md        # Especificación de endpoints
├── ROADMAP.md                  # Timeline y checklists
└── package.json                # Configuración de monorepo
```

---

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Ejecutar desarrollo (Backend + Frontend)
```bash
npm run dev
```

Acceso:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

---

## 📚 Documentación Completa

| Documento | Descripción |
|-----------|------------|
| [QUICK_START.md](QUICK_START.md) | Referencia rápida de comandos |
| [SETUP.md](SETUP.md) | Instalación y configuración detallada |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitectura técnica del sistema |
| **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** | **Plan detallado con sprints y tareas** |
| **[API_SPECIFICATION.md](API_SPECIFICATION.md)** | **Especificación completa de endpoints REST** |
| **[ROADMAP.md](ROADMAP.md)** | **Timeline, checklists y métricas** |

---

## 🎯 Características Principales

### Backend API
- ✅ CRUD de API Templates
- ✅ Validación con Joi
- ✅ YAML datasheet parsing
- ✅ Encriptación de credenciales
- ✅ Tests con Jest (100% coverage)

### Frontend Web
- 📋 Formulario de templates
- 📊 Dashboard con gráficos
- 📈 Pie charts de cuota y rate limits
- 📄 Visor de YAML formateado
- ⚙️ Test executor de endpoints

---

## 🧪 Testing

### Tests Backend
```bash
npm run test                      # Ejecutar todos los tests
npm run test -- --coverage      # Con cobertura
```

---

## 🎓 Plan de Implementación

Duración total: **2-3 semanas**

**[Ver IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** para plan detallado con 4 sprints

---

## 📖 Más Información

Consulta la documentación completa en los archivos MD del proyecto.

- Persistir en DB real (SQLite / Postgres) para análisis a largo plazo
- Añadir autenticación y control de acceso
- Implementar colas y workers distribuidos (Bull, Redis)
- Añadir métricas y dashboard (Grafana / Prometheus)
