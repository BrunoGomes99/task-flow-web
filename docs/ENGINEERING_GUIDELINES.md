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

- [x] **Generated contract** — DTO types come from `openapi-typescript`; they are never edited by hand.
- [x] **Mapping layer** — API services map DTOs to frontend models (e.g. ISO strings to local dates); components never see DTOs.
- [x] **Dev proxy** — the dev server proxies `/api` to the local API; the production base URL comes from `environment` files.
- [x] **Auth interceptor** — adds `Authorization: Bearer <token>` only to TaskFlow API requests.
- [x] **Error interceptor** — converts `ProblemDetails` into a typed `ApiError` (`status`, `code`, field `errors`); `401` triggers logout.
- [x] **Validation errors** — `ValidationProblemDetails.errors` keys are PascalCase (`Title`); map them to form control names (`title`).
- [x] **Error codes** — logic branches on `extensions.code` (e.g. `task.status_transition_invalid`), never on message text.
- [ ] **Pagination** — `pageSize` is at most 20.

### Forms

- [x] Typed Reactive Forms (`FormGroup<...>`, `nonNullable` controls).
- [ ] Client validators mirror the API rules (title 3–200, description ≤ 2000, password ≥ 8, due date not in the past when changed).
- [x] Server validation errors are applied to the matching controls.

### Dates

- [ ] Native `Date` and `Intl` only, isolated in a tested utility in `shared/utils`.
- [ ] Due date sent as 23:59:59 local, converted to UTC; displayed as `dd/MM/yyyy` local.

### Styling and theming

- [x] Palette and semantic colors defined once as CSS custom properties per theme; Tailwind utilities consume the tokens. No raw hex colors in templates.
- [x] Dark theme via a class on `<html>`, initialized before Angular boots from `localStorage` or `prefers-color-scheme` (no flash of the wrong theme).
- [x] Contrast rule: accent text and icons in the dark theme use the `#c179b9` token.
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

## Phase 2 — Authentication

- [x] `ApiError` and the error interceptor. PascalCase validation keys become camelCase control names.
- [x] Auth API service and mappers. Components and the session store do not import auth DTOs.
- [x] Session store. `taskflow.session` holds `{ accessToken, expiresAt }`. The profile is reloaded from `GET /api/users/me`. Logout runs at `expiresAt` and on a `401` whose request carried the token.
- [x] Auth interceptor. The bearer token is sent only to the TaskFlow API.
- [x] Login `401` stays a form error ("E-mail ou senha inválidos.").
- [x] `authGuard` and `guestGuard`. Lazy `/login`, `/register` and a placeholder `/tasks`.
- [x] Register and login use typed Reactive Forms. Password is at least 8 characters. Server field errors are applied to the matching controls. Notices travel in the navigation state (`registered`, `sessionExpired`).
- [x] Button, form field, alert and auth card. No "Preencher dados de teste" button.
- [x] E2E against the real API for register and login, each with a unique e-mail. Mocked network for the expired session and the guards. Axe on `/login` and `/register` in both themes.
- [x] Dark secondary text uses `#e2c2c6`, the palette text color that meets WCAG AA on the `#502274` surface.

## Phase 3 — Shell

- [x] Theme store. The initial theme is the `dark` class set by `index.html`. `toggle()` flips the class and saves `taskflow.theme`. Until the user chooses, `prefers-color-scheme` is followed. The toggle sits on the auth screens and in the header, labeled "Ativar tema escuro" / "Ativar tema claro". No toast on toggle.
- [x] Toast store and outlet in the app root. Success toasts dismiss after 4 seconds, error toasts after 8, at most 3 visible. Success uses `aria-live="polite"`; errors use `role="alert"`.
- [x] `SKIP_ERROR_TOAST`. The error interceptor toasts "Não foi possível conectar ao servidor." for status `0` and "Ocorreu um erro inesperado. Tente novamente." for `5xx`. `4xx` stays with the caller.
- [x] Login shows "Bem-vindo(a) de volta, {nome}!".
- [x] `/tasks` renders in the shell (`authGuard`, lazy tasks routes). Landmarks: `aside`, `header`, `main`.
- [x] Sidebar: wordmark, WORKSPACE badge, user card (avatar, name, e-mail) and "Sair da Conta" (`SessionStore.logout('user')`, back to `/login` with no expired notice). Initials come from the first and last names.
- [x] `SummaryStore` in `core/task-summary/`. `GET /api/tasks/summary`. `load()` resets and loads; `refresh()` keeps the current numbers. The shell calls `load()` when it is created. "Suas Tarefas" and "Resumo Geral" show a skeleton while loading and "Não foi possível carregar o resumo" on error.
- [x] Below `lg`, the sidebar is a drawer opened from the header. It traps focus, closes with Escape, a backdrop click and navigation, and returns focus to the menu button. Small screens show the symbol next to the title.
- [x] E2E against the real API for the welcome toast, zero counts, theme persistence and logout. Mocked network for a large summary and a `500`. Axe on the shell (desktop, and mobile with the drawer open) and on the auth screens with the toggle, in both themes.

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

- **2026-11-24:** Phase 3 checklist added. Theming boxes ticked. Red-only, dialogs and the full E2E flows stay open.
- **2026-11-23:** Phase 2 checklist added. API integration and forms boxes ticked where the auth work made them true. Pagination and the task field validators stay open.
- **2026-11-17:** Phase 1 and CI checkboxes ticked. CI uses the API `docker-compose.yml` as-is. Cross-browser E2E is manual only.
- **2026-11-16:** Links to the phase specs in `specs/`.
- **2026-11-13:** Logo asset preparation added to Phase 1.
- **2026-11-12:** Initial guidelines from the architecture decisions.
