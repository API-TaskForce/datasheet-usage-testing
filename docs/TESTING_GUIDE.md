# Guía: Testing de APIs Externas desde el Frontend

## Flujo de Funcionamiento

El sistema utiliza un **proxy en el backend** para evitar errores CORS:

```
Frontend (http://localhost:5173)
    ↓ POST /api/proxy
Backend (http://localhost:3000)
    ↓ Redirige a API externa
API Externa (https://api.example.com)
```

## Pasos para Hacer un Test

### 1. Crear una Template
Ve a **"+ New Template"** en la página principal:
- **Name**: Nombre descriptivo (ej: "MailerSend Test")
- **Auth Method**: Selecciona el método de autenticación
- **Auth Credential**: Token/contraseña de la API
- **API URL**: URL base del servicio (ej: `https://api.mailersend.com`)
- **Datasheet**: Documentación de la API (YAML u otro formato)

### 2. Hacer un Test
Haz clic en el botón **"Test"** en la template:
- **Método**: GET, POST, PUT, DELETE, PATCH
- **Path**: Ruta adicional (ej: `/v1/email`)
- **Headers**: Headers personalizados (se añade Authorization automáticamente)
- **Body**: Payload JSON para POST/PUT/PATCH

Haz clic en **"Run Test"** para ejecutar.

## Ejemplos de APIs para Testing

### httpbin.org (Sin autenticación)
```
URL: https://httpbin.org
Path: /get
Método: GET
```

### MailerSend (Con autenticación Bearer)
```
URL: https://api.mailersend.com
Path: /v1/account/domain
Método: GET
Auth Method: BEARER
Auth Credential: tu_api_key_aquí
```

### GitHub API (Con autenticación Token)
```
URL: https://api.github.com
Path: /user
Método: GET
Auth Method: BEARER
Auth Credential: tu_github_token
```

## Debugging

Si obtienes error **422 (Unprocessable Entity)**:
1. Abre **F12 → Console** en el navegador
2. Busca logs `[proxyRequest]` para ver qué se está enviando
3. Verifica que la **URL** sea completa y válida
4. Verifica que el **API Token** sea correcto

Si obtienes error **502 (Bad Gateway)**:
1. El backend no puede conectarse a la API externa
2. Verifica que la URL es correcta y accesible
3. Verifica que el backend tiene conexión de internet
4. Intenta con https://httpbin.org para pruebas

## Información de Rate Limits

Después de cada request, si la API retorna headers de rate limit (ej: `X-RateLimit-Remaining`):
- Se mostrará un **gráfico pie** con el uso de cuota
- Se listarán todos los headers de rate limit detectados

## Seguridad

⚠️ **Importante**: El proxy está configurado para:
- ✗ NO acceder a URLs locales (localhost, 127.0.0.1)
- ✓ Aceptar HTTPS solamente (recomendado)
- ✓ Pasar headers de autenticación transparentemente

Los credentials se almacenan en la base de datos del backend.
