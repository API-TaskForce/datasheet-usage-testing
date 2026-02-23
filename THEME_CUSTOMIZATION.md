# 🎨 Guía de Personalización del Tema

Este documento describe cómo personalizar el sistema de colores y estilos del frontend.

## Estructura del Sistema de Temas

El frontend utiliza un **sistema de variables CSS centralizado** definido en [`theme.css`](frontend/src/theme.css). Esto permite:

✅ **Reutilización consistente** de colores en toda la UI  
✅ **Cambios globales instantáneos** sin editar múltiples archivos  
✅ **Mantenimiento sencillo** de la paleta de colores  
✅ **Soporte para temas claros/oscuros** (preparado para futura implementación)

---

## Paleta de Colores Disponibles

### Colores Principales

```css
--color-primary:           #ffffff    /* Blanco - Fondo de tarjetas y componentes */
--color-primary-dark:      #f9f9f9    /* Blanco grisáceo */
--color-primary-light:     #ffffff    /* Blanco puro */

--color-secondary:         #343a40    /* Gris oscuro - Botones primarios */
--color-secondary-light:   #495057    /* Gris medio */
--color-secondary-lighter: #6c757d    /* Gris claro */
```

### Colores de Estado

```css
--color-success:    #2f855a    /* Verde - Éxito */
--color-warning:    #f59e0b    /* Ámbar - Advertencia */
--color-error:      #dc2626    /* Rojo - Error */
--color-info:       #0284c7    /* Azul - Información */
--color-accent:     #ce2e3a    /* Rojo oscuro - Acciones destacadas */
```

### Colores de Texto

```css
--color-text:           #1e1f20    /* Texto principal */
--color-text-light:     #495057    /* Texto secundario */
--color-text-muted:     #6b7280    /* Texto deshabilitado/tenue */
--color-text-inverse:   #ffffff    /* Texto sobre fondos oscuros */
```

### Colores de Fondo

```css
--color-background:      #f7f7f8    /* Fondo de página */
--color-background-dark: #f0f0f1    /* Fondo alternativo oscuro */
--color-background-light:#ffffff    /* Fondo alternativo claro */
```

---

## Cómo Personalizar los Colores

### 1. Modificar la Paleta Global

Edita [`theme.css`](frontend/src/theme.css) en la sección de colores. Todos los cambios se aplicarán automáticamente:

**Ejemplo:** Cambiar el color primario de azul claro a verde:

```css
:root {
  /* ACCENT COLORS */
  --color-accent: #22c55e;        /* Cambiar de rojo a verde */
  --color-accent-light: #4ade80;
  --color-accent-dark: #16a34a;
}
```

### 2. Usar Variables en Nuevos Componentes

En cualquier archivo CSS, utiliza las variables del tema:

```css
.my-button {
  background: var(--color-primary);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  transition: all var(--transition-base);
}

.my-button:hover {
  background: var(--color-secondary-light);
  box-shadow: var(--shadow-md);
}
```

### 3. Crear un Nuevo Esquema de Colores

Para un nuevo esquema (ej: tema oscuro), agrega un nuevo contexto CSS:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #e6e6e6;
    --color-text-light: #bfbfbf;
    --color-background: #1a1a1a;
    --color-background-light: #242424;
    --color-primary: #2a2a2a;
    --color-border: rgba(255, 255, 255, 0.1);
  }
}
```

---

## Sistema de Espaciado

```css
--spacing-xs:   0.25rem  /* 4px */
--spacing-sm:   0.5rem   /* 8px */
--spacing-md:   1rem     /* 16px */
--spacing-lg:   1.5rem   /* 24px */
--spacing-xl:   2rem     /* 32px */
--spacing-2xl:  2.5rem   /* 40px */
--spacing-3xl:  3rem     /* 48px */
```

**Uso en CSS:**
```css
.card {
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}
```

---

## Sistema de Bordes Redondeados

```css
--radius-sm:    4px      /* Botones pequeños */
--radius-md:    8px      /* Componentes estándar */
--radius-lg:    10px     /* Tarjetas */
--radius-xl:    12px     /* Modales */
--radius-full:  9999px   /* Completamente redondeado */
```

---

## Sistema de Sombras

```css
--shadow-sm:    0 1px 2px rgba(31, 41, 55, 0.05)
--shadow-md:    0 4px 6px rgba(31, 41, 55, 0.08)
--shadow-lg:    0 6px 18px rgba(31, 41, 55, 0.06)
--shadow-xl:    0 10px 30px rgba(31, 41, 55, 0.2)
--shadow-2xl:   0 20px 40px rgba(31, 41, 55, 0.3)
```

**Uso:**
```css
.card {
  box-shadow: var(--shadow-lg);
}

.card:hover {
  box-shadow: var(--shadow-xl);
}
```

---

## Tipografía

### Familias de Fuentes

```css
--font-family-base:  Inter, ui-sans-serif, system-ui, -apple-system, ...
--font-family-mono:  ui-monospace, SFMono-Regular, Menlo, Monaco, ...
```

### Tamaños de Fuente

```css
--font-size-xs:    0.75rem   /* 12px */
--font-size-sm:    0.875rem  /* 14px */
--font-size-base:  1rem      /* 16px */
--font-size-lg:    1.125rem  /* 18px */
--font-size-xl:    1.25rem   /* 20px */
--font-size-2xl:   1.5rem    /* 24px */
--font-size-3xl:   1.875rem  /* 30px */
--font-size-4xl:   2.25rem   /* 36px */
```

### Pesos de Fuente

```css
--font-weight-light:      300
--font-weight-normal:     400
--font-weight-medium:     500
--font-weight-semibold:   600
--font-weight-bold:       700
```

### Altura de Línea

```css
--line-height-tight:    1.1
--line-height-normal:   1.5
--line-height-relaxed:  1.75
```

---

## Transiciones Predefinidas

```css
--transition-fast:   0.15s ease-in-out
--transition-base:   0.25s ease-in-out
--transition-slow:   0.5s ease-in-out
```

**Uso:**
```css
.button {
  transition: all var(--transition-base);
}
```

---

## Clases de Utilidad Disponibles

### Botones

```html
<!-- Botón primario (gris oscuro) -->
<button class="btn-primary">Guardar</button>

<!-- Botón secundario (contorno) -->
<button class="btn-secondary">Cancelar</button>

<!-- Botón de acción destructiva -->
<button class="btn-danger">Eliminar</button>

<!-- Botón de éxito -->
<button class="btn-success">Confirmar</button>
```

### Componentes

```html
<!-- Tarjeta -->
<div class="card-root">Contenido</div>

<!-- Modal -->
<div class="modal-overlay">
  <div class="modal-panel">Contenido del modal</div>
</div>

<!-- Consola -->
<div class="console-root">
  <div class="console-line">Línea de salida</div>
  <div class="console-request">Petición HTTP</div>
  <div class="console-response">Respuesta HTTP</div>
</div>
```

### Utilidades

```html
<!-- Texto atenuado -->
<p class="muted">Texto secundario</p>
```

---

## Estructura de Archivos CSS

```
src/
├── theme.css          ← 🎨 Variables y paleta central
├── index.css          ← Estilos globales y reset
├── style.css          ← Componentes y clases reutilizables
├── App.css            ← Estilos específicos de App
├── main.jsx           ← Importa theme.css primero
└── components/
    ├── BaseButton.jsx
    ├── BaseCard.jsx
    └── ...
```

---

## Mejores Prácticas

✅ **Siempre usa variables** en lugar de colores hardcodeados  
✅ **Centraliza en `theme.css`** los cambios globales  
✅ **Mantén la consistencia** usando el espaciado predefinido  
✅ **Reutiliza clases** como `.btn-primary`, `.card-root`, etc.  
✅ **Evita especificidades altas** usando clases simples  
✅ **Documenta cambios** de esquema de colores  

---

## Ejemplos de Personalización

### Cambiar el Tema Completo a Tonos Azules

```css
/* En theme.css */
:root {
  --color-accent: #0284c7;      /* Azul claro */
  --color-accent-light: #0ea5e9;
  --color-accent-dark: #0c4a6e;
  
  --color-secondary: #1e40af;   /* Azul oscuro */
  --color-secondary-light: #1e3a8a;
}
```

### Aumentar el Espaciado General

```css
:root {
  --spacing-md: 1.25rem;  /* 20px en lugar de 16px */
  --spacing-lg: 2rem;     /* 32px en lugar de 24px */
}
```

### Crear Componente Personalizado

```css
/* En style.css o nueva hoja CSS */
.custom-card {
  background: var(--color-primary);
  padding: var(--spacing-lg);
  border-radius: var(--radius-lg);
  border: 2px solid var(--color-accent);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}

.custom-card:hover {
  border-color: var(--color-accent-light);
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
}
```

---

## Referencia Rápida

| Variable | Uso Típico |
|----------|-----------|
| `--color-primary` | Fondos de componentes |
| `--color-secondary` | Botones primarios |
| `--color-accent` | Acciones destacadas |
| `--color-success` | Mensajes positivos |
| `--color-error` | Errores y validación |
| `--spacing-md` | Padding estándar |
| `--radius-lg` | Tarjetas |
| `--shadow-lg` | Elevación de componentes |
| `--transition-base` | Animaciones suaves |

---

## Preguntas Frecuentes

**¿Cómo cambiar el color de todos los botones primarios?**
> Edita `--color-secondary` en `theme.css`.

**¿Puedo tener múltiples temas?**
> Sí, crea nuevos `:root` en media queries diferentes (dark mode, high contrast, etc.).

**¿Qué pasa si no uso una variable?**
> Las variables ofrecen consistencia y mantenibilidad. Se recomienda usarlas siempre.

**¿Cómo agrego una nueva variable?**
> Añádela en `:root` en `theme.css` y úsala directamente: `var(--mi-variable)`.

---

**Última actualización:** 2024  
**Mantenedor:** Frontend Team
