# Phase 3 — Shell

> **Development happens in steps.** Implement one step at a time, following the [step protocol](README.md#step-protocol): explain the concept, implement only the step, verify, summarize what was done, commit, and stop for review before the next step.

## Goal

The authenticated layout around the board: sidebar with user card, summary and logout; header with theme toggle; collapsible sidebar on small screens; toasts; and the theme toggle on the auth screens. After this phase, the only missing piece of the logged-in screen is the board itself.

## References

- [PROJECT_SPEC.md](../PROJECT_SPEC.md): sections 4.1.2 (welcome toast), 4.1.6 (logout), 4.8 (sidebar), 4.9 (theme), 4.10 (feedback), 6 (visual identity).
- [ARCHITECTURE.md](../ARCHITECTURE.md): sections 3 (components), 4 (state), 7 (theming).
- ADRs: [0001](../adr/0001-signal-stores-without-state-library.md), [0002](../adr/0002-cdk-and-own-components-with-tailwind.md), [0003](../adr/0003-board-loads-each-column-independently.md) (summary versus column counters).
- Prototype screenshots in [design/](../design/) (`dashboard-*`), as visual reference only.

## Out of Scope

- Board columns, filters and cards ([Phase 4](phase-4-board.md)).
- The "Nova Tarefa" button, which belongs to the board page ([Phase 5](phase-5-task-dialog.md)).

## Prerequisites

- Phase 2 merged into `dev`: `SessionStore`, guards, interceptors, auth pages, base UI components.

**Branch:** `feat/phase-3-shell`, from `dev`.

## Decisions for This Phase

- **`SummaryStore` lives in `core/task-summary/`**, together with its API call. It is root-scoped state read by the sidebar (in `core/layout/`) and refreshed by the board (in `features/tasks/`), so it cannot live in a feature: `core` must not import `features`.
- **Global error toasts:** the error interceptor shows a generic error toast for network errors (`status 0`) and `5xx`. A request can opt out with the `SKIP_ERROR_TOAST` `HttpContextToken` when its caller shows a more specific message (used in Phases 5 and 6). `4xx` errors are always handled by the caller.

---

## Steps

### 3.1 — Theme store and toggle

**Goal:** the user can switch between light and dark, and the choice persists ([PROJECT_SPEC 4.9](../PROJECT_SPEC.md#49-theme)).

**Concepts to explain:** a root store wrapping a browser API (`localStorage`, `matchMedia`) behind an injectable (compare with wrapping `DateTime.Now` behind an interface); `effect()` for side effects that cannot be derived; `DOCUMENT` injection.

**Deliverables:**
- `src/app/core/theme/theme-store.ts`: reads the initial theme from the `dark` class already set by the `index.html` script; `toggle()` flips it, updates the class on `<html>`, and saves `taskflow.theme`. Until the user chooses, a change of `prefers-color-scheme` is followed.
- `src/app/core/theme/theme-toggle/`: icon button (Lucide `Sun` / `Moon`) with an accessible label that states the action ("Ativar tema escuro" / "Ativar tema claro"). No toast on toggle.
- Toggle placed on the auth card (top right of the card or page).

**Acceptance criteria:**
- The toggled theme survives a reload, with no flash.
- With no saved choice, the app follows the OS setting.

**Tests:** `theme-store.spec.ts` (initial value, toggle persists, OS change followed only without saved choice); `theme-toggle.spec.ts` (label changes).

**Commit:** `feat(theme): add theme store and toggle`

---

### 3.2 — Toasts

**Goal:** success and error feedback per [PROJECT_SPEC 4.10](../PROJECT_SPEC.md#410-feedback), and the welcome toast after login.

**Concepts to explain:** a root store driving a component rendered once in the app root; `aria-live` regions; `HttpContextToken` to pass per-request options to interceptors (compare with `HttpRequestMessage.Options`).

**Deliverables:**
- `src/app/core/notifications/toast-store.ts`: `success(message)`, `error(message)`, `dismiss(id)`; success toasts auto-dismiss after 4 seconds, error toasts after 8 seconds; at most 3 visible (oldest removed first).
- `src/app/shared/ui/toast/`: presentational toast (icon, text, close button). Error toasts use the danger token with an icon.
- `src/app/core/notifications/toast-outlet/`: renders the store's toasts, placed in `app.html`; `aria-live="polite"` for success, `role="alert"` for errors.
- `SKIP_ERROR_TOAST` context token; the error interceptor shows "Não foi possível conectar ao servidor." for `status 0` and "Ocorreu um erro inesperado. Tente novamente." for `5xx`, unless the token is set.
- Login page shows "Bem-vindo(a) de volta, {nome}!" after a successful login.

**Acceptance criteria:**
- Toasts can be closed by keyboard.
- Wrong credentials still show only the inline message (no toast).

**Tests:** `toast-store.spec.ts` (fake timers, limit); `toast-outlet.spec.ts`; extend `error-interceptor.spec.ts` (toast on `0` / `5xx`, skipped with the token, none on `4xx`); extend `login-page.spec.ts` (welcome toast).

**Commit:** `feat(notifications): add toast store, outlet and welcome toast`

---

### 3.3 — Shell layout and header

**Goal:** `/tasks` renders inside a shell with sidebar and header.

**Concepts to explain:** layout routes with `children` (compare with a Razor `_Layout` and `@RenderBody()`); where the shell sits in the dependency rules (it is `core`, and loads the feature through the route table, never by import).

**Deliverables:**
- `src/app/core/layout/shell/`: grid with sidebar and main area; main area has the header and a `<router-outlet />`.
- `src/app/core/layout/header/`: page title "Quadro de Tarefas", theme toggle, and a menu button slot used in step 3.6.
- `app.routes.ts`: `/tasks` uses the shell component with `authGuard`, and lazy-loads the tasks feature routes as children.
- Sidebar placeholder (filled in steps 3.4 and 3.5).

**Acceptance criteria:**
- The placeholder board page from Phase 2 renders inside the shell.
- Landmarks: `<aside>` (sidebar), `<header>`, `<main>`.

**Tests:** `shell.spec.ts` (renders header and outlet).

**Commit:** `feat(layout): add shell layout and header`

---

### 3.4 — Sidebar: brand, user card and logout

**Goal:** the sidebar per [PROJECT_SPEC 4.8](../PROJECT_SPEC.md#48-sidebar), items 1, 2 and 4.

**Concepts to explain:** a smart container (the sidebar injects `SessionStore`) composed of presentational pieces; `computed` for derived values such as initials.

**Deliverables:**
- `src/app/shared/ui/avatar/`: initials in a circle (input `initials`, decorative for screen readers when the name is next to it).
- `src/app/core/layout/sidebar/`: wordmark at the top (`<picture>` from step 1.5) with the "WORKSPACE" badge below; user card with avatar, name and e-mail; "Sair da Conta" button in a neutral tone with a Lucide `LogOut` icon, calling `SessionStore.logout('user')`.
- Logout from the button returns to `/login` with no expired notice.

**Wordmark legibility:** check the wordmark on the dark sidebar (`#502274`). If it is not legible, stop and discuss the fix with the user before applying it ([PROJECT_SPEC section 6](../PROJECT_SPEC.md#6-visual-identity)).

**Acceptance criteria:**
- Initials come from the first and last names ("Bruno Gomes" gives "BG"; a single name gives one letter).

**Tests:** `avatar.spec.ts`; `sidebar.spec.ts` (name, e-mail, initials, logout calls the store); a utility test for the initials function if it lives in `shared/utils`.

**Commit:** `feat(layout): add sidebar with brand, user card and logout`

---

### 3.5 — Summary store and "Resumo Geral"

**Goal:** the unfiltered count per status and the total "Suas Tarefas" ([PROJECT_SPEC 4.8](../PROJECT_SPEC.md#48-sidebar), item 3).

**Concepts to explain:** a store with a `load()` command and a loading state; why the summary and the column counters can differ ([ADR 0003](../adr/0003-board-loads-each-column-independently.md)).

**Deliverables:**
- `src/app/core/task-summary/task-summary-api.ts`: `GET /api/tasks/summary`, mapped to `TaskSummary { pending, inProgress, completed, total }`.
- `src/app/core/task-summary/summary-store.ts`: state `{ summary, loading, error }`; commands `load()` (resets and loads) and `refresh()` (reloads without clearing the current numbers, used after board changes in Phases 5 and 6).
- The shell calls `load()` when it is created, so a new login never shows the previous user's numbers.
- Sidebar: "Suas Tarefas" with the total in the user card; "Resumo Geral" with one row per status (label, status color token, count). While loading, numbers show a skeleton; on error, a short muted text "Não foi possível carregar o resumo".

**Acceptance criteria:**
- A new user sees 0 in every status and in the total.

**Tests:** `task-summary-api.spec.ts`; `summary-store.spec.ts` (load, refresh keeps values, error); extend `sidebar.spec.ts`.

**Commit:** `feat(summary): add summary store and sidebar overview`

---

### 3.6 — Collapsible sidebar and mobile header

**Goal:** usable on tablet and phone ([PROJECT_SPEC 4.8.5](../PROJECT_SPEC.md#48-sidebar) and section 5).

**Concepts to explain:** local UI state in a component (a `signal` in the shell, not a store); CDK `A11yModule` (`cdkTrapFocus`) and focus restore; responsive Tailwind variants.

**Deliverables:**
- Below the `lg` breakpoint, the sidebar is hidden and opens as a drawer over the content from the header menu button (Lucide `Menu`, `aria-expanded`, `aria-controls`).
- The drawer traps focus, closes with `Escape`, with a backdrop click, and after navigation, and returns focus to the menu button.
- On small screens the header shows the symbol icon (step 1.5) next to the title.

**Acceptance criteria:**
- At 390 px width, the board area uses the full width and the drawer is fully operable by keyboard.

**Tests:** extend `shell.spec.ts` (open, close on `Escape`, focus returns).

**Commit:** `feat(layout): add collapsible sidebar and mobile header`

---

### 3.7 — E2E and accessibility

**Goal:** the shell is covered end to end, in both themes.

**Deliverables:**
- `e2e/real/shell.spec.ts`: register and log in a unique user; welcome toast shows the name; the sidebar shows name, e-mail and zero counts; the theme toggle persists after reload; "Sair da Conta" returns to `/login` and `/tasks` is no longer reachable.
- `e2e/mocked/shell.spec.ts`: summary with large numbers renders; a `500` on the summary shows the muted error text and the global error toast.
- Axe on the shell (desktop, and mobile with the drawer open) and on the auth screens with the toggle, in both themes.

**Acceptance criteria:**
- `npm run e2e` passes on both Chromium projects.

**Commit:** `test(e2e): cover shell, theme and logout`

---

## Definition of Done

- [x] All steps committed and reviewed.
- [x] Lint, unit tests, build and E2E pass locally.
- [ ] CI green on the PR to `dev`.
- [x] `ARCHITECTURE.md` reflects `core/task-summary/`, the toast policy (`SKIP_ERROR_TOAST`) and the shell routing.
- [x] `ENGINEERING_GUIDELINES.md`: Phase 3 checklist added; theming boxes ticked.
- [ ] Wordmark legibility on the dark sidebar confirmed with the user.
- [x] No new ADR. `SummaryStore` in `core/task-summary/` and `SKIP_ERROR_TOAST` are recorded in this spec and in [ARCHITECTURE.md](../ARCHITECTURE.md). Summary versus column counters stays in [ADR 0003](../adr/0003-board-loads-each-column-independently.md).
