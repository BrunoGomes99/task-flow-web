# Phase 2 — Authentication

> **Development happens in steps.** Implement one step at a time, following the [step protocol](README.md#step-protocol): explain the concept, implement only the step, verify, summarize what was done, commit, and stop for review before the next step.

## Goal

Users can register, log in, stay logged in across reloads, and are logged out when the token expires or the API answers `401`. Guests and logged users are kept on the right routes. The HTTP error pipeline used by every later phase is built here.

## References

- [PROJECT_SPEC.md](../PROJECT_SPEC.md): section 4.1 (authentication), 4.10 (feedback).
- [ARCHITECTURE.md](../ARCHITECTURE.md): sections 5 (HTTP and authentication) and 6 (routing).
- [ENGINEERING_GUIDELINES.md](../ENGINEERING_GUIDELINES.md): API integration, forms, accessibility.
- ADRs: [0007](../adr/0007-jwt-in-local-storage-without-refresh.md).
- API contract: [README.md](README.md#api-contract-reference).

## Out of Scope

- Welcome toast after login, theme toggle on the auth screens, and the logout button: they depend on the toast store, the theme store and the sidebar, built in [Phase 3](phase-3-shell.md). Phase 3 wires them into the screens built here.
- The real board: `/tasks` renders a placeholder page in this phase.

## Prerequisites

- Phase 1 merged into `dev`: generated API types, `API_BASE_URL`, test runners, Playwright and CI.

**Branch:** `feat/phase-2-authentication`, from `dev`.

## Decisions for This Phase

- **Notices between routes** ("Conta criada", "Sessão expirada") travel in the router navigation `state` (`{ authNotice: 'registered' | 'sessionExpired' }`), not in the query string, so a reload or a shared link does not show a stale message.
- **`401` handling:** only a `401` on a request that carried the session token triggers logout. The login endpoint answers `401 auth.invalid_credentials` for wrong credentials; that is a form error, not an expired session.
- **Storage key:** `taskflow.session`, holding `{ accessToken, expiresAt }` (`expiresAt` as epoch milliseconds). The profile is not stored; it is reloaded from `GET /api/users/me` on startup.

---

## Steps

### 2.1 — `ApiError` and error interceptor

**Goal:** every failed HTTP call reaches services as a typed `ApiError`.

**Concepts to explain:** functional interceptors (compare with `DelegatingHandler` or ASP.NET middleware); `HttpErrorResponse`; narrowing `unknown` with type guards instead of `any`; RxJS `catchError` and `throwError`.

**Deliverables:**
- `src/app/core/api/api-error.ts`: `ApiError` class with `status` (`0` for network errors), `code` (from `extensions.code`, or `'network.unreachable'` / `'server.unexpected_error'` fallbacks), `message` (from `detail` or `title`), and `fieldErrors: Record<string, string[]>` with keys converted from PascalCase to camelCase (`DueDate` to `dueDate`).
- Type guards for `ProblemDetails` and `ValidationProblemDetails` based on the generated types.
- `src/app/core/api/error-interceptor.ts`: converts `HttpErrorResponse` into `ApiError`. Registered with `provideHttpClient(withInterceptors([...]))`.
- `src/app/core/api/error-codes.ts`: constants for the codes used by the app (`auth.invalid_credentials`, `user.email_already_in_use`, `task.not_found`, `task.locked`, `task.status_transition_invalid`, `task.due_date_in_past`, `request.validation_failed`).

**Acceptance criteria:**
- A `409` with `extensions.code = 'user.email_already_in_use'` becomes `ApiError { status: 409, code: 'user.email_already_in_use' }`.
- A `400` validation response with `errors.Title` becomes `fieldErrors.title`.
- A network failure becomes `status: 0`.

**Tests:** `api-error.spec.ts` (parsing, key conversion, fallbacks) and `error-interceptor.spec.ts` with `provideHttpClientTesting`.

**Commit:** `feat(api): add ApiError and error interceptor`

---

### 2.2 — Auth API service

**Goal:** the HTTP calls for register, login and profile, mapped to frontend models.

**Concepts to explain:** services with `@Injectable({ providedIn: 'root' })` (compare with a singleton registration); `inject()`; `Observable` as a lazy `Task` that only runs on `subscribe`; the mapping layer that keeps DTOs out of components.

**Deliverables:**
- `src/app/core/auth/auth-models.ts`: `UserProfile { id, name, email }`, `LoginResult { accessToken, expiresInSeconds }`, `RegisterInput`, `LoginInput`.
- `src/app/core/auth/auth-api.ts`: `register(input)`, `login(input)`, `getProfile()`, using `API_BASE_URL` and the generated DTO types.
- Mapping functions in `src/app/core/auth/auth-mappers.ts`.

**Acceptance criteria:**
- Components and stores never import generated DTO types for auth.

**Tests:** `auth-api.spec.ts` (URLs, bodies, mapping) with `HttpTestingController`; `auth-mappers.spec.ts`.

**Commit:** `feat(auth): add auth API service and mappers`

---

### 2.3 — Session store

**Goal:** one place that knows whether the user is logged in, persists the session, and logs out on expiry.

**Concepts to explain:** the store shape from [ADR 0001](../adr/0001-signal-stores-without-state-library.md): private `signal`, public `computed`, command methods (compare with an application service holding state); `provideAppInitializer` to restore the session before the first navigation (compare with work done in `Program.cs` before `app.Run()`); timers and `DestroyRef`.

**Deliverables:**
- `src/app/core/auth/session-store.ts` with:
  - state: `accessToken`, `expiresAt`, `profile`, `status` (`'anonymous' | 'restoring' | 'authenticated'`);
  - reads: `isAuthenticated`, `profile`, `accessToken`, `initials` (for the avatar in Phase 3);
  - commands: `login(input)` (calls the API, saves `{ accessToken, expiresAt = now + expiresIn * 1000 }`, loads the profile, schedules logout), `restore()` (loads a stored, non-expired session and its profile; discards an expired one), `logout(reason: 'user' | 'expired')`.
- `logout` clears storage and state, cancels the timer, and navigates to `/login`; with reason `expired` it passes `authNotice: 'sessionExpired'` in the navigation state.
- `restore()` registered with `provideAppInitializer`. If the profile request fails with `401`, the session is discarded.
- The logout timer is clamped to the maximum `setTimeout` delay (about 24.8 days); a longer `expiresIn` is re-checked when the timer fires.
- A small `Clock` abstraction (or injected `now()` function) so tests control time.

**Acceptance criteria:**
- A reload with a valid stored session keeps the user logged in.
- A stored session whose `expiresAt` is in the past is removed on startup.
- When `expiresAt` is reached, the user is sent to `/login` with the expired notice.

**Tests:** `session-store.spec.ts` with fake timers: login stores and schedules; restore valid and expired; timer logout; profile `401` on restore discards the session.

**Commit:** `feat(auth): add session store with persistence and expiry`

---

### 2.4 — Auth interceptor and logout on `401`

**Goal:** the token is attached to TaskFlow API requests, and a rejected token ends the session.

**Concepts to explain:** interceptor order (compare with middleware order); cloning immutable `HttpRequest`; why the token is only sent to the API base URL.

**Deliverables:**
- `src/app/core/auth/auth-interceptor.ts`: adds `Authorization: Bearer <token>` only when the request URL starts with the API base (`/api` in development) and a token exists.
- The error interceptor calls `SessionStore.logout('expired')` on a `401` whose request carried the `Authorization` header, and still rethrows the `ApiError`.
- Interceptor order registered in `app.config.ts`: auth, then error.

**Acceptance criteria:**
- Requests to other origins never receive the header.
- A `401` from `POST /api/users/login` does not log out or redirect.

**Tests:** `auth-interceptor.spec.ts` (header present or absent); extend `error-interceptor.spec.ts` (logout on authenticated `401` only).

**Commit:** `feat(auth): add auth interceptor and logout on 401`

---

### 2.5 — Guards and routes

**Goal:** the route table from [ARCHITECTURE.md section 6](../ARCHITECTURE.md#6-routing), with guards.

**Concepts to explain:** functional guards (compare with authorization filters and `[Authorize]` / `[AllowAnonymous]`); `UrlTree` redirects; lazy loading with `loadComponent` / `loadChildren`; `withComponentInputBinding`.

**Deliverables:**
- `src/app/core/auth/auth-guard.ts` (`authGuard`: guests go to `/login`) and `guest-guard.ts` (`guestGuard`: logged users go to `/tasks`).
- `src/app/app.routes.ts`: `/login` and `/register` (guest, lazy), `/tasks` (auth, lazy), empty path redirects to `/tasks`, wildcard redirects to `/tasks`.
- `provideRouter(routes, withComponentInputBinding())`.
- `src/app/features/tasks/pages/board-page/` placeholder with the heading "Quadro de Tarefas" (replaced in Phase 4).
- `src/app/features/auth/auth.routes.ts` with placeholder login and register pages (filled in steps 2.7 and 2.8).

**Acceptance criteria:**
- A guest opening `/tasks` lands on `/login`; a logged user opening `/login` lands on `/tasks`.

**Tests:** `auth-guard.spec.ts` and `guest-guard.spec.ts` with `RouterTestingHarness`.

**Commit:** `feat(auth): add auth and guest guards and lazy routes`

---

### 2.6 — Base UI components and auth card

**Goal:** reusable form building blocks and the shared card for login and register.

**Concepts to explain:** presentational components with `input()` / `output()` (compare with Razor partials with a model); content projection with `<ng-content>`; host bindings; accessible form fields (`<label for>`, `aria-describedby`, `aria-invalid`).

**Deliverables:**
- `src/app/shared/ui/button/`: variants `primary`, `secondary`, `danger`, `ghost`; `loading` input that disables and shows a spinner with an accessible label.
- `src/app/shared/ui/form-field/`: label, projected control, hint, error list linked with `aria-describedby`, optional counter slot (used in Phase 5).
- `src/app/shared/ui/alert/`: inline message with `info` and `danger` variants (icon and text), used for form-level errors and notices.
- `src/app/features/auth/components/auth-card/`: full logo (`<picture>` from step 1.5), subtitle "Gerenciador de Tarefas no estilo Kanban", two tabs "Entrar" and "Criar Conta" as `routerLink`s with `aria-current="page"`, and a content slot.
- Layout of the auth pages centered on the background token, responsive down to phone width.

**Acceptance criteria:**
- Tabs are reachable by keyboard and show visible focus.
- The prototype's "Preencher dados de teste" button is not present.

**Tests:** `button.spec.ts` (loading state, disabled), `form-field.spec.ts` (error linked by `aria-describedby`).

**Commit:** `feat(ui): add button, form field, alert and auth card`

---

### 2.7 — Register page

**Goal:** a user can create an account ([PROJECT_SPEC 4.1.1](../PROJECT_SPEC.md#41-authentication)).

**Concepts to explain:** typed Reactive Forms (`FormGroup<...>`, `nonNullable`) compared with model binding plus FluentValidation; built-in validators; applying server errors to controls.

**Deliverables:**
- `src/app/features/auth/pages/register-page/`: fields "Nome completo", "E-mail", "Senha" (minimum 8 characters).
- `src/app/shared/utils/apply-server-errors.ts`: `applyServerErrors(form, fieldErrors: Record<string, string[]>)` sets the messages as a `server` error on the matching controls and returns the keys that matched no control. It takes a plain record, not `ApiError`, so presentational forms in features can use it without importing `core` (used again in Phase 5).
- On `409 user.email_already_in_use`: inline error on the e-mail field ("Este e-mail já está em uso").
- On `400`: field errors inline; on other errors: form-level danger alert.
- On success: navigate to `/login` with `authNotice: 'registered'`; registration does not log in.
- Submit disabled while the request runs; errors shown after submit or after the field is touched.

**Acceptance criteria:**
- All errors are inline; no toast is used on this page.

**Tests:** `register-page.spec.ts` (validation messages, `409` inline, success navigation) with a mocked `AuthApi`; `apply-server-errors.spec.ts`.

**Commit:** `feat(auth): add register page`

---

### 2.8 — Login page

**Goal:** a user can log in and reach the board ([PROJECT_SPEC 4.1.2](../PROJECT_SPEC.md#41-authentication)).

**Concepts to explain:** reading navigation `state`; a smart page calling a store command and reacting to the result.

**Deliverables:**
- `src/app/features/auth/pages/login-page/`: fields "E-mail" and "Senha".
- Calls `SessionStore.login`; on success navigates to `/tasks`.
- On `401 auth.invalid_credentials`: form-level danger alert "E-mail ou senha inválidos."
- Shows an info alert "Conta criada com sucesso. Faça login para continuar." when `authNotice` is `registered`.

**Acceptance criteria:**
- Wrong credentials show the form-level message and keep the typed e-mail.

**Tests:** `login-page.spec.ts` (invalid credentials alert, success navigation, registered notice).

**Commit:** `feat(auth): add login page`

---

### 2.9 — Session expired notice and E2E

**Goal:** the expired-session path is visible to the user and the auth flows are covered end to end.

**Deliverables:**
- Login page shows an info alert "Sua sessão expirou. Faça login novamente." when `authNotice` is `sessionExpired`.
- `e2e/real/auth.spec.ts`: register a unique user, see the registered notice, log in, reach `/tasks`; reload keeps the session; wrong password shows the inline message; registering the same e-mail twice shows the inline e-mail error.
- `e2e/mocked/session.spec.ts`: a `401` on an authenticated request redirects to `/login` with the expired notice; a session stored with a past `expiresAt` is discarded on load; guards redirect in both directions.
- Axe checks on `/login` and `/register` in both themes (theme set through storage, since the toggle arrives in Phase 3).

**Acceptance criteria:**
- `npm run e2e` passes on both Chromium projects.

**Commit:** `test(e2e): cover authentication flows and expired session`

---

## Definition of Done

- [ ] All steps committed and reviewed.
- [ ] Lint, unit tests, build and E2E pass; CI green on the PR to `dev`.
- [ ] `ARCHITECTURE.md` updated if the auth flow differs from section 5 (for example, the navigation-state notices).
- [ ] `ENGINEERING_GUIDELINES.md`: API integration and forms boxes ticked where now true; Phase 2 checklist added.
- [ ] New ADR if a hard-to-reverse decision was made.
