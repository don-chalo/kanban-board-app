# Kanban Board App

Aplicación Kanban full-stack para gestionar tableros, tareas, miembros y transiciones de estado del ciclo de vida. Desarrollado con un flujo guiado por especificaciones usando **OpenSpec** dentro de OpenCode. La motivación fue el aprendizaje de estas dos herramientas.

## Construido con:

### Frontend — `kanban-front-end/`

- React 19 + TypeScript
- Vite 7
- React Router 7
- Tailwind CSS 4
- Radix UI: Avatar, Select y Tooltip
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
```

Instalar y ejecutar:

```bash
cd kanban-api
npm install
npm run dev
```

### 3. Ejecutar el frontend

El frontend no utiliza archivo `.env`: por defecto se conecta al backend local en `http://localhost:3000`.

```bash
cd kanban-front-end
npm install
npm run dev
```

Vite mostrará la URL local en la terminal.