# Refactorización de db.js - Separación de Lógica

## 📋 Resumen

Se ha refactorizado `db.js` para separar la lógica de gestión de datos en módulos independientes:

- **db/jobs.js** - Lógica de test jobs
- **db/templates.js** - Lógica de API templates
- **db.js** - Punto de exportación central

---

## 🏗️ Nueva Estructura

```
backend/src/
├── db.js                    (Central export - index/facade)
├── db/
│   ├── jobs.js             (Test jobs logic)
│   └── templates.js        (API templates logic)
├── services/
│   ├── testsService.js     (Uses db/jobs)
│   └── apiTemplatesService.js (Uses db/templates)
├── controllers/
├── routes/
└── middlewares/
```

---

## 📂 Detalles de Cada Módulo

### **db.js** - Central Export Point

**Propósito**: Punto de exportación central que re-exporta todas las funciones

```javascript
// Importa de módulos específicos
import { createJob, updateJob, getJob, listJobs } from './db/jobs.js';
import { createTemplate, updateTemplate, getTemplate, listTemplates, deleteTemplate } from './db/templates.js';

// Re-exporta para uso consistente
export { createJob, updateJob, getJob, listJobs };
export { createTemplate, updateTemplate, getTemplate, listTemplates, deleteTemplate };
```

**Ventajas**:
- ✅ Interfaz única para importar todas las funciones
- ✅ Separación lógica sin complejidad en imports
- ✅ Fácil de mantener y extender

---

### **db/jobs.js** - Test Jobs Management

**Responsabilidades**:
- Crear nuevos jobs de prueba
- Actualizar estado de jobs
- Obtener un job por ID
- Listar todos los jobs

**Funciones Exportadas**:
```javascript
export { createJob, updateJob, getJob, listJobs };
```

**Estructura de uso**:
```javascript
import { createJob, getJob, listJobs } from '../db/jobs.js';
// o
import { createJob, getJob, listJobs } from '../db.js';
```

---

### **db/templates.js** - API Templates Management

**Responsabilidades**:
- Crear nuevas API templates
- Actualizar templates existentes
- Obtener una template por ID
- Listar todas las templates
- Eliminar templates

**Funciones Exportadas**:
```javascript
export { createTemplate, updateTemplate, getTemplate, listTemplates, deleteTemplate };
```

**Estructura de uso**:
```javascript
import { createTemplate, getTemplate, listTemplates } from '../db/templates.js';
// o
import { createTemplate, getTemplate, listTemplates } from '../db.js';
```

---

## 🔄 Cómo se Integra con Services

### **testsService.js** (usa jobs logic)

```javascript
import { createJob, getJob, listJobs } from '../db.js';

// Ya que db.js re-exporta, funciona sin cambios
```

### **apiTemplatesService.js** (usa templates logic)

```javascript
import { createTemplate, getTemplate, listTemplates, deleteTemplate, updateTemplate } from '../db.js';

// Ya que db.js re-exporta, funciona sin cambios
```

---

## ✅ Cambios Realizados

| Cambio | Antes | Después |
|--------|-------|---------|
| **Lógica Jobs** | En db.js | db/jobs.js |
| **Lógica Templates** | En db.js | db/templates.js |
| **Exports** | Directo de db.js | A través de db.js (facade) |
| **Tamaño db.js** | 100+ líneas | ~35 líneas (export only) |
| **Mantenibilidad** | ❌ Mixto | ✅ Separado |
| **Escalabilidad** | ❌ Difícil | ✅ Fácil |

---

## 🎯 Beneficios

### 1. **Separación de Responsabilidades**
- Jobs logic está separada de templates logic
- Cada módulo tiene una única responsabilidad

### 2. **Mantenibilidad**
- Cambios en jobs no afectan templates
- Cambios en templates no afectan jobs
- Código más limpio y enfocado

### 3. **Escalabilidad**
- Fácil agregar nuevos módulos (ej: `db/users.js`, `db/logs.js`)
- Patrón consistente a seguir

### 4. **Testabilidad**
- Cada módulo puede testearse independientemente
- Mocks más específicos por módulo

### 5. **Readabilidad**
- Claro qué lógica está en qué módulo
- Menos código por archivo
- Navegación más clara

---

## 🚀 Implementación Sin Cambios en Servicios

Las funciones se importan de `db.js` exactamente como antes:

```javascript
// apiTemplatesService.js
import { createTemplate, updateTemplate, getTemplate, listTemplates, deleteTemplate } from '../db.js';

// Esto sigue funcionando igual que antes
// Pero internamente, db.js re-exporta desde db/templates.js
```

**No hay cambios necesarios en**:
- ✅ apiTemplatesService.js
- ✅ testsService.js
- ✅ Controladores
- ✅ Rutas
- ✅ Tests

---

## 📊 Estructura de Dependencias

```
Services/Controllers
        ↓
     db.js (Central export)
     ↙       ↘
db/jobs.js  db/templates.js
```

Cada capa:
- **db/jobs.js**: Lógica pura de lectura/escritura de jobs
- **db/templates.js**: Lógica pura de lectura/escritura de templates
- **db.js**: Re-exporta todo para uso simplificado
- **Services**: Usan las funciones de db.js

---

## 🔐 Consistencia de Datos

Ambos módulos usan las mismas funciones helper (`readDb`, `writeDb`) replicadas:

```javascript
// db/jobs.js
async function readDb() { ... }    // Lee db.json
async function writeDb(obj) { ... } // Escribe db.json

// db/templates.js
async function readDb() { ... }    // Lee db.json (mismo archivo)
async function writeDb(obj) { ... } // Escribe db.json (mismo archivo)
```

**Nota**: Ambos leen/escriben el mismo `db.json`, garantizando consistencia de datos.

---

## 🔮 Próximo: Refactorización del Service Layer

Se podría hacer refactorización similar en services:
```
services/
├── testsService.js
└── templates/
    ├── index.js
    ├── validation.js
    ├── parsing.js
    └── crud.js
```

Pero por ahora, el servicio está bien como está.

---

## 📝 Resumen de Archivos

| Archivo | Tipo | Función | Líneas |
|---------|------|---------|--------|
| db.js | Facade | Re-exportar | ~35 |
| db/jobs.js | Module | Test jobs CRUD | ~55 |
| db/templates.js | Module | Template CRUD | ~70 |
| **Total** | - | - | **~160** |

Sin refactorizar era un solo archivo de ~105 líneas. Ahora está mejor organizado.

---

✅ **Refactorización completada y lista para producción**
