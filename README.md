# Kanban Board App

Aplicación Kanban full-stack para gestionar tableros, tareas, miembros y transiciones de estado del ciclo de vida. Desarrollado con un flujo guiado por especificaciones usando **OpenSpec** dentro de OpenCode. La motivación fue el aprendizaje de estas dos herramientas.

## Construido con:

### Frontend — `kanban-front-end/`

- React 19 + TypeScript
- Vite 7
- React Router 7
- Tailwind CSS 4
- Radix UI: Avatar, Checkbox, Select y Tooltip
- Vitest + Happy DOM para pruebas

### Backend — `kanban-api/`

- Node.js + TypeScript
- Express 5
- Mongoose 9 + MongoDB
- dotenv para configuración
- Vitest + Supertest + mongodb-memory-server para pruebas

## Instalación local

### Requisitos

- Node.js 20 o superior
- npm
- MongoDB local o una URI MongoDB accesible

### 1. Clonar el repositorio

```bash
git clone <URL-del-repositorio>
cd kanban-board-app
```

### 2. Configurar el backend

Crear `kanban-api/.env`:

```env
DATABASE_URL=mongodb://localhost:27017/kanban
DEFAULT_PORT=3000
CORS_ORIGIN=http://localhost:5173
```

`CORS_ORIGIN` es la lista de orígenes separados por comas con acceso CORS
al API. Sin esta variable, los navegadores solo pueden llamar al API desde
el mismo origen; en desarrollo local se necesita la URL de Vite.

Instalar y ejecutar:

```bash
cd kanban-api
npm install
npm run dev
```

### 3. Ejecutar el frontend

Por defecto se conecta al backend local en `http://localhost:3000`. Para
apuntar a otro backend (por ejemplo, en otra máquina), crear
`kanban-front-end/.env` con:

```env
VITE_API_BASE_URL=http://<host-del-backend>:3000
```

Y agregar la URL del frontend a `CORS_ORIGIN` en `kanban-api/.env`.

```bash
cd kanban-front-end
npm install
npm run dev
```

Vite mostrará la URL local en la terminal.

## Pruebas

```bash
cd kanban-api && npm test        # Vitest + Supertest + mongodb-memory-server
cd kanban-front-end && npm test  # Vitest + Happy DOM
cd kanban-front-end && npm run lint && npm run build
```

Si el pool de workers de Vitest colapsa en tu máquina
(`Worker exited unexpectedly...` sin ningún FAIL), corre con
`npx vitest run src --maxWorkers=2`.

## Flujo de trabajo (OpenSpec)

Los cambios se trabajan como *changes* versionados: propuesta →
implementación → archivo.

```bash
openspec list                    # changes activos
openspec status --change "<id>"  # artefactos y progreso
openspec validate --specs --strict
```

El historial vive en `openspec/changes/archive/` y las especificaciones
vigentes en `openspec/specs/`.