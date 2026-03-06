# Actualización: API Templates sin Autenticación

## Cambios Realizados

### Backend
- ✅ Validador en `validator.js`: Campos `authMethod` y `authCredential` ahora son **opcionales**
- Permite crear templates para APIs públicas como la de Simpsons

### Frontend
- ✅ `TemplateForm.jsx`: Agregado checkbox "This API requires authentication"
- Los campos de auth solo se muestran si el checkbox está marcado
- `AuthBadge.jsx`: Muestra "No Auth" cuando no hay método de autenticación

## Cómo Usar

### Opción 1: Interfaz Web
1. Click en "+ New Template"
2. Completa **Name** y **API URL**
3. Deja el checkbox "This API requires authentication" **sin marcar**
4. Completa el Datasheet (YAML)
5. Click en "Create"

### Opción 2: Scripts de Prueba

#### Windows (PowerShell)
```powershell
.\create-simpsons-template.ps1
```

#### Mac/Linux (Bash)
```bash
bash create-simpsons-template.sh
```

#### Manual cURL
```bash
curl -X POST http://localhost:3000/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Simpsons API",
    "authMethod": "",
    "authCredential": "",
    "apiUri": "https://simpsons-api.vercel.app/api/characters",
    "datasheet": "endpoints:\n  - name: Get Characters\n    method: GET",
    "status": "active"
  }'
```

## Ejemplo: Simpsons API (Sin Auth)
- **Name**: Simpsons API
- **URL**: https://simpsons-api.vercel.app/api/characters
- **Auth**: Ninguno (deja sin marcar el checkbox)

Ahora puedes crear y probar APIs públicas sin necesidad de credenciales.
