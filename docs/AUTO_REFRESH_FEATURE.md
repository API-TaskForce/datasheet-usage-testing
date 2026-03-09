# Auto-Refresh Implementation - API Dashboard

## Resumen de la Funcionalidad

Se ha implementado un sistema de auto-refresh para el API Dashboard que permite ejecutar simulaciones/tests automáticamente en intervalos de tiempo configurables, similar a los dashboards de Grafana.

## Componentes Creados

### 1. AutoRefreshSelector Component
**Ubicación:** `frontend/src/components/dashboard/AutoRefreshSelector.jsx`

Componente de control que permite:
- Activar/desactivar el auto-refresh con un botón toggle
- Seleccionar el intervalo de ejecución
- Indicador visual de estado activo

**Intervalos disponibles:**
- 5 segundos
- 15 segundos
- 30 segundos
- 1 minuto
- 2 minutos
- 5 minutos

## Cambios en ApiDashboardView

### Estados Agregados
```javascript
const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(60);
const autoRefreshInterval = useRef(null);
```

### Funciones de Control
- `handleAutoRefreshToggle()`: Activa/desactiva el auto-refresh
- `handleRefreshIntervalChange(newInterval)`: Cambia el intervalo de ejecución

### Lógica de Auto-Refresh

Se implementó un `useEffect` que:
1. Se activa cuando `autoRefreshEnabled` o `refreshIntervalSeconds` cambian
2. Ejecuta un test inmediatamente al activar
3. Configura un intervalo para ejecuciones automáticas
4. Respeta el modo de test actual (real/simulado)
5. Utiliza la configuración por defecto si está disponible
6. Limpia el intervalo adecuadamente al desactivar o desmontar

### Ubicación en la UI

El selector se coloca debajo de los badges de información del dashboard:
- Modelo de ventana (Sliding/Fixed)
- Cooldown base
- Test por defecto

## Características Implementadas

✅ **Ejecución automática en intervalos configurables**
- Los tests se ejecutan de fondo cada X tiempo

✅ **Respeto del modo de test**
- Soporta modo "real" y "simulated"

✅ **Uso de configuración predeterminada**
- Si existe un test configurado por defecto, lo utiliza
- Caso contrario, usa valores fallback

✅ **Estado visual claro**
- Indicador animado cuando está activo
- Botón deshabilitado durante carga inicial

✅ **Limpieza apropiada**
- Los intervalos se limpian al desactivar
- Se previenen memory leaks al desmontar componente

✅ **Prevención de ejecuciones concurrentes**
- No se ejecuta un nuevo test si ya hay uno en progreso

## Uso

1. Navegar al dashboard de una API
2. Configurar un test por defecto (opcional, pero recomendado)
3. Activar el botón "Auto-refresh"
4. Seleccionar el intervalo deseado
5. Los tests se ejecutarán automáticamente en el fondo

## Notas Técnicas

- El componente usa `clearInterval` para limpiar intervalos previos
- Se utiliza `useRef` para mantener la referencia del intervalo
- El `eslint-disable` se usa para evitar warnings sobre dependencias exhaustivas controladas manualmente
- La función ejecuta tests directamente sin abrir el modal de configuración
- Logs de consola para debugging (`[Auto-refresh]` prefix)

## Posibles Mejoras Futuras

- [ ] Mostrar countdown visual hasta el próximo refresh
- [ ] Estadísticas de ejecuciones automáticas (total, exitosas, fallidas)
- [ ] Pausar auto-refresh cuando la pestaña no está visible
- [ ] Notificaciones cuando se detectan cambios significativos
- [ ] Guardar preferencia de auto-refresh en localStorage
- [ ] Permitir configurar diferentes tests para diferentes intervalos
