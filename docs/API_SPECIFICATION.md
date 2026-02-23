# Especificación de API REST - API Templates

## Base URL
```
http://localhost:3000/templates
```

---

## 📌 Enpoints

### 1. CREATE Template
**Endpoint**: `POST /templates`

**Request**:
```json
{
  "name": "MailerSend API",
  "authMethod": "API_TOKEN",
  "authCredential": "sk_live_xxxxxxxxxxxxx",
  "apiUri": "https://api.mailersend.com/v1",
  "datasheet": "associatedSaaS: MailerSend\nplanReference: ENTERPRISE\ntype: Partial SaaS\ncapacity:\n  - value: .inf\n    type: QUOTA\n    windowType: CUSTOM\n    description: Volume negotiated via SLA",
  "status": "active"
}
```

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "MailerSend API",
  "authMethod": "API_TOKEN",
  "authCredential": "sk_live_xxxxxxxxxxxxx",
  "apiUri": "https://api.mailersend.com/v1",
  "datasheet": "...",
  "status": "active",
  "createdAt": "2025-02-23T12:00:00Z",
  "updatedAt": "2025-02-23T12:00:00Z"
}
```

**Error** (400 Bad Request):
```json
{
  "error": "Validation failed",
  "details": {
    "name": "name is required and must be at least 3 characters"
  }
}
```

---

### 2. GET All Templates
**Endpoint**: `GET /templates`

**Query Parameters**:
- `status`: "active" | "inactive" (opcional)
- `search`: search term (opcional)

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "MailerSend API",
      "authMethod": "API_TOKEN",
      "apiUri": "https://api.mailersend.com/v1",
      "status": "active",
      "createdAt": "2025-02-23T12:00:00Z"
    },
    {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "name": "Amadeus API",
      "authMethod": "BEARER",
      "apiUri": "https://api.amadeus.com/v2",
      "status": "active",
      "createdAt": "2025-02-23T13:00:00Z"
    }
  ],
  "totalCount": 2
}
```

---

### 3. GET Single Template
**Endpoint**: `GET /templates/:id`

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "MailerSend API",
  "authMethod": "API_TOKEN",
  "authCredential": "sk_live_xxxxxxxxxxxxx",
  "apiUri": "https://api.mailersend.com/v1",
  "datasheet": "...",
  "status": "active",
  "createdAt": "2025-02-23T12:00:00Z",
  "updatedAt": "2025-02-23T12:00:00Z"
}
```

**Error** (404 Not Found):
```json
{
  "error": "Template not found"
}
```

---

### 4. UPDATE Template
**Endpoint**: `PUT /templates/:id`

**Request** (partial update):
```json
{
  "name": "MailerSend API v2",
  "status": "inactive"
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "MailerSend API v2",
  "authMethod": "API_TOKEN",
  "authCredential": "sk_live_xxxxxxxxxxxxx",
  "apiUri": "https://api.mailersend.com/v1",
  "datasheet": "...",
  "status": "inactive",
  "createdAt": "2025-02-23T12:00:00Z",
  "updatedAt": "2025-02-23T14:30:00Z"
}
```

---

### 5. DELETE Template
**Endpoint**: `DELETE /templates/:id`

**Response** (204 No Content):
```
[empty body]
```

**Error** (404 Not Found):
```json
{
  "error": "Template not found"
}
```

---

### 6. GET Datasheet (Parsed)
**Endpoint**: `GET /templates/:id/datasheet`

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "datasheet": {
    "associatedSaaS": "MailerSend",
    "planReference": "ENTERPRISE",
    "type": "Partial SaaS",
    "capacity": [
      {
        "value": ".inf",
        "type": "QUOTA",
        "windowType": "CUSTOM",
        "description": "Volume and overage negotiated via SLA"
      }
    ],
    "maxPower": {
      "value": "60 requests per minute",
      "type": "RATE_LIMIT",
      "reference": "Dedicated infrastructure scaling"
    },
    "segmentation": [
      "Organization Level: Limits can be distributed across sub-accounts."
    ]
  }
}
```

**Error** (400 Bad Request - Invalid YAML):
```json
{
  "error": "Invalid YAML format",
  "details": "Line 5: Invalid indentation"
}
```

---

## 🔐 Autenticación

Tipos soportados:

| Tipo | Ejemplo | Formato |
|------|---------|---------|
| `API_TOKEN` | MailerSend, Spoonacular | `sk_live_xxxxx` |
| `BASIC_AUTH` | BitBucket | `user:password` base64 |
| `BEARER` | Amadeus, Vimeo | `Bearer token_xxxxx` |
| `OAUTH2` | - | Token + Refresh token |

Almacenamiento: Las credenciales se guardan **encriptadas** con `crypto` en la BD.

---

## 📝 Schema Validation (Joi)

```javascript
const templateSchema = {
  name: Joi.string()
    .required()
    .min(3)
    .max(100)
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 3 characters'
    }),
  
  authMethod: Joi.string()
    .required()
    .valid('API_TOKEN', 'BASIC_AUTH', 'BEARER', 'OAUTH2'),
  
  authCredential: Joi.string()
    .required()
    .messages({
      'string.empty': 'Auth credential is required'
    }),
  
  apiUri: Joi.string()
    .required()
    .uri()
    .messages({
      'string.uri': 'Auth URI must be a valid URL'
    }),
  
  datasheet: Joi.string()
    .required()
    .min(10)
    .messages({
      'string.empty': 'Datasheet content is required'
    }),
  
  status: Joi.string()
    .valid('active', 'inactive')
    .default('active')
};
```

---

## 🚨 Códigos de Error

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Validation failed | Datos inválidos en request |
| 404 | Template not found | ID de template no existe |
| 409 | Template already exists | Nombre duplicado |
| 422 | Invalid YAML format | Datasheet no es YAML válido |
| 500 | Internal server error | Error del servidor |

---

## ⏱️ Timeouts

- **Create/Update**: 5 segundos
- **Get**: 2 segundos
- **Delete**: 3 segundos

---

## 📊 Ejemplo de Datasheet (YAML Completo)

```yaml
associatedSaaS: MailerSend
planReference: ENTERPRISE
type: Partial SaaS

capacity:
  - value: .inf
    type: QUOTA
    windowType: CUSTOM
    description: "Volume and overage negotiated via SLA"

maxPower:
  value: "60 requests per minute"
  type: RATE_LIMIT
  reference: "https://www.mailersend.com/help/rate-limits-how-to-reduce-403-422-429-errors"

segmentation:
  - "Organization Level: Limits can be distributed across sub-accounts."
  - "Custom Rate Limits: Available with dedicated infrastructure"

additionalInfo:
  documentation: "https://www.mailersend.com/api"
  supportContact: "support@mailersend.com"
```
