## 1. Dependency and middleware

- [x] 1.1 Add `cors` (and `@types/cors`) to `package.json` and verify `npm install` succeeds
- [x] 1.2 Mount `app.use(cors())` in `src/app.ts` before the routers and verify with a script that an origin-carrying request returns `Access-Control-Allow-Origin`

## 2. Tests

- [x] 2.1 Add tests asserting CORS behavior: a request with an `Origin` header returns `Access-Control-Allow-Origin`; a preflight `OPTIONS` requesting `Content-Type`/`X-User-Id` headers responds `2xx` with `Access-Control-Allow-Methods`/`Access-Control-Allow-Headers`; an existing route (e.g. `POST /login`) behaves as before with the CORS header present; verify the route test file passes
- [x] 2.2 Run `npx tsc --noEmit` and the full test suite and verify all tests pass with no type errors