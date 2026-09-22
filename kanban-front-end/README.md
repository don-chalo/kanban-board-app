# Kanban Front-End

Cliente web del Kanban Board App: login por email, listado de tableros con filtros y orden, detalle del tablero con columnas por estado, tareas, miembros y comentarios.

## Construido con

- React 19 + TypeScript
- Vite 7
- React Router 7 (`/login`, `/boards`, `/boards/:boardId`)
- Tailwind CSS 4
- Radix UI: Avatar, Checkbox, Select y Tooltip
- Vitest + Happy DOM para pruebas

## Configuración

```bash
npm install
```

La única variable de entorno es `VITE_API_BASE_URL` (URL base del API).
Por defecto apunta a `http://localhost:3000`, así que en desarrollo local
no necesitas archivo `.env`. Para apuntar a otro backend (por ejemplo, en
otra máquina), crea `.env`:

```env
VITE_API_BASE_URL=http://<host-del-backend>:3000
```

Reinicia `npm run dev` tras crear o cambiar el `.env`. El backend debe
incluir el origen del frontend en su `CORS_ORIGIN`.

## Comandos

```bash
npm run dev    # desarrollo (Vite muestra la URL local)
npm test       # pruebas unitarias y de componentes
npm run lint   # ESLint
npm run build  # compilación de producción a dist/
```
