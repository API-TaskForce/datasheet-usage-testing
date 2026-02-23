# Referencia Rápida de Comandos

## 🚀 Inicio Rápido

```bash
# 1. Instalar todas las dependencias
npm install

# 2. Ejecutar backend + frontend simultáneamente
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3000

---

## 📋 Comandos Disponibles

### Desarrollo

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Ejecutar backend + frontend juntos |
| `npm run dev --workspace=backend` | Solo backend (puerto 3000) |
| `npm run dev --workspace=frontend` | Solo frontend (puerto 5173) |

### Testing

| Comando | Descripción |
|---------|-------------|
| `npm run test` | Ejecutar tests del backend |

### Build & Preview

| Comando | Descripción |
|---------|-------------|
| `npm run build` | Build del frontend para producción |
| `npm run preview` | Previsualizar build de producción |

---

## 📦 Instalar Dependencias

### En Backend

```bash
npm install --workspace=backend nombre-paquete
npm install --workspace=backend --save-dev nombre-paquete
```

### En Frontend

```bash
npm install --workspace=frontend nombre-paquete
npm install --workspace=frontend --save-dev nombre-paquete
```

---

## 🎯 Puertos

- **Backend API**: `http://localhost:3000`
- **Frontend Dev**: `http://localhost:5173`
- **Frontend API Proxy**: `/api/*` → `http://localhost:3000/*`

---

## 📂 Estructura

```
backend/          API REST (Node.js + Express)
frontend/         Web UI (Vue 3 + Vite)
SETUP.md          Guía de instalación completa
ARCHITECTURE.md   Arquitectura detallada del proyecto
```

---

## ⚙️ Configuración

- **Backend .env**: `backend/.env` (copiar de `backend/.env.example`)
- **Vite Config**: `frontend/vite.config.js`
- **Root Config**: `package.json` (monorepo con npm workspaces)

---

## 🔧 Variables de Entorno (Backend)

```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

Más variables en `backend/.env.example`

---

## 🐛 Solución de Problemas

### Puerto ocupado
- Backend: Cambiar `PORT=3001` en `.env`
- Frontend: Se cambia automáticamente si 5173 está ocupado

### Limpiar dependencias
```bash
rm -rf node_modules backend/node_modules frontend/node_modules
npm install
```

### Problemas CORS
- Verificar que `CORS_ORIGIN` en backend coincide con frontend
- Backend debe estar en puerto 3000 (o el configurado)

---

## 📚 Documentación

- [README.md](README.md) - Información general
- [SETUP.md](SETUP.md) - Instalación y configuración detallada
- [ARCHITECTURE.md](ARCHITECTURE.md) - Arquitectura y diseño
- [backend/README.md](backend/README.md) - Detalles del backend
- [frontend/README.md](frontend/README.md) - Detalles del frontend
