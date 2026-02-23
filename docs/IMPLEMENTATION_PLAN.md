# Plan de Acción - API Template Monitor & Tester

## 📋 Visión General del Proyecto

Desarrollar una aplicación web que permite a los usuarios:
1. **Gestionar API Templates** (CRUD) con información de límites y autenticación
2. **Monitorear** graficamente la capacidad y uso de APIs
3. **Testear** endpoints de forma interactiva con el sistema existente
4. **Ver dashboards** con información relevante de cada API template

---

## 📊 Esquema de Datos - API Template

```yaml
{
  id: string (UUID)
  name: string (ej: "MailerSend API")
  authMethod: "API_TOKEN" | "BASIC_AUTH" | "BEARER" | "OAUTH2"
  authCredential: string (API key, username:password, token, etc)
  apiUri: string (ej: "https://api.mailersend.com")
  datasheet: string (YAML content)
  status: "active" | "inactive"
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Estructura del Datasheet (YAML)

```yaml
associatedSaaS: string
planReference: string
type: string
capacity:
  - value: number | ".inf"
    type: "QUOTA"
    windowType: "DAILY" | "MONTHLY" | "CUSTOM"
    description: string
maxPower:
  value: string
  type: "RATE_LIMIT"
  reference: string
segmentation:
  - string (organizacional, etc)
```

---

## 🛠️ FASE 1: BACKEND

### 1.1 Modelo y Base de Datos

**Archivo**: [backend/src/db.js](backend/src/db.js)

- [ ] Agregar tabla `apiTemplates` a la base de datos
- [ ] Estructura:
  ```javascript
  apiTemplates: [
    {
      id: "uuid",
      name: "MailerSend",
      authMethod: "API_TOKEN",
      authCredential: "encrypted_token",
      apiUri: "https://api.mailersend.com",
      datasheet: "...", // YAML content
      status: "active",
      createdAt, updatedAt
    }
  ]
  ```

### 1.2 Validación con Joi

**Archivo**: [backend/src/middlewares/validator.js](backend/src/middlewares/validator.js)

- [ ] Crear schema de validación para API Template:
  ```javascript
  {
    name: Joi.string().required().min(3).max(100),
    authMethod: Joi.string().valid('API_TOKEN', 'BASIC_AUTH', 'BEARER', 'OAUTH2'),
    authCredential: Joi.string().required(),
    apiUri: Joi.string().uri().required(),
    datasheet: Joi.string().required(),
    status: Joi.string().valid('active', 'inactive').default('active')
  }
  ```

### 1.3 Service Layer

**Archivo**: [backend/src/services/apiTemplatesService.js](backend/src/services/apiTemplatesService.js)

- [ ] Crear servicio con métodos:
  - `createTemplate(templateData)` → UUID + validate
  - `getTemplateById(id)` → fetch from DB
  - `getAllTemplates()` → list all
  - `updateTemplate(id, data)` → merge + save
  - `deleteTemplate(id)` → remove
  - `parseDatasheet(yamlContent)` → parse YAML
  - `getTemplateWithParsedDatasheet(id)` → return template + parsed datasheet

**Dependencias a instalar**:
```bash
npm install --workspace=backend yaml
npm install --workspace=backend uuid
```

### 1.4 Controller

**Archivo**: [backend/src/controllers/apiTemplatesController.js](backend/src/controllers/apiTemplatesController.js)

- [ ] Crear controller con handlers:
  - `createTemplate(req, res)` → POST
  - `getTemplate(req, res)` → GET by ID
  - `getAllTemplates(req, res)` → GET all
  - `updateTemplate(req, res)` → PUT
  - `deleteTemplate(req, res)` → DELETE
  - `getTemplateDatasheet(req, res)` → GET parsed datasheet

### 1.5 Rutas

**Archivo**: [backend/src/routes/index.js](backend/src/routes/index.js)

- [ ] Agregar rutas:
  ```
  POST   /templates           → Create
  GET    /templates           → Get all
  GET    /templates/:id       → Get one
  PUT    /templates/:id       → Update
  DELETE /templates/:id       → Delete
  GET    /templates/:id/datasheet → Get datasheet parsed
  ```

### 1.6 Tests del Backend

**Archivo**: [backend/tests/apiTemplates.test.js](backend/tests/apiTemplates.test.js)

- [ ] Testing de todos los endpoints CRUD:
  - ✅ Create template con datos válidos
  - ✅ Create template con datos inválidos (debe fallar)
  - ✅ Get template by ID
  - ✅ Get all templates
  - ✅ Update template (partial update)
  - ✅ Delete template
  - ✅ Parse YAML datasheet correctamente
  - ✅ Error handling (template no encontrado, etc)

---

## 🎨 FASE 2: FRONTEND

### 2.1 Estructura de Componentes

```
src/
├── components/
│   ├── TemplateForm.vue          # Crear/Editar template
│   ├── TemplateList.vue          # Listar templates
│   ├── Dashboard.vue             # Dashboard principal
│   ├── DatasheetViewer.vue       # Ver datasheet formateado
│   ├── UsageCharts.vue           # Gráficos pie (capacidad/uso)
│   └── TestExecutor.vue          # Ejecutar tests
├── services/
│   └── apiTemplateService.js     # API calls
├── views/
│   ├── TemplatesPage.vue         # Página de gestión
│   └── DashboardPage.vue         # Página dashboard
└── App.vue
```

### 2.2 Instalación de Dependencias

- [ ] Vue 3 Utilities:
  ```bash
  npm install --workspace=frontend chart.js vue-chartjs
  npm install --workspace=frontend pinia
  npm install --workspace=frontend yaml
  ```

### 2.3 Store (Pinia)

**Archivo**: [frontend/src/stores/templateStore.js](frontend/src/stores/templateStore.js)

- [ ] Crear store con estado:
  - `templates[]` - lista de templates
  - `activeTemplate` - template actual
  - `loading` - estado carga
  - `error` - manejo errores

- [ ] Acciones:
  - `fetchTemplates()`
  - `fetchTemplateById(id)`
  - `createTemplate(data)`
  - `updateTemplate(id, data)`
  - `deleteTemplate(id)`
  - `setActiveTemplate(id)`

### 2.4 API Service

**Archivo**: [frontend/src/services/apiTemplateService.js](frontend/src/services/apiTemplateService.js)

- [ ] Crear cliente HTTP:
  ```javascript
  - GET /api/templates
  - POST /api/templates
  - GET /api/templates/:id
  - PUT /api/templates/:id
  - DELETE /api/templates/:id
  - GET /api/templates/:id/datasheet
  ```

### 2.5 Componente: TemplateForm

**Archivo**: [frontend/src/components/TemplateForm.vue](frontend/src/components/TemplateForm.vue)

- [ ] Formulario para crear/editar templates
- [ ] Campos:
  - Input: name
  - Select: authMethod
  - Input: authCredential (password field)
  - Input: apiUri
  - Textarea: datasheet (YAML)
- [ ] Validaciones frontend
- [ ] Buttons: Save, Cancel

### 2.6 Componente: TemplateList

**Archivo**: [frontend/src/components/TemplateList.vue](frontend/src/components/TemplateList.vue)

- [ ] Lista de templates en tabla o cards
- [ ] Columns: Name, Auth Method, URI, Status
- [ ] Acciones: View, Edit, Delete, Set Active
- [ ] Search/Filter por nombre

### 2.7 Componente: Dashboard

**Archivo**: [frontend/src/components/Dashboard.vue](frontend/src/components/Dashboard.vue)

- [ ] Mostrar template activo seleccionado
- [ ] Layout: Header + Tabs (Overview, Datasheet, Test)
- [ ] Información principal:
  - Nombre, URI, Auth Method
  - Status badge
- [ ] Botones: Edit, Run Test, Delete

### 2.8 Componente: DatasheetViewer

**Archivo**: [frontend/src/components/DatasheetViewer.vue](frontend/src/components/DatasheetViewer.vue)

- [ ] Parsear y mostrar YAML de forma legible
- [ ] Secciones organizadas:
  ```
  Associated SaaS: ...
  Plan Reference: ...
  Type: ...
  
  ▶ Capacity Limits
    - value: XX
    - type: QUOTA
    - window: MONTHLY
    
  ▶ Max Power (Rate Limits)
    - value: 60 req/min
    - reference: ...
    
  ▶ Segmentation
    - Organization Level: ...
  ```
- [ ] Diseño: Cards expandibles o timeline

### 2.9 Componente: UsageCharts

**Archivo**: [frontend/src/components/UsageCharts.vue](frontend/src/components/UsageCharts.vue)

- [ ] Dos gráficos Pie Chart:
  1. **Capacidad Quota**: % usado vs disponible
  2. **Rate Limits**: Requests/min actuales vs límite
- [ ] Datos simulados (después integrables):
  ```javascript
  {
    quotaUsed: 500,
    quotaTotal: 1000,
    rateCurrent: 45,
    rateLimit: 60
  }
  ```
- [ ] Colores: Verde (bajo), Amarillo (medio), Rojo (alto)

### 2.10 Componente: TestExecutor

**Archivo**: [frontend/src/components/TestExecutor.vue](frontend/src/components/TestExecutor.vue)

- [ ] Formulario para ejecutar test:
  - Select: Método HTTP (GET, POST, PUT, etc)
  - Input: Endpoint path (relativo a apiUri)
  - Textarea: Body (JSON)
  - Input: Headers (JSON)
- [ ] Ejecutar y mostrar resultados
- [ ] Logs de request/response

### 2.11 Rutas

**Archivo**: [frontend/src/router.js](frontend/src/router.js) (crear si no existe)

- [ ] Rutas Vue Router (si se desea):
  - `/` → Dashboard (template activo)
  - `/templates` → Gestión de templates
  - `/templates/:id` → Detalle + Dashboard

### 2.12 Styling

- [ ] Tailwind CSS o similar:
  ```bash
  npm install --workspace=frontend -D tailwindcss postcss autoprefixer
  ```
- [ ] Componentes styled: Cards, Buttons, Forms
- [ ] Responsive design

---

## ✅ FASE 3: TESTING & INTEGRACIÓN

### 3.1 Tests Backend

- [ ] Ejecutar tests:
  ```bash
  npm run test
  ```
- [ ] Validar todos los endpoints CRUD

### 3.2 Manual Testing

- [ ] Crear template completocon YAML válido
- [ ] Editar template
- [ ] Listar templates
- [ ] Eliminar template
- [ ] Dashboard carga correctamente

### 3.3 Pruebas E2E (Opcional)

- [ ] Cypress o Playwright para flujos completos

---

## 🚀 Orden de Implementación Recomendado

### Sprint 1: Backend Core
1. ✅ Modelo DB (db.js)
2. ✅ Service layer (apiTemplatesService.js)
3. ✅ Controller (apiTemplatesController.js)
4. ✅ Rutas (routes)
5. ✅ Tests (100% cobertura CRUD)

### Sprint 2: Frontend Estructura  
1. ✅ Install dependencies
2. ✅ Create Store (Pinia)
3. ✅ Create API Service
4. ✅ TemplateForm component
5. ✅ TemplateList component

### Sprint 3: Dashboard & Visualización
1. ✅ Dashboard component
2. ✅ DatasheetViewer component
3. ✅ UsageCharts component (Pie charts)
4. ✅ Integración de componentes

### Sprint 4: Funcionalidades Avanzadas
1. ✅ TestExecutor component
2. ✅ Logs y resultados
3. ✅ E2E tests
4. ✅ Polish UI

---

## 📌 Notas Importantes

- **Encriptación**: Las credenciales de API deben guardarse encriptadas en BD (usar `crypto`)
- **YAML Parsing**: Usar librería `yaml` para parsear datasheets
- **UUID**: Usar `uuid` para generar IDs únicos
- **Validación**: Backend valida con Joi, frontend con vee-validate
- **Error Handling**: Mensajes claros al usuario
- **Estado**: Usar Pinia para gestión centralizada

---

## 🛠️ Dependencias a Instalar

**Backend**:
```bash
npm install --workspace=backend yaml uuid
npm install --workspace=backend --save-dev
```

**Frontend**:
```bash
npm install --workspace=frontend pinia chart.js vue-chartjs yaml
npm install --workspace=frontend -D tailwindcss postcss autoprefixer vee-validate
```

---

Documento completado. ¿Comenzamos con **Sprint 1: Backend Core**?
