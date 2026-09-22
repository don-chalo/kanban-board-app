## 1. Configurable CORS origin

- [x] 1.1 Parse `CORS_ORIGIN` into `corsOrigin: string[]` in `loadConfig` (comma-split, trim, drop empties, absent → `[]`) and verify `config.test.ts` covers lists, whitespace, and the empty default
- [x] 1.2 Accept an optional options parameter in `buildApp` and configure the `cors` middleware with a function origin (listed origins echoed, unlisted denied, missing `Origin` allowed), wire it from `index.ts`, and verify `cors.test.ts` covers listed/unlisted/missing origins, the empty default, and preflight, with other call sites untouched
- [x] 1.3 Document `CORS_ORIGIN` plus the split-machine setup (`VITE_API_BASE_URL` with `CORS_ORIGIN`, including the `localhost:5173` dev entry) in `README.md`

## 2. Verification

- [x] 2.1 Run `npm test` in `kanban-api` and verify all pass
