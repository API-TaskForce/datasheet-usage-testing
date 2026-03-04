# Almacenamiento Persistente de Tests

## 📋 Descripción General

El sistema de almacenamiento persistente guarda automáticamente todos los resultados de tests en **localStorage** del navegador. Esto permite que los datos se mantengan entre sesiones y navegación.

## 🏗️ Arquitectura

### Hook `useTestHistory`
Ubicado en: `frontend/src/hooks/useTestHistory.js`

**Características:**
- ✅ Carga datos de localStorage al montar el componente
- ✅ Guarda datos automáticamente cada vez que cambia el historial
- ✅ Sincroniza datos entre tabs/ventanas del mismo navegador
- ✅ Límite de 100 tests por template (FIFO - First In, First Out)
- ✅ Manejo de cuota de almacenamiento con logs informativos

**Estructura de datos en localStorage:**
```
Clave: test-history-data-${templateId}
Valor: [
  {
    jobId: "uuid",
    timestamp: "2024-01-01T10:30:00Z",
    storedAt: "2024-01-01T10:30:05Z",
    results: [
      {
        timestamp: "2024-01-01T10:30:00Z",
        status: "ok" | "error" | "rate_limited",
        durationMs: 150,
        response: { ... },
        request: { ... }
      },
      // ... más resultados
    ],
    summary: {
      ok: 150,
      error: 5,
      rate_limited: 2
    }
  },
  // ... más tests
]
```

## 📦 API del Hook

### `useTestHistory(templateId)`

```javascript
const {
  history,           // Array de tests almacenados
  storageReady,      // Boolean - indica si el almacenamiento está listo
  addTestResult,     // Función para agregar un nuevo test
  clearHistory,      // Función para limpiar el historial
  getAllResults,     // Función que retorna todos los resultados planos
  aggregateByGranularity,  // Agregación por tiempo
  getCumulativeOverTime,   // Datos acumulados
  getCurrentStats    // Estadísticas actuales
} = useTestHistory(templateId);
```

## 🔧 Funciones Utilitarias

### `getStorageStats()`
Retorna estadísticas del almacenamiento:
```javascript
{
  templates: 3,              // Número de templates con datos
  totalTests: 150,           // Total de tests almacenados
  totalSize: "1.25MB",       // Tamaño total
  maxQuota: "5MB",           // Cuota máxima del navegador
  byTemplate: [
    {
      templateId: "api-1",
      testCount: 50,
      size: "500KB"
    },
    // ...
  ]
}
```

### `exportHistory(templateId?)`
Exporta el historial como JSON descargable:
```javascript
// Exportar un template específico
const data = exportHistory("api-1");

// Exportar todo
const data = exportHistory();
```

### `importHistory(importData)`
Importa datos previamente exportados:
```javascript
importHistory(previouslyExportedData);
```

### `clearAllHistory(templateId?)`
Limpia el almacenamiento:
```javascript
// Limpiar un template
clearAllHistory("api-1");

// Limpiar todo
clearAllHistory();
```

## 🎨 Panel de Almacenamiento

Ubicado en: `frontend/src/components/StorageInfoPanel.jsx`

El componente `StorageInfoPanel` proporciona una interfaz visual para:
- 📊 Ver estadísticas de almacenamiento
- 📥 Exportar datos como JSON
- 🗑️ Limpiar historial
- 🔄 Actualizar estadísticas

Se integra automáticamente en `ApiDashboardView`.

## 💾 Persistencia Automática

1. **Al agregar un test**: `addTestResult()` → automáticamente guardado en localStorage
2. **Al navegar**: Los datos se cargan al seleccionar un template
3. **Entre tabs**: Los cambios se sincronizan automáticamente via `storage` events
4. **Límite de almacenamiento**: Si se excede la cuota, se elimina el test más antiguo

## 🔍 Debugging

### Ver almacenamiento en DevTools
```javascript
// En la consola del navegador:
localStorage.getItem('test-history-data-api-1')
// Retorna el JSON con todos los tests

// Ver estadísticas
getStorageStats()

// Ver todo el almacenamiento
getAllStoredHistory()
```

### Logs en consola
Todos los cambios se registran con prefix `[useTestHistory]`:
```
[useTestHistory] Loaded from localStorage: { templateId: "api-1", testCount: 5 }
[useTestHistory] Saved to localStorage: { templateId: "api-1", testCount: 6, storageSize: "0.50KB" }
[useTestHistory] Synced from another tab: { templateId: "api-1", testCount: 6 }
```

## ⚙️ Configuración

Ubicado en: `frontend/src/hooks/useTestHistory.js`

```javascript
const STORAGE_KEY = 'test-history-data';        // Prefijo para las claves
const MAX_STORED_TESTS = 100;                   // Máximo de tests por template
```

## 🚀 Flujo de Datos

```
Usuario ejecuta test
    ↓
Backend retorna resultados
    ↓
fetchFinalResults() procesa datos
    ↓
addTestResult() agrega a history
    ↓
useEffect en useTestHistory guarda a localStorage
    ↓
getAggregatedChartData calcula datos agregados
    ↓
Gráficas se actualizan automáticamente
```

## 🔄 Sincronización Entre Tabs

Los datos se sincronizan automáticamente:
```javascript
window.addEventListener('storage', (e) => {
  if (e.key === `${STORAGE_KEY}-${templateId}`) {
    // Actualizar datos del tab actual
    setHistory(JSON.parse(e.newValue));
  }
});
```

## 📊 Ejemplos de Uso

### Cargar historial de un template
```javascript
const { history } = useTestHistory('api-spoonacular');
console.log(`Hay ${history.length} tests almacenados`);
```

### Obtener datos agregados por hora
```javascript
const aggregated = aggregateByGranularity('1h');
// Retorna: { timestamps: [...], successCounts: [...], errorCounts: [...], ... }
```

### Exportar y descargar JSON
```javascript
<button onClick={() => {
  const data = exportHistory('api-spoonacular');
  // Descargar como archivo JSON
}}>
  Exportar
</button>
```

## ⚠️ Limitaciones

- **Cuota**: Típicamente 5-10MB por dominio (depende del navegador)
- **Máximo tests**: 100 tests por template (configurable)
- **Navegadores**: Requiere navegador moderno con soporte localStorage
- **Sincronización**: Solo funciona between tabs, no entre navegadores

## 🐛 Troubleshooting

### Los datos no persisten
1. Verifica si localStorage está habilitado
2. Mira los logs en consola
3. Abre DevTools → Application → Local Storage → busca `test-history-data`

### Almacenamiento lleno
1. Abre el panel de almacenamiento
2. Usa "Limpiar" para eliminar datos antiguos
3. Exporta primero si necesitas guardar los datos

### Datos no se sincronizan entre tabs
- Los `storage` events solo se disparan en tabs diferentes
- Abre el dashboard en otra pestaña después de ejecutar tests
