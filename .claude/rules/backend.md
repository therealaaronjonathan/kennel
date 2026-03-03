# Backend Rules — Bun + Elysia

---

## Folder Structure

```
apps/api/src/
├── app.ts                # Elysia app factory — builds and returns the app instance without starting it
├── index.ts              # Entry point — imports app, calls .listen()
├── features/
│   ├── auth/
│   │   ├── routes.ts     # Elysia controller — routing + request validation only
│   │   ├── service.ts    # Business logic — decoupled from Elysia
│   │   ├── repository.ts # Firestore reads/writes for this feature
│   │   ├── models.ts     # TypeBox schemas for request/response validation
│   │   └── types.ts      # Feature-specific TypeScript types
│   ├── appointments/
│   ├── patients/
│   └── ...
├── middleware/            # Shared Elysia plugins (auth guard, error handler, logging)
├── lib/                  # Utility functions, constants, config
└── types/                # Global shared types
```

### Why this structure
Separating `app.ts` (factory) from `index.ts` (runner) — because it lets you create an app instance for tests without binding to a real network port. Feature folders mirror the frontend structure, keeping the mental model consistent across the monorepo.

---

## Layered Architecture

Every request flows through three layers. Each layer has one job:

```
Route (routes.ts) → Service (service.ts) → Repository (repository.ts)
```

- **Route** — HTTP adapter. Defines endpoints, attaches TypeBox validation schemas, and calls the service. No business logic here.
- **Service** — Business logic. Receives validated data, applies rules, orchestrates repository calls. Decoupled from Elysia — services should not import from `elysia`. This keeps business logic testable and framework-independent.
- **Repository** — Data access. All Firestore reads/writes for a feature. No business logic, no HTTP concerns.

```typescript
// ✅ Correct: route calls service, service calls repository
routes.ts → auth.service.signIn(body) → auth.repository.findByEmail(email)

// ❌ Never: route calls repository directly (skips business logic layer)
routes.ts → auth.repository.findByEmail(email)

// ❌ Never: service imports from elysia (couples business logic to framework)
service.ts → import { Elysia } from 'elysia'
```

---

## Elysia Patterns

### Route Definitions

- Each feature exports an Elysia instance as a plugin, mounted in `app.ts`
- Use Elysia's plugin pattern with a prefix per feature — because it keeps routes namespaced and composable

```typescript
// features/auth/routes.ts
import { Elysia, t } from 'elysia';
import { AuthService } from './service';
import { AuthModels } from './models';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/sign-in', ({ body }) => AuthService.signIn(body), {
    body: AuthModels.signIn,
  });

// app.ts
import { authRoutes } from './features/auth/routes';
import { appointmentRoutes } from './features/appointments/routes';

export const app = new Elysia()
  .use(authRoutes)
  .use(appointmentRoutes);
```

### Validation with TypeBox

- All request validation uses `Elysia.t` (TypeBox) — because it gives you runtime validation, compile-time types, and OpenAPI schema from a single source of truth
- Define schemas in `models.ts` per feature — never inline schemas in route definitions
- Use `t.Pick` and `t.Omit` to derive create/update schemas from base models — to avoid duplicating field definitions
- Use the `error` property on TypeBox fields for human-readable validation messages

```typescript
// features/auth/models.ts
import { t } from 'elysia';

export const AuthModels = {
  signIn: t.Object({
    email: t.String({ format: 'email', error: 'Valid email is required' }),
    password: t.String({ minLength: 8, error: 'Password must be at least 8 characters' }),
  }),
};
```

### Do not use TypeScript interfaces for request/response shapes
Elysia's strength is a single source of truth — the TypeBox schema drives both types and validation. Declaring a separate `interface` creates drift risk.

```typescript
// ✅ Derive types from schemas
import { AuthModels } from './models';
type SignInBody = typeof AuthModels.signIn.static;

// ❌ Don't duplicate as interfaces
interface SignInBody { email: string; password: string; }
```

---

## Error Handling

- All API routes return a consistent response shape: `{ success: boolean, data?: T, error?: string }` — this shape is defined as a typed helper in `lib/response.ts`; import and use it in all routes
- Use a shared Elysia error handler plugin in `middleware/` — registered once in `app.ts`
- Narrow `VALIDATION` errors via `onError` to return user-friendly messages — Elysia returns `400` for TypeBox validation errors by default; the error handler normalizes these to `422`
- Services throw typed errors; the error handler maps them to HTTP status codes
- Never let raw Firestore or internal errors leak to the client

---

## Bun-Specific Patterns

- Use `Bun.env` for environment variables — never `process.env` directly, because `Bun.env` is typed and faster
- Use `Bun.password.hash()` and `Bun.password.verify()` for password operations — because Bun has built-in argon2/bcrypt support, no external package needed
- Use `Bun.file()` for file operations when applicable
- Use `bun test` for all backend tests — no Jest, no Vitest

---

## API Conventions

- All routes are prefixed with `/api` at the app level
- Resource endpoints follow REST conventions: `GET /api/appointments`, `POST /api/appointments`, `GET /api/appointments/:id`
- Use plural nouns for resource names
- Return appropriate HTTP status codes: `200` success, `201` created, `400` bad request, `401` unauthorized, `403` forbidden, `404` not found, `422` validation error
- Pagination uses `?page=1&limit=20` query parameters with a consistent paginated response shape
