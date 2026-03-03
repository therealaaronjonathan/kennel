# Frontend Rules — React + TypeScript + Vite

---

## Folder Structure

```
apps/web/src/
├── app/                  # App shell: root layout, router config, providers
├── features/             # Feature modules (one folder per domain)
│   ├── auth/
│   │   ├── components/   # Feature-specific components
│   │   ├── hooks/        # Feature-specific hooks (e.g., use-auth.ts)
│   │   ├── services/     # API calls via React Query
│   │   ├── types.ts      # Feature-specific types
│   │   └── index.ts      # Public API — only import features through this
│   ├── appointments/
│   ├── patients/
│   └── ...
├── components/
│   ├── ui/               # Raw shadcn components — do not modify directly
│   ├── primitives/       # Lightly modified shadcn wrappers (e.g., AppButton, AppDialog)
│   └── blocks/           # Compositions of primitives (e.g., PatientCard, AppointmentRow)
├── hooks/                # Shared hooks used across features
├── lib/                  # Utility functions, constants, config
├── routes/               # Route definitions and lazy-loaded route entries
└── types/                # Global shared types (prefer feature-level types first)
```

### Why this structure
Feature-based organization keeps related code co-located — components, hooks, services, and types for a feature live together. This prevents cross-feature coupling and makes each feature independently understandable. When you open `features/appointments/`, everything about appointments is there.

---

## Component Patterns

### shadcn 3-Layer System

- **`ui/`** — Raw shadcn components installed via CLI. Never edit these directly — because updates from shadcn would overwrite your changes.
- **`primitives/`** — Thin wrappers that apply Shomer-specific defaults (brand colors, sizes, variants). Import from `ui/`, export a Shomer-flavored version. One primitive per file.
- **`blocks/`** — Compositions that combine multiple primitives into reusable UI chunks (e.g., `PatientCard`, `AppSidebar`). Blocks contain layout and composition logic but no business logic.

```
// ✅ Correct import chain
Block → imports from → Primitives → imports from → ui/

// ❌ Never skip layers
Block → imports from → ui/  (bypasses your brand defaults)
```

### Component Rules

- Functional components only — no class components
- One component per file; filename matches component name in kebab-case
- Props are defined as an `interface` in the same file, exported alongside the component
- Destructure props in the function signature
- No business logic in components — components handle rendering and user interaction only
- Extract reusable logic into custom hooks

---

## Routing — React Router v7 (SPA Mode)

- React Router v7 with Vite in SPA mode — no SSR
- Route definitions live in `routes/` as a centralized config
- Use lazy loading for all route components — because it keeps the initial bundle small and loads feature code only when the user navigates there

```typescript
// routes/index.tsx
import { lazy } from 'react';

const AppointmentsPage = lazy(() => import('@/features/appointments/components/appointments-page'));
```

- Layouts use React Router's `<Outlet />` for nested routing
- Protect routes via an `AuthGuard` wrapper that checks Firebase Auth state — never rely on hiding links alone

---

## State Management

### Server State — React Query (TanStack Query)

- All API calls go through React Query — never use raw `useEffect` + `fetch` for server data
- Query keys follow the pattern: `[feature, resource, ...params]` (e.g., `['appointments', 'list', clinicId]`) — because consistent key structure makes cache invalidation predictable
- Each feature defines its own query hooks in `features/<name>/services/` (e.g., `use-appointments.ts`)
- Mutations use `useMutation` with `onSuccess` invalidation of related queries
- Configure stale times and retry logic in a shared `QueryClient` instance in `app/`

### Client State

- Local UI state uses `useState` or `useReducer` — keep state as close to the component that uses it as possible
- Lift state only when two sibling components need the same data
- Global client state (e.g., sidebar open/closed, theme) uses React Context — one context per concern, never a single god context

---

## TypeScript Conventions

- Strict mode enabled — no `any` types unless explicitly justified with a comment
- Prefer `interface` for object shapes; use `type` for unions and aliases
- Feature-level types live in `features/<name>/types.ts`; shared types in `types/`
- API response types are defined once and shared via `packages/shared`
- Use `as const` for constant objects and discriminated unions

---

## Styling

- Tailwind CSS exclusively — no CSS modules, no inline `style` attributes
- Use shadcn's `cn()` utility for conditional class merging
- Define design tokens as CSS variables in `globals.css` — primitives consume these tokens, not raw Tailwind values
- Responsive design uses Tailwind breakpoints (`sm:`, `md:`, `lg:`) — mobile-first approach

---

## Import Rules

- Always import `cn` from `@/lib/utils` — never from `clsx` or `tailwind-merge` directly
- Always import features through their `index.ts` — never from internal feature files
- `@/` maps to `src/` — configured in both `tsconfig.json` and `vite.config.ts`

---

## File Naming

- Hooks: `use-<name>.ts`
- Query hooks (services): `use-<resource>.ts` (e.g., `use-appointments.ts`)
- Components: kebab-case matching the component name (e.g., `patient-card.tsx`)

---

## Exports

- Route components use default exports (required for `lazy()`)
- Everything else uses named exports

---

## Error Handling

- Wrap lazy-loaded routes with `<Suspense>` and `<ErrorBoundary>` from `react-error-boundary` in the route config
- Both live in `app/` — do not add them ad-hoc inside feature components
