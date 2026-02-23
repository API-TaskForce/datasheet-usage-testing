# 📦 Guía de Componentes del Frontend

Este documento describe cómo usar los componentes base y los estilos globales del frontend para mantener consistencia visual.

## Estructura de Componentes

```
src/components/
├── BaseButton.jsx      ← Botón reutilizable con variantes
├── BaseCard.jsx        ← Contenedor de tarjeta
├── TemplateForm.jsx    ← Formulario de plantillas
├── TemplateList.jsx    ← Lista de plantillas
└── TemplateTestView.jsx ← Vista de prueba de API
```

---

## ✨ Componentes Base

### BaseButton

Botón reutilizable con soporte para diferentes variantes y tamaños.

**Props:**
- `variant`: `'primary' | 'secondary' | 'danger' | 'success'` (default: `'primary'`)
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`)
- `disabled`: `boolean` (default: `false`)
- `children`: contenido del botón
- `...rest`: otros atributos HTML

**Ejemplo:**
```jsx
<BaseButton variant="primary" size="md" onClick={handleClick}>
  Guardar
</BaseButton>

<BaseButton variant="danger" size="sm">
  Eliminar
</BaseButton>

<BaseButton variant="secondary" disabled>
  Deshabilitado
</BaseButton>
```

**Clases CSS disponibles:**
- `.btn-primary` - Botón oscuro (secundario)
- `.btn-secondary` - Botón contorno (primario)
- `.btn-danger` - Botón rojo
- `.btn-success` - Botón verde

---

### BaseCard

Contenedor de tarjeta con estilos consistentes.

**Props:**
- `children`: contenido de la tarjeta
- `className`: clases CSS adicionales (opcional)

**Ejemplo:**
```jsx
<BaseCard>
  <h3>Título</h3>
  <p>Contenido de la tarjeta</p>
</BaseCard>

<BaseCard className="custom-class">
  Contenido personalizado
</BaseCard>
```

**Características:**
- Fondo blanco
- Bordes redondeados (10px)
- Sombra suave
- Padding consistente

---

## 📝 Clases de Formularios

### Labels

```jsx
<label className="form-label">Normal</label>
<label className="form-label muted">Deshabilitada/Secundaria</label>
```

### Inputs, Selects y Textareas

```jsx
<input type="text" className="form-input" placeholder="Texto" />
<select className="form-select">
  <option>Opción 1</option>
</select>
<textarea className="form-textarea" rows={6} placeholder="Texto multilínea" />
```

**Características:**
- Ancho 100% (padre)
- Padding consistente
- Bordes suaves
- Enfoque con color de acento
- Estado deshabilitado

**Ejemplo completo:**
```jsx
<div className="form-group">
  <label className="form-label muted">Nombre</label>
  <input 
    type="text"
    className="form-input" 
    placeholder="Ingresa el nombre"
    value={name}
    onChange={e => setName(e.target.value)}
  />
</div>
```

---

## 🎯 Badges (Insignias)

Útiles para estados y etiquetas.

**Clases disponibles:**
- `.badge-success` - Verde
- `.badge-error` - Rojo
- `.badge-warning` - Ámbar
- `.badge-info` - Azul
- `.badge-accent` - Rojo oscuro

**Ejemplo:**
```jsx
<span className="badge badge-success">Activo</span>
<span className="badge badge-error">Error</span>
<span className="badge badge-warning">Pendiente</span>
```

---

## 🔔 Alertas y Mensajes

### Alertas

**Clases disponibles:**
- `.alert-success` - Mensaje positivo
- `.alert-error` - Mensaje de error
- `.alert-warning` - Advertencia
- `.alert-info` - Información

**Ejemplo:**
```jsx
{error && <div className="alert alert-error">{error}</div>}
{success && <div className="alert alert-success">¡Guardado exitosamente!</div>}
```

---

## 📐 Utilidades de Espaciado

### Margin Vertical
```css
.mb-1  /* 4px */
.mb-2  /* 8px */
.mb-3  /* 12px */
.mb-4  /* 16px */
.mb-6  /* 24px */
.mt-3  /* 12px */
.pt-4  /* padding-top: 16px */
```

### Espaciado entre elementos
```css
.space-y-2  /* 8px entre filas */
.space-y-3  /* 12px entre filas */
.space-y-4  /* 16px entre filas */
.space-y-6  /* 24px entre filas */
```

### Gap (en flex/grid)
```css
.gap-2  /* 8px */
.gap-3  /* 12px */
.gap-4  /* 16px */
.gap-6  /* 24px */
```

**Ejemplo:**
```jsx
<div className="space-y-4">
  <div>Elemento 1</div>
  <div>Elemento 2</div>
  <div>Elemento 3</div>
</div>

<div className="flex gap-3">
  <button>Botón 1</button>
  <button>Botón 2</button>
</div>
```

---

## 🎨 Utilidades Flex

```jsx
<div className="flex gap-2">
  <div>Elemento 1</div>
  <div>Elemento 2</div>
</div>

<div className="flex flex-col gap-3">
  <div>Fila 1</div>
  <div>Fila 2</div>
</div>

<div className="flex items-center justify-between">
  <span>Título</span>
  <button>Acción</button>
</div>
```

**Clases disponibles:**
- `.flex` - Display flex
- `.flex-col` - Dirección columna
- `.items-center` - Alinear al centro
- `.items-start` - Alinear al inicio
- `.justify-between` - Espaciar entre
- `.justify-end` - Justificar al final
- `.flex-1` - Flex grow

---

## 📊 Utilidades Grid

```jsx
<div className="grid grid-cols-1 gap-4">
  {items.map(item => (
    <div key={item.id}>{item.name}</div>
  ))}
</div>
```

**Responsive:**
```jsx
<div className="grid grid-cols-1 md-grid-cols-2 lg-grid-cols-3 gap-4">
  {items.map(item => (
    <BaseCard key={item.id}>{item.name}</BaseCard>
  ))}
</div>
```

---

## 🎚️ Variables CSS Disponibles

### Colores
```css
--color-primary          /* Blanco */
--color-secondary        /* Gris oscuro */
--color-accent           /* Rojo */
--color-success          /* Verde */
--color-error            /* Rojo claro */
--color-text             /* Texto negro */
--color-text-muted       /* Gris neutral */
--color-background       /* Fondo claro */
--color-border           /* Borde suave */
```

### Tamaños
```css
--spacing-xs    /* 4px */
--spacing-sm    /* 8px */
--spacing-md    /* 16px */
--spacing-lg    /* 24px */
--spacing-xl    /* 32px */

--radius-md     /* 8px */
--radius-lg     /* 10px */
--font-size-base /* 16px */
--font-size-lg  /* 18px */
--font-size-2xl /* 24px */
```

---

## 📋 Ejemplo Completo: Formulario

```jsx
import BaseCard from './BaseCard'
import BaseButton from './BaseButton'

export default function MyForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    category: '',
    message: ''
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // API call
      await saveForm(form)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <BaseCard>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Contact Form</h2>
        
        {error && <div className="alert alert-error">{error}</div>}
        
        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            type="text"
            className="form-input"
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-input"
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <select
            className="form-select"
            value={form.category}
            onChange={e => setForm({...form, category: e.target.value})}
          >
            <option value="">Select...</option>
            <option value="sales">Sales</option>
            <option value="support">Support</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Message</label>
          <textarea
            className="form-textarea"
            rows={6}
            value={form.message}
            onChange={e => setForm({...form, message: e.target.value})}
          />
        </div>

        <div className="flex gap-3 justify-end">
          <BaseButton variant="secondary" onClick={() => {}}>
            Cancel
          </BaseButton>
          <BaseButton 
            variant="primary" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Submit'}
          </BaseButton>
        </div>
      </div>
    </BaseCard>
  )
}
```

---

## 🚀 Mejores Prácticas

✅ **Siempre usa BaseButton** en lugar de crear botones nuevos  
✅ **Usa BaseCard** para agrupar contenido  
✅ **Reutiliza clases CSS** como `form-input`, `form-label`, etc.  
✅ **Usa variables CSS** para colores y espaciado  
✅ **Mantén consistencia** en el espaciado (usa múltiplos de `--spacing-md`)  
✅ **Aprovecha responsive** con clases modificadas  

❌ **Evita**: Colores hardcodeados como `#ff0000`  
❌ **Evita**: Padding/margin inline `style={{padding: '10px'}}`  
❌ **Evita**: Crear nuevos botones personalizados  

---

## 📚 Referencias

- [Guía de Personalización del Tema](THEME_CUSTOMIZATION.md)
- [Especificación de API](docs/API_SPECIFICATION.md)
- [Estructura de Arquitectura](docs/ARCHITECTURE.md)

---

**Última actualización:** 2024  
**Versión:** 1.0
