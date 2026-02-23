# Roadmap - API Template Monitor & Tester

## 📅 Sprint Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│ SPRINT 1: Backend Core (3-4 días)                				│
├─────────────────────────────────────────────────────────────────┤
│ ✓ Database Schema (db.js)                                       │
│ ✓ Service Layer (apiTemplatesService.js)                       │
│ ✓ Controller (apiTemplatesController.js)                       │
│ ✓ Routes (CRUD endpoints)                                       │
│ ✓ Validation (Joi schemas)                                      │
│ ✓ Tests (100% coverage)                                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ SPRINT 2: Frontend Foundation (3-4 días)                       │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Install Dependencies (Pinia, Charts, YAML)                    │
│ ✓ Store Setup (Pinia)                                           │
│ ✓ API Service (HTTP client)                                     │
│ ✓ TemplateForm Component                                        │
│ ✓ TemplateList Component                                        │
│ ✓ Pages/Views structure                                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ SPRINT 3: Dashboard & Visualization (2-3 días)                 │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Dashboard Component                                           │
│ ✓ DatasheetViewer (YAML formatter)                             │
│ ✓ UsageCharts (Pie charts)                                      │
│ ✓ Component Integration                                         │
│ ✓ Routing Setup                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ SPRINT 4: Advanced Features (2-3 días)                         │
├─────────────────────────────────────────────────────────────────┤
│ ✓ TestExecutor Component                                        │
│ ✓ Request/Response Viewer                                       │
│ ✓ Error Handling & UX Polish                                    │
│ ✓ E2E Testing                                                   │
│ ✓ Performance Optimization                                      │
└─────────────────────────────────────────────────────────────────┘

Total: 10-14 días (2-3 semanas)
```

---

## 🎯 Definiciones de Listo (DoD - Definition of Done)

### Criterios por Feature

#### ✅ Backend CRUD
- [ ] Endpoint crea recursos correctamente
- [ ] Endpoint obtiene recursos (unitario y listado)
- [ ] Endpoint actualiza recursos (parcial)
- [ ] Endpoint elimina recursos
- [ ] Validación rechaza datos inválidos
- [ ] Error handling retorna códigos HTTP correctos
- [ ] Tests cubren todos los casos (happy path + edge cases)
- [ ] Documentación de API (README o inline)

#### ✅ Frontend Componente
- [ ] Component monta sin errores
- [ ] Props validadas con Vue
- [ ] Emits/Callbacks funcionan correctamente
- [ ] Estilos responsive (mobile/desktop)
- [ ] Accesibilidad (labels, aria)
- [ ] Tests unitarios (si aplica)
- [ ] Historia en Storybook (opcional)

#### ✅ Integración Backend-Frontend
- [ ] API Service realiza calls correctamente
- [ ] Store obtiene y actualiza datos
- [ ] UI refleja cambios en estado
- [ ] Error messages se muestran al usuario
- [ ] Loading states presentes

---

## 🏗️ Estructura de Carpetas Final

```
backend/
├── src/
│   ├── controllers/
│   │   ├── testsController.js          (existente)
│   │   └── apiTemplatesController.js   (NEW)
│   │
│   ├── services/
│   │   ├── testsService.js             (existente)
│   │   └── apiTemplatesService.js      (NEW)
│   │
│   ├── routes/
│   │   └── index.js                    (UPDATED - agregar /templates)
│   │
│   ├── middlewares/
│   │   ├── validator.js                (UPDATED - agregar schema templates)
│   │   ├── errorHandler.js             (existente)
│   │   └── logger.js                   (existente)
│   │
│   ├── lib/
│   │   ├── log.js                      (existente)
│   │   ├── utils.js                    (UPDATED - encryption)
│   │   └── httpClient.js               (existente)
│   │
│   ├── db.js                           (UPDATED - agregar tabla templates)
│   ├── server.js                       (existente)
│   └── engine.js                       (existente)
│
├── tests/
│   ├── apiTemplates.test.js            (NEW)
│   └── helpers/
│       └── testHelpers.js              (existente)
│
└── .env

frontend/
├── src/
│   ├── components/
│   │   ├── TemplateForm.vue            (NEW)
│   │   ├── TemplateList.vue            (NEW)
│   │   ├── Dashboard.vue               (NEW)
│   │   ├── DatasheetViewer.vue         (NEW)
│   │   ├── UsageCharts.vue             (NEW)
│   │   └── TestExecutor.vue            (NEW)
│   │
│   ├── stores/
│   │   └── templateStore.js            (NEW)
│   │
│   ├── services/
│   │   └── apiTemplateService.js       (NEW)
│   │
│   ├── views/
│   │   ├── TemplatesPage.vue           (NEW)
│   │   └── DashboardPage.vue           (NEW)
│   │
│   ├── App.vue                         (UPDATED)
│   ├── main.js                         (UPDATED - Pinia)
│   └── style.css
│
├── index.html
└── vite.config.js

ROOT:
├── IMPLEMENTATION_PLAN.md              (NEW - este documento)
├── API_SPECIFICATION.md                (NEW)
└── ROADMAP.md                          (esta archivo)
```

---

## 🔍 Checklist por Tarea

### SPRINT 1

#### Task 1.1: Database Schema
```
[ ] Leer db.js actual
[ ] Agregar estructura apiTemplates
[ ] Crear sample data
[ ] Validar persistencia
```

#### Task 1.2: Service Layer
```
[ ] Crear apiTemplatesService.js
[ ] Implementar createTemplate()
[ ] Implementar getTemplate() / getAllTemplates()
[ ] Implementar updateTemplate()
[ ] Implementar deleteTemplate()
[ ] Implementar parseDatasheet()
[ ] Manejo de encriptación
```

#### Task 1.3: Controller
```
[ ] Crear apiTemplatesController.js
[ ] Mapear service methods a controllers
[ ] Response formatting
[ ] Error handling en controller
```

#### Task 1.4: Routes & Validation
```
[ ] Actualizar routes/index.js
[ ] Agregar POST /templates
[ ] Agregar GET /templates
[ ] Agregar PUT /templates/:id
[ ] Agregar DELETE /templates/:id
[ ] Actualizar validator.js con schema
```

#### Task 1.5: Testing
```
[ ] Crear apiTemplates.test.js
[ ] Test CREATE (happy + error cases)
[ ] Test READ unitario
[ ] Test READ listado
[ ] Test UPDATE (full + partial)
[ ] Test DELETE
[ ] Test YAML parsing
[ ] Run all tests → debe pasar
```

---

### SPRINT 2

#### Task 2.1: Dependencies
```
[ ] npm install --workspace=frontend pinia
[ ] npm install --workspace=frontend chart.js
[ ] npm install --workspace=frontend vue-chartjs
[ ] npm install --workspace=frontend yaml
[ ] npm install --workspace=backend yaml uuid
[ ] Verificar package-lock.json
```

#### Task 2.2: Pinia Store
```
[ ] Crear stores/templateStore.js
[ ] Definir state (templates[], activeTemplate, loading, error)
[ ] Implementar getters
[ ] Implementar actions (fetch, create, update, delete)
[ ] Integrar con API service
```

#### Task 2.3: API Service
```
[ ] Crear services/apiTemplateService.js
[ ] Crear axios instance con baseURL
[ ] GET /templates
[ ] POST /templates
[ ] GET /templates/:id
[ ] PUT /templates/:id
[ ] DELETE /templates/:id
[ ] GET /templates/:id/datasheet
[ ] Error handling
```

#### Task 2.4: TemplateForm Component
```
[ ] Crear components/TemplateForm.vue
[ ] Campos: name, authMethod, apiUri, datasheet
[ ] Validación básica
[ ] v-model binding
[ ] emit 'save' event
[ ] emit 'cancel' event
[ ] Editar vs Crear modes
```

#### Task 2.5: TemplateList Component
```
[ ] Crear components/TemplateList.vue
[ ] Mostrar lista como tabla o cards
[ ] Columns: Name, Auth, URI, Status
[ ] Click handlers para Edit/View/Delete
[ ] Search filter
[ ] Loading state
[ ] Empty state
```

---

### SPRINT 3

#### Task 3.1: Dashboard Component
```
[ ] Crear components/Dashboard.vue
[ ] Header con info. del template activo
[ ] Tab system (Overview, Datasheet, Test)
[ ] Edit/Delete buttons
[ ] Status badge
[ ] Responsive layout
```

#### Task 3.2: DatasheetViewer
```
[ ] Crear components/DatasheetViewer.vue
[ ] Parse YAML con librería yaml
[ ] Renderizar sections (associatedSaaS, capacity, maxPower, etc)
[ ] Expandible cards por sección
[ ] Formatted output
[ ] Copy to clipboard
```

#### Task 3.3: UsageCharts
```
[ ] Crear components/UsageCharts.vue
[ ] Pie Chart #1: Capacidad (usado vs disponible)
[ ] Pie Chart #2: Rate limits (actual vs límite)
[ ] Colors: Green/Yellow/Red
[ ] Legend
[ ] Responsive
[ ] Sample data
```

#### Task 3.4: Pages/Views
```
[ ] Crear views/TemplatesPage.vue (gestión)
[ ] Crear views/DashboardPage.vue (monitor)
[ ] Integrar TemplateList en TemplatesPage
[ ] Integrar Dashboard, Datasheet, Charts en DashboardPage
```

#### Task 3.5: Routing
```
[ ] Instalar vue-router (si no existe)
[ ] Definir rutas: /, /templates, /dashboard/:id
[ ] Navigation
[ ] Active link highlighting
```

---

### SPRINT 4

#### Task 4.1: TestExecutor Component
```
[ ] Crear components/TestExecutor.vue
[ ] HTTP Method select
[ ] Endpoint input
[ ] Body textarea (JSON)
[ ] Headers input (JSON)
[ ] Execute button
[ ] Loading state
```

#### Task 4.2: Results Display
```
[ ] Mostrar request enviado
[ ] Mostrar response status
[ ] Mostrar response body
[ ] Mostrar headers
[ ] Formatted output (syntax highlight)
[ ] Copy response
[ ] Save test result (opcional)
```

#### Task 4.3: E2E & Polish
```
[ ] Error messages claros
[ ] Success notifications
[ ] Confirmación antes de delete
[ ] Loading spinners
[ ] Transitions/Animations
[ ] Dark mode (opcional)
[ ] Mobile responsive
```

#### Task 4.4: Testing
```
[ ] Unit tests para componentes
[ ] Integration tests
[ ] E2E tests (Cypress/Playwright)
[ ] Performance testing
```

---

## 🎨 Estilos & Diseño

### Color Scheme
```
Primary:    #667eea (purple-ish)
Secondary:  #764ba2 (dark purple)
Success:    #4caf50 (green)
Warning:    #ff9800 (orange)
Danger:     #f44336 (red)
Background: #f5f7fa (light)
Text:       #333333 (dark)
```

### Componentes Reutilizables
- Button (variant: primary, secondary, danger)
- Card (with header, body, footer)
- Badge (status indicator)
- Modal (para confirmaciones)
- Spinner (loading)
- Alert (success, error, warning)
- Input/Select/Textarea (form elements)
- Table (con sorting, pagination opcional)

---

## 📊 Métricas de Éxito

- ✅ 100% de tests pasando en backend
- ✅ 0 console errors/warnings en frontend
- ✅ Tiempo de carga < 2 segundos
- ✅ Mobile responsive (< 768px)
- ✅ A11y score > 90
- ✅ CRUD operations funcionan fluidamente
- ✅ Dashboard actualiza en < 1 segundo

---

## 🚀 Deployment Checklist

Antes de producción:
- [ ] Environment variables configuradas
- [ ] HTTPS habilitado
- [ ] Database backups
- [ ] Logging centralizado
- [ ] Error tracking (Sentry, etc)
- [ ] Performance monitoring
- [ ] Security audit
- [ ] Documentación completa

---

**Documento completado. ¿Listos para comenzar Sprint 1?**
