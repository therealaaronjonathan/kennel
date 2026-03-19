# CLAUDE.md — Shomer

> Shomer is a veterinary operating system for vets and reception staff. It handles clinic workflows including patient (pet) records, appointments, and care history.

---

## Tech Stack

- **Frontend:** React + TypeScript (Vite)
- **Backend API:** Bun + Elysia
- **Auth:** Firebase Auth
- **Database:** Firestore
- **Hosting:** Firebase Hosting
- **Tests:** Bun test (built-in)
- **Package manager:** Bun (workspace monorepo)

---

## Project Structure

```
kennel/
├── apps/
│   ├── web/          # Marketing/home page — React + TypeScript (Vite)
│   ├── shomer-app/   # Main veterinary web app — React + TypeScript (Vite)
│   └── backend/      # Bun + Elysia API server
├── packages/
│   └── shared/       # Shared TypeScript types, constants, utils
├── docs/
│   ├── prd/          # Main PRD and increment sub-PRDs
│   ├── scratchpad/   # Progress tracking per sub-PRD
│   └── integrations.md
├── firebase.json
├── .firebaserc
├── bun.lockb
└── CLAUDE.md
```

---

## Common Commands

### Root (monorepo)
- `bun install` — install all workspace dependencies

### Home page (`apps/web`)
- `bun run dev` — start Vite dev server
- `bun run build` — production build
- `bun test` — run tests

### Main app (`apps/shomer-app`)
- `bun run dev` — start Vite dev server
- `bun run build` — production build
- `bun test` — run tests

### Backend (`apps/backend`)
- `bun run dev` — start Elysia dev server with `--watch`
- `bun run build` — compile for production
- `bun test` — run backend tests

---

## gstack

- Use the `/browse` skill from gstack for all web browsing — never use `mcp__claude-in-chrome__*` tools
- Available gstack skills: `/plan-ceo-review`, `/plan-eng-review`, `/review`, `/ship`, `/browse`, `/qa`, `/setup-browser-cookies`, `/retro`

---

## Constraints

- Two user roles only: **Veterinarian** and **Receptionist**
- All shared types live in `packages/shared` — never duplicate across apps
- API runs as standalone Bun server — not on Firebase Hosting
- Frontend deployed to Firebase Hosting with SPA fallback only
