# Rate Limit Testing Suite - Documentation

Esta es una suite completa de tests para validar y monitorear los límites de velocidad (rate limits) de diferentes APIs.

## APIs Incluidas

### 1. **Mailersend**
- **Descripción**: Servicio de envío de emails
- **Endpoint Base**: `https://api.mailersend.com`
- **Rate Limit**: 1000 requests por día (varía según el plan)
- **Autenticación**: Bearer Token (API Key)
- **Archivo de Test**: `tests/mailersend.test.js`
- **Setup**: 
  1. Ve a https://www.mailersend.com/settings/api-tokens
  2. Crea un API Token
  3. Configura `MAILERSEND_API_KEY` en `.env`

### 2. **Amadeus**
- **Descripción**: API para datos de viajes, aerolíneas y hoteles
- **Endpoint Base**: `https://api.amadeus.com`
- **Rate Limit**: 10 requests por segundo (varía según el plan)
- **Autenticación**: OAuth2 (Client Credentials)
- **Archivo de Test**: `tests/amadeus.test.js`
- **Setup**: 
  1. Ve a https://developers.amadeus.com
  2. Crea una aplicación
  3. Obtén `Client ID` y `Client Secret`
  4. Configura en `.env`:
     - `AMADEUS_CLIENT_ID`
     - `AMADEUS_CLIENT_SECRET`

### 3. **BitBucket**
- **Descripción**: Servicio de repositorios Git con API REST
- **Endpoint Base**: `https://api.bitbucket.org/2.0`
- **Rate Limit**: 60 requests por minuto (autenticado)
- **Autenticación**: Bearer Token (API Key)
- **Archivo de Test**: `tests/bitbucket.test.js`
- **Setup**: 
  1. Ve a https://bitbucket.org/account/settings/app-passwords/new
  2. Crea una nueva "App Password" y cópiala
  3. Usa este token como `BITBUCKET_API_KEY` en `.env`

### 4. **Spoonacular**
- **Descripción**: API para recetas, nutrición y análisis de comida
- **Endpoint Base**: `https://api.spoonacular.com`
- **Rate Limit**: 500 puntos por día (plan gratis)
- **Nota**: Diferentes endpoints consume diferentes puntos
- **Autenticación**: API Key en query parameter
- **Archivo de Test**: `tests/spoonacular.test.js`
- **Setup**: 
  1. Ve a https://spoonacular.com/food-api
  2. Regístrate y obtén tu API Key
  3. Configura `SPOONACULAR_API_KEY` en `.env`

### 5. **Azure Translator**
- **Descripción**: Servicio de traducción automática de Microsoft Azure
- **Endpoint Base**: `https://api.cognitive.microsofttranslator.com`
- **Rate Limit**: 100 requests por segundo (Plan S1)
- **Autenticación**: Header API Key
- **Archivo de Test**: `tests/azure-translator.test.js`
- **Setup**: 
  1. Ve a https://portal.azure.com
  2. Crea un recurso "Translator"
  3. Ve a "Keys and Endpoint"
  4. Copia la API Key y Region
  5. Configura en `.env`:
     - `AZURE_TRANSLATOR_API_KEY`
     - `AZURE_TRANSLATOR_REGION` (ej: eastus)

### 6. **Vimeo**
- **Descripción**: Plataforma de hosting y gestión de videos
- **Endpoint Base**: `https://api.vimeo.com`
- **Rate Limit**: 100 requests/hora (free), 1000+ requests/hora (planes pagos)
- **Autenticación**: Bearer Token (Access Token)
- **Archivo de Test**: `tests/vimeo.test.js`
- **Setup**: 
  1. Ve a https://developer.vimeo.com/apps
  2. Crea una nueva aplicación
  3. Ve a "Authentication" y genera un "Personal Access Token"
  4. Configura `VIMEO_ACCESS_TOKEN` en `.env`

### 7. **Dailymotion**
- **Descripción**: Plataforma de videos y streaming
- **Endpoint Base**: `https://api.dailymotion.com`
- **Rate Limit**: 150 requests/minuto (público), 600 requests/minuto (autenticado)
- **Autenticación**: Optional (algunos endpoints públicos, otros requieren API Key)
- **Archivo de Test**: `tests/dailymotion.test.js`
- **Setup**: 
  1. Ve a https://www.dailymotion.com/settings/developers
  2. Crea una nueva aplicación
  3. Obtén tu API Key y Secret
  4. Configura en `.env`:
     - `DAILYMOTION_API_KEY`
     - `DAILYMOTION_SECRET`

## Estructura de los Tests

Cada archivo de test incluye múltiples casos de prueba:

1. **CASE 1: Verificación de Autenticación y Request Simple**
   - Valida que la autenticación es correcta
   - Realiza un request para verificar conectividad
   - Captura headers de respuesta para análisis

2. **CASE 2: Monitoreo de Rate Limit**
   - Envía múltiples requests con intervalos
   - Monitorea headers X-RateLimit-* y X-API-Quota-*
   - Detecta respuestas 429 (Too Many Requests)
   - Registra información del límite restante

3. **CASE 3: Burst Requests**
   - Envía múltiples requests simultáneamente sin intervalos
   - Prueba el comportamiento del sistema bajo carga
   - Cuenta requests exitosos vs rate limitados
   - Verifica diferentes códigos de error (429, 403, etc.)

4. **CASE 4+: Casos Específicos por API**
   - Pruebas adicionales específicas de cada API
   - Por ejemplo: diferentes endpoints, token refresh, etc.

## Configuración de Variables de Entorno

1. Copia el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edita `.env` con tus credenciales reales

3. Los tests cargarán automáticamente estas variables

## Ejecutar los Tests

### Ejecutar todos los tests de rate limit:
```bash
npm test
```

### Ejecutar tests de una API específica:
```bash
npm test mailersend.test.js
npm test amadeus.test.js
npm test bitbucket.test.js
npm test spoonacular.test.js
npm test azure-translator.test.js
npm test vimeo.test.js
npm test dailymotion.test.js
```

### Ejecutar con output detallado:
```bash
npm test -- --verbose
```

## Interpretación de Resultados

Cada test registra información útil:

- **Status Code**: El código de respuesta HTTP
- **Rate Limit Remaining**: Cuántos requests quedan disponibles
- **Rate Limit Limit**: El total de requests permitidos
- **Rate Limit Reset**: Cuándo se resetea el contador (puede ser epoch timestamp)
- **429 Response**: Cuando se alcanza el límite

## Headers Comunes de Rate Limit

- `X-RateLimit-Remaining`: Requests restantes en la ventana actual
- `X-RateLimit-Limit`: Total de requests permitidos
- `X-RateLimit-Reset`: Timestamp de cuándo se resetea
- `X-API-Quota-Used`: Puntos/cuota usados
- `X-API-Quota-Left`: Puntos/cuota restantes
- `Retry-After`: Segundos a esperar antes de reintentar

## Notas Importantes

- Algunos tests pueden fallar si la API Key no está configurada correctamente
- El plan gratuito de algunas APIs puede tener límites más restrictivos
- Algunos límites se resetean cada hora, minuto o día
- Al ejecutar tests repetidamente, ten cuidado de no exceder los límites diarios
- La información de rate limit está disponible en los headers de respuesta

## Troubleshooting

### "401 Unauthorized"
- Verifica que tu API Key sea válida
- Comprueba los permisos del token/app

### "429 Too Many Requests"
- Esperado durante tests de burst
- Espera el tiempo indicado en el header `Retry-After`

### "403 Forbidden"
- Posible throttling por parte de la API
- Verifica que no hayas excedido cuotas mensuales/diarias

### Los tests se quedan colgados
- Aumenta el timeout en jest.config.cjs si es necesario
- Verifica tu conexión a internet

## Recursos Útiles

- [Documentación de Mailersend](https://mailersend.com/help)
- [Documentación de Amadeus](https://developers.amadeus.com/blog)
- [Documentación de BitBucket REST API](https://developer.atlassian.com/cloud/bitbucket/rest/)
- [Documentación de Spoonacular](https://spoonacular.com/food-api/docs)
- [Documentación de Azure Translator](https://learn.microsoft.com/en-us/azure/cognitive-services/translator/)
- [Documentación de Vimeo API](https://developer.vimeo.com/)
- [Documentación de Dailymotion API](https://www.dailymotion.com/settings/developers)
