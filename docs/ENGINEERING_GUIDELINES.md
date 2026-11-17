# TaskFlow Web — Engineering Guidelines

Implementation standards for the TaskFlow Angular SPA. Use the checkboxes to track progress. Aligned with [PROJECT_SPEC.md](PROJECT_SPEC.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Stack

| Concern | Choice |
|---------|--------|
| Runtime | Node 24 LTS, managed with fnm or nvm-windows |
| Framework | Angular 22, standalone components, zoneless change detection, signals |
| Language | TypeScript strict mode |
| Package manager | npm |
| HTTP | `HttpClient` + RxJS at the edges, state exposed as signals |
| Forms | Typed Reactive Forms |
| UI | Angular CDK (dialog, overlay, drag-and-drop, a11y) + own components |
| Styling | Tailwind CSS v4 over CSS custom properties (design tokens) |
| Icons | `@lucide/angular` |
| API types | `openapi-typescript`, generated from a versioned snapshot |
| Unit tests | Vitest + Angular Testing Library |
| E2E tests | Playwright + `@axe-core/playwright` |
| Lint / format | angular-eslint + Prettier |
| Git hooks | lint-staged on pre-commit |

`lucide-angular` (the old package) only supports Angular up to 21; use `@lucide/angular`.

---

## Cross-Cutting Standards

### Architecture

- [ ] **Folder structure by feature** — `core/`, `shared/`, `features/<feature>/`, as in [ARCHITECTURE.md](ARCHITECTURE.md).
- [ ] **Dependency direction** — `features` may import `core` and `shared`; `core` may import `shared`; `shared` imports neither. Features do not import each other.
- [ ] **Smart and presentational components** — pages (smart) inject stores and orchestrate; presentational components only use `input()` / `output()` and inject nothing from `core` or `features`.
- [ ] **One store per feature** — following the store shape below. No ad-hoc state in components besides local UI state.
- [ ] **HTTP only in API services** — components and stores never use `HttpClient` directly.

### Store shape (signal-based services)

- [ ] State is a private `signal`; reads are public `computed` or `asReadonly()` signals.
- [ ] Mutations happen only through public command methods (e.g. `moveTask()`, `loadNextPage()`).
- [ ] RxJS is used for HTTP and event streams (debounce, `switchMap` cancellation); results are written into signals.
- [ ] Optimistic updates keep a snapshot to roll back in the same method that applied them.

### Angular conventions

- [ ] Standalone components only; no `NgModule`.
- [ ] Zoneless; no `zone.js` dependency.
- [ ] `ChangeDetectionStrategy.OnPush` on every component.
- [ ] `inject()` instead of constructor injection.
- [ ] Signal APIs: `input()`, `output()`, `model()`, `viewChild()`, `computed()`, `effect()` only for side effects that cannot be derived.
- [ ] Built-in control flow (`@if`, `@for` with `track`, `@switch`).
- [ ] Lazy-loaded routes (`loadComponent` / `loadChildren`); functional guards, resolvers and interceptors.
- [ ] Router bound to component inputs (`withComponentInputBinding`) for route params.
- [ ] File names follow the Angular CLI 22 defaults and the official style guide (kebab-case, named by what the file contains, e.g. `task-card.ts`, `board-store.ts`, `tasks-api.ts`).

### API integration

- [ ] **Generated contract** — DTO types come from `openapi-typescript`; they are never edited by hand.
- [ ] **Mapping layer** — API services map DTOs to frontend models (e.g. ISO strings to local dates); components never see DTOs.
- [ ] **Dev proxy** — the dev server proxies `/api` to the local API; the production base URL comes from `environment` files.
- [ ] **Auth interceptor** — adds `Authorization: Bearer <token>` only to TaskFlow API requests.
- [ ] **Error interceptor** — converts `ProblemDetails` into a typed `ApiError` (`status`, `code`, field `errors`); `401` triggers logout.
- [ ] **Validation errors** — `ValidationProblemDetails.errors` keys are PascalCase (`Title`); map them to form control names (`title`).
- [ ] **Error codes** — logic branches on `extensions.code` (e.g. `task.status_transition_invalid`), never on message text.
- [ ] **Pagination** — `pageSize` is at most 20.

### Forms

- [ ] Typed Reactive Forms (`FormGroup<...>`, `nonNullable` controls).
- [ ] Client validators mirror the API rules (title 3–200, description ≤ 2000, password ≥ 8, due date not in the past when changed).
- [ ] Server validation errors are applied to the matching controls.

### Dates

- [ ] Native `Date` and `Intl` only, isolated in a tested utility in `shared/utils`.
- [ ] Due date sent as 23:59:59 local, converted to UTC; displayed as `dd/MM/yyyy` local.

### Styling and theming

- [ ] Palette and semantic colors defined once as CSS custom properties per theme; Tailwind utilities consume the tokens. No raw hex colors in templates.
- [ ] Dark theme via a class on `<html>`, initialized before Angular boots from `localStorage` or `prefers-color-scheme` (no flash of the wrong theme).
- [ ] Contrast rule: accent text and icons in the dark theme use the `#c179b9` token.
- [ ] Red only for danger, errors and overdue; always with an icon and text.

### Accessibility

- [ ] Every interactive element is reachable and operable by keyboard, with visible focus.
- [ ] Form controls have labels; errors are linked with `aria-describedby`.
- [ ] Dialogs use CDK focus trap and restore focus on close.
- [ ] Every drag-and-drop action has a keyboard alternative.
- [ ] axe-core finds no violations on the main screens, in both themes.

### Testing

- [ ] **Unit (Vitest + Angular Testing Library)** — required for stores, utilities, interceptors, guards, mappers, and components with logic. No numeric coverage target.
- [ ] **Unit tests are isolated** — no real HTTP; use `provideHttpClientTesting`.
- [ ] **E2E against the real API** — main flows (register, login, create, edit, move, delete, logout); each test creates its own user with a unique e-mail.
- [ ] **E2E with mocked network** — edge cases hard to reproduce for real (`409`, `500`, expired session, long lists); mocks follow the generated contract.
- [ ] **Accessibility checks** — `@axe-core/playwright` on each main screen in both themes.

### Code quality

- [ ] TypeScript `strict` plus Angular strict templates.
- [ ] angular-eslint and Prettier with no warnings in CI.
- [ ] No `any`; prefer `unknown` and narrowing.
- [ ] Comments only for constraints the code cannot show.

### Git

- [ ] Feature branches from `dev`, PR to `dev`. Promotion `dev` → `main` is a manual PR by the maintainer.
- [ ] Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`).
- [ ] lint-staged runs ESLint and Prettier on staged files at pre-commit.

---

## Phase 1 — Setup

- [x] Node 24 LTS installed.
- [x] `dev` branch created.
- [x] Angular 22 workspace (zoneless, strict, no SSR, Vitest).
- [x] Tailwind v4, design tokens and theme bootstrap.
- [x] angular-eslint, Prettier, lint-staged.
- [x] `@lucide/angular`, Angular CDK.
- [x] Logo assets: originals stay in `docs/design/`; the app gets versions resized to their display size (1x and 2x), as WebP with PNG fallback. The symbol is cropped from the full logo to produce the favicon and the mobile header icon.
- [x] Dev proxy to the local API.
- [x] `api-contract/openapi.json` snapshot, `api-contract/API_REF`, and the npm script that refreshes the snapshot and regenerates the types.
- [x] Playwright with Chromium desktop and Chromium mobile projects, and `@axe-core/playwright`.
- [x] CI workflow (see below).

## CI (GitHub Actions)

- [x] **On PR to `dev` and to `main`:** install, lint, unit tests, build, E2E (Chromium desktop and mobile).
- [x] **E2E API:** checkout `task-flow-api` at the ref in `api-contract/API_REF`; `docker compose up taskflow.api` (API, MongoDB, Redis). The API compose file publishes port `8080` and defaults `ASPNETCORE_ENVIRONMENT` to Development. Wait for `GET /health/live`.
- [x] **Manual workflow:** E2E on Firefox and WebKit against `dev`, started with `workflow_dispatch`.
- [x] No secrets in workflows.

## Phase Specs

Each phase is implemented step by step from its spec in [specs/](specs/README.md):

- [Phase 1 — Setup](specs/phase-1-setup.md)
- [Phase 2 — Authentication](specs/phase-2-authentication.md)
- [Phase 3 — Shell](specs/phase-3-shell.md)
- [Phase 4 — Board](specs/phase-4-board.md)
- [Phase 5 — Task dialog](specs/phase-5-task-dialog.md)
- [Phase 6 — Status changes](specs/phase-6-status-changes.md)

Add a checklist here at the end of each phase, as its definition of done requires.

---

## Document History

- **2026-11-17:** Phase 1 and CI checkboxes ticked. CI uses the API `docker-compose.yml` as-is. Cross-browser E2E is manual only.
- **2026-11-16:** Links to the phase specs in `specs/`.
- **2026-11-13:** Logo asset preparation added to Phase 1.
- **2026-11-12:** Initial guidelines from the architecture decisions.
