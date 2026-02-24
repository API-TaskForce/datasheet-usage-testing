# Tailwind CSS - Guía de Clases Personalizadas

Todos los estilos globales han sido migrados a **Tailwind CSS** usando `@layer`. El único archivo CSS necesario es `globals.css` que se importa en `main.jsx`.

## 📁 Estructura de Archivos CSS

```
src/
├── globals.css      ✅ Único archivo CSS necesario (contiene @layer components)
├── theme.css        ✅ Variables CSS (colores, spacing, etc.)
├── index.css        📝 Archivo vacío (legado)
├── style.css        📝 Archivo vacío (legado)
└── App.css          📝 Archivo vacío (legado)
```

## 🎨 Clases Personalizadas Disponibles

### Botones
```jsx
className="btn-primary"      // Botón primario con borde accent
className="btn-secondary"    // Botón secundario con borde secondary
className="btn-danger"       // Botón peligroso (accent)
className="btn-success"      // Botón de éxito (fondo verde)
```

**Ejemplo:**
```jsx
<button className="btn-primary">Click me</button>
<button className="btn-danger">Delete</button>
```

### Formularios
```jsx
className="form-label"       // Label para inputs
className="form-input"       // Input text
className="form-select"      // Select
className="form-textarea"    // Textarea
className="form-group"       // Wrapper para grupo de form
```

**Ejemplo:**
```jsx
<label className="form-label">Nombre</label>
<input className="form-input" type="text" />
<textarea className="form-textarea"></textarea>
```

### Badges (Etiquetas)
```jsx
className="badge badge-success"     // Badge verde
className="badge badge-error"       // Badge rojo
className="badge badge-warning"     // Badge amarillo
className="badge badge-info"        // Badge azul
className="badge badge-accent"      // Badge accent
```

**Ejemplo:**
```jsx
<span className="badge badge-success">Activo</span>
<span className="badge badge-error">Error</span>
```

### Alerts (Alertas)
```jsx
className="alert alert-success"     // Alerta verde
className="alert alert-error"       // Alerta roja
className="alert alert-warning"     // Alerta amarilla
className="alert alert-info"        // Alerta azul
```

**Ejemplo:**
```jsx
<div className="alert alert-success">¡Éxito!</div>
<div className="alert alert-error">Error al guardar</div>
```

### Modales y Cards
```jsx
className="modal-overlay"    // Overlay (fondo oscuro)
className="modal-panel"      // Panel modal (contenedor)
className="card-root"        // Card/Tarjeta
```

**Ejemplo:**
```jsx
<div className="modal-overlay">
  <div className="modal-panel">
    <h2>Modal Title</h2>
  </div>
</div>
```

### Toasts
```jsx
className="toast"       // Toast con animación de entrada
className="toast exit"  // Toast con animación de salida
```

## 🎯 Usar clases de Tailwind puro

Además de las clases personalizadas, puedes usar cualquier clase de Tailwind:

```jsx
// Flexbox
className="flex flex-col items-center justify-between"

// Spacing
className="p-4 m-2 mb-6"

// Grid
className="grid grid-cols-3 gap-4"

// Colors
className="text-red-500 bg-blue-100"

// Responsive
className="md:flex lg:grid-cols-2"

// etc.
```

## 📚 Variables CSS Disponibles

Están definidas en `theme.css` y puedes usarlas en estilos inline o en CSS:

```css
/* Colores */
--color-primary: #ffffff
--color-secondary: #343a40
--color-accent: #be1d37
--color-success: #007c35
--color-warning: #c78100
--color-error: #be1d37
--color-info: #5f92c5

/* Spacing */
--spacing-xs: 0.25rem (4px)
--spacing-sm: 0.5rem (8px)
--spacing-md: 1rem (16px)
--spacing-lg: 1.5rem (24px)
--spacing-xl: 2rem (32px)
--spacing-2xl: 2.5rem (40px)

/* Border Radius */
--radius-sm: 5px
--radius-md: 10px
--radius-lg: 20px
--radius-xl: 30px
--radius-full: 9999px
```

## ✨ Ejemplo Completo

```jsx
export default function MyComponent() {
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      {/* Label */}
      <label className="form-label">Email</label>
      
      {/* Input */}
      <input className="form-input mb-4" type="email" />
      
      {/* Badge */}
      <span className="badge badge-info mb-4">Required</span>
      
      {/* Botones */}
      <div className="flex gap-2">
        <button className="btn-primary">Save</button>
        <button className="btn-danger">Cancel</button>
      </div>
    </div>
  )
}
```

## 🔧 Modificar Clases Personalizadas

Para editar las clases, ve a `/src/globals.css` y modifica la sección `@layer components`.

No necesitas crear más archivos CSS. ¡Todo en Tailwind! 🎉
