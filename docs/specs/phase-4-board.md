# Phase 4 — Board

> **Development happens in steps.** Implement one step at a time, following the [step protocol](README.md#step-protocol): explain the concept, implement only the step, verify, summarize what was done, commit, and stop for review before the next step.

## Goal

The read side of the board: three columns that load independently with infinite scroll, task cards with due date badges, and filters and sorting kept in the URL. Creating, editing, deleting and moving tasks come in Phases 5 and 6.

## References

- [PROJECT_SPEC.md](../PROJECT_SPEC.md): sections 2 (terminology), 3.3 (due date semantics), 4.2 (board), 4.3 (filters and sorting), 4.4 (task card).
- [ARCHITECTURE.md](../ARCHITECTURE.md): section 4 (state and board data flow).
- ADRs: [0003](../adr/0003-board-loads-each-column-independently.md), [0004](../adr/0004-url-is-the-source-of-truth-for-board-filters.md), [0005](../adr/0005-due-date-as-local-end-of-day.md).

## Out of Scope

- Card actions (edit, delete, quick moves, lock behavior on drag) and opening the dialog: [Phase 5](phase-5-task-dialog.md) and [Phase 6](phase-6-status-changes.md). The card is display-only in this phase.

## Prerequisites

- Phase 3 merged into `dev`: shell, toasts, `SummaryStore`.

**Branch:** `feat/phase-4-board`, from `dev`.

## Decisions for This Phase

- **Due date in the model:** `Task.dueAt` is a `Date | null` holding the instant returned by the API. Display and overdue checks derive the local calendar date from it. Phase 5 sends the same instant back when the user did not change the date, because the API only re-validates a due date that changed (Phase 0, D5).
- **Query parameters** (`title`, `description`, `status`, `order`): default values are omitted from the URL (`status` is omitted when all three are visible; `order` is omitted when `asc`). Invalid values are normalized by replacing the URL (`replaceUrl: true`), as [ADR 0004](../adr/0004-url-is-the-source-of-truth-for-board-filters.md) requires.
- **Text filters:** typing updates the URL with `replaceUrl: true`, so the browser history is not filled with one entry per keystroke. The store debounces reloads by 300 ms and cancels outdated requests with `switchMap`.
- **Layout:** on desktop, three columns side by side, each scrolling on its own and filling the viewport height. Below the `md` breakpoint, columns sit in a horizontal scroll container with snap, each about 85% of the viewport wide.

---

## Steps

### 4.1 — Task models and date utilities

**Goal:** the frontend task model and the tested date rules.

**Concepts to explain:** TypeScript union types for enums (compare with C# `enum`); readonly interfaces as immutable records; why dates are isolated in pure functions (compare with `DateOnly` and `TimeZoneInfo` helpers).

**Deliverables:**
- `src/app/features/tasks/models/task.ts`: `TaskStatus = 'pending' | 'inProgress' | 'completed'`, `TASK_STATUSES` in board order, `TASK_STATUS_LABELS` ("Pendente", "Em Andamento", "Concluída"), and `Task { id, title, description, status, dueAt: Date | null, createdAt, updatedAt }`.
- `src/app/features/tasks/models/board-filters.ts`: `BoardFilters { title, description, statuses: TaskStatus[], order: 'asc' | 'desc' }` and `DEFAULT_BOARD_FILTERS`.
- `src/app/shared/utils/date.ts`, using only native `Date` and `Intl`:
  - `formatDateBr(date)`: `dd/MM/yyyy` in local time.
  - `toLocalDateString(date)` and `parseLocalDateString(value)`: `yyyy-MM-dd` for `<input type="date">`.
  - `endOfLocalDay(localDate)`: 23:59:59.000 local, as a `Date` (serialized with `toISOString()` gives the UTC value, [ADR 0005](../adr/0005-due-date-as-local-end-of-day.md)).
  - `isBeforeToday(localDate, now)`: true only for dates before the local today.
  - `isOverdue(dueAt, now)`: true when the local calendar date of `dueAt` is before the local today.

**Acceptance criteria:**
- A task due "today" is not overdue; it becomes overdue on the next local day.

**Tests:** `date.spec.ts` covering local midnight boundaries, end-of-day conversion, and formatting. Tests set a fixed time zone (`TZ=America/Sao_Paulo` in the Vitest config) and a fixed `now`.

**Commit:** `feat(tasks): add task models and date utilities`

---

### 4.2 — Tasks API: list

**Goal:** fetch one page of one column.

**Concepts to explain:** `HttpParams`; mapping a paged DTO to a model; why the status filter of the board is not sent to the API ([ADR 0003](../adr/0003-board-loads-each-column-independently.md)).

**Deliverables:**
- `src/app/features/tasks/data-access/tasks-api.ts`: `list({ status, page, title, description, order })` calling `GET /api/tasks` with `pageNumber`, `pageSize = 20`, `status`, `titleContains` and `descriptionContains` (only when not empty), and `dueDateOrder` (`ascending` / `descending`). Returns `TaskPage { items: Task[], totalCount, pageNumber }`.
- `src/app/features/tasks/data-access/task-mappers.ts`: `TaskDto` to `Task` (ISO strings to `Date`, `null` description to an empty string).

**Acceptance criteria:**
- `pageSize` is never above 20.

**Tests:** `tasks-api.spec.ts` (query parameters, omitted empty filters); `task-mappers.spec.ts`.

**Commit:** `feat(tasks): add tasks API list and mappers`

---

### 4.3 — Filters in the URL

**Goal:** convert between query parameters and `BoardFilters`, both ways.

**Concepts to explain:** `ActivatedRoute.queryParamMap` and `toSignal` (compare with `[FromQuery]` binding); pure functions as the testable core of URL handling.

**Deliverables:**
- `src/app/features/tasks/data-access/board-query-params.ts`:
  - `parseBoardFilters(params)`: trims text; `status` is a comma-separated list, unknown values dropped, empty result means all; `order` other than `asc` / `desc` means `asc`. Also returns whether the input needed normalization.
  - `toBoardQueryParams(filters)`: omits defaults, keeps status order as on the board.

**Acceptance criteria:**
- `?status=completed,foo&order=sideways` parses to `statuses: ['completed']`, `order: 'asc'`, and is flagged for normalization.

**Tests:** `board-query-params.spec.ts` (round trip, defaults, invalid input).

**Commit:** `feat(tasks): parse and serialize board filters from the URL`

---

### 4.4 — Board store

**Goal:** per-column state with pagination, driven by the filters.

**Concepts to explain:** a store scoped to a route with route `providers` (compare with a scoped service per request); `toObservable` to bridge a signal into RxJS; `debounceTime`, `distinctUntilChanged`, `switchMap`; `takeUntilDestroyed`.

**Deliverables:**
- `src/app/features/tasks/data-access/board-store.ts`, provided in the board route:
  - state per status: `items`, `totalCount`, `loadedPages`, `loading`, `loadingMore`, `error`;
  - reads: `columns` (only the visible statuses, in board order, each with `hasMore = items.length < totalCount`), `filters`;
  - `connect(filters: Signal<BoardFilters>)`: called once by the board page; every filter change (debounced 300 ms, compared by value) resets and reloads page 1 of every visible column, cancelling outdated requests;
  - `loadNextPage(status)`: ignored while that column is loading or has no more items; appended items are de-duplicated by `id`;
  - `retry(status)`: reloads a column after an error.
- The store never writes filters; it only reads the signal it was given.

**Acceptance criteria:**
- Hiding a column through the status filter stops loading it; showing it again loads page 1.
- A slow response for old filters never overwrites the result for new filters.

**Tests:** `board-store.spec.ts` with a mocked `TasksApi` and fake timers: initial load of three columns, debounce, cancellation, next page, de-duplication, error and retry.

**Commit:** `feat(tasks): add board store with per-column pagination`

---

### 4.5 — Column and card components

**Goal:** presentational column and card ([PROJECT_SPEC 4.2](../PROJECT_SPEC.md#42-board) and [4.4](../PROJECT_SPEC.md#44-task-card)).

**Concepts to explain:** presentational components with signal inputs and `computed`; `@for` with `track`; tooltips with the CDK overlay.

**Deliverables:**
- `src/app/shared/ui/tooltip/`: directive on a focusable trigger, shown on hover and focus, linked with `aria-describedby`.
- `src/app/shared/ui/badge/`: small label with variants (neutral, status, danger).
- `src/app/features/tasks/components/task-card/`: title, description preview (3 lines max), due date badge: `dd/MM/yyyy`, "Sem prazo", or the date with "(Atrasada)" in the danger tone with an icon. Completed cards show a lock icon with the accessible text "Concluída (Travada)". Input `now` so overdue is testable.
- `src/app/features/tasks/components/board-column/`: header with status label, status color and count; the Completed header has an info icon with the tooltip "Tarefas concluídas ficam travadas e não podem ser editadas nem movidas."; list (`role="list"`); empty state "Nenhuma tarefa nesta coluna"; loading skeleton; error state with "Tentar novamente" (output `retry`); a bottom sentinel slot used in step 4.6.

**Acceptance criteria:**
- Overdue only applies to non-completed tasks.

**Tests:** `task-card.spec.ts` (three badge states, completed lock, overdue ignored for completed); `board-column.spec.ts` (count, empty, error and retry output); `tooltip.spec.ts` (shows on focus).

**Commit:** `feat(tasks): add board column and task card components`

---

### 4.6 — Infinite scroll

**Goal:** each column loads its next page when its bottom becomes visible.

**Concepts to explain:** attribute directives (compare with tag helpers that add behavior); `IntersectionObserver` with the column as `root`; cleaning up with `DestroyRef`.

**Deliverables:**
- `src/app/shared/ui/infinite-scroll/`: directive placed on a sentinel at the end of a scroll container; emits `reached` when the sentinel enters the container, with a small `rootMargin`. Disabled through an input while loading or when there is nothing more to load.
- `BoardColumn` emits `loadMore`; a "Carregando mais..." indicator while loading the next page.

**Acceptance criteria:**
- Scrolling a column with 45 tasks loads three pages and stops.
- Scrolling one column does not load the others.

**Tests:** `infinite-scroll.spec.ts` with a mocked `IntersectionObserver`.

**Commit:** `feat(ui): add infinite scroll directive for board columns`

---

### 4.7 — Filters bar and multi-select

**Goal:** the controls of [PROJECT_SPEC 4.3](../PROJECT_SPEC.md#43-filters-and-sorting).

**Concepts to explain:** `model()` and two-way binding versus `input()` plus `output()`; keeping an input's text stable while its value comes back from the URL; CDK `Listbox` and overlay for an accessible multi-select.

**Deliverables:**
- `src/app/shared/ui/multi-select/`: button that opens a listbox with checkboxes; keyboard navigation; the last selected option is disabled with the hint "Pelo menos um status deve ficar visível".
- `src/app/features/tasks/components/filters-bar/`: "Filtrar por título" and "Filtrar por descrição" text inputs with a clear button; status multi-select ("Colunas visíveis"); due date order select "Vencimento: Crescente" / "Vencimento: Decrescente". Input `filters`, output `filtersChange`.
- Responsive: on small screens the filters wrap or collapse behind a "Filtros" toggle.

**Acceptance criteria:**
- The last selected status cannot be unselected, by mouse or keyboard.

**Tests:** `multi-select.spec.ts` (keyboard, last option disabled); `filters-bar.spec.ts` (emits changes, clear buttons).

**Commit:** `feat(tasks): add filters bar and multi-select`

---

### 4.8 — Board page

**Goal:** the real `/tasks` page replaces the placeholder.

**Concepts to explain:** a smart page as the orchestrator (compare with a controller action): it reads the route, talks to the store, and passes data down; `Router.navigate` with `queryParams` and `replaceUrl`.

**Deliverables:**
- `src/app/features/tasks/pages/board-page/`: provides `BoardStore`, derives `filters` from the query parameters, normalizes invalid URLs with `replaceUrl`, calls `store.connect(filters)`, renders `FiltersBar` and one `BoardColumn` per visible status, and navigates on `filtersChange` (text changes with `replaceUrl: true`).
- Layout from the decisions above.

**Acceptance criteria:**
- Reloading `/tasks?title=abc&status=pending,inProgress&order=desc` restores the same filters and columns.
- Back and forward navigate between filter states set by the status and order controls.

**Tests:** `board-page.spec.ts` with `RouterTestingHarness` and a mocked `TasksApi`: renders columns from the URL, normalizes invalid parameters, navigates on filter change.

**Commit:** `feat(tasks): add board page with URL-driven filters`

---

### 4.9 — E2E and accessibility

**Goal:** the board is covered end to end.

**Deliverables:**
- `e2e/support/api.ts`: helper that registers a unique user, logs in, creates tasks and changes statuses through the REST API, and stores the session in `localStorage` before the page loads (task creation in the UI only arrives in Phase 5).
- `e2e/real/board.spec.ts`: tasks appear in their columns; tasks without due date are last in both orders; title and description filters combine with AND; filters survive reload; the status filter hides columns; counters match the totals.
- `e2e/mocked/board.spec.ts`: 45 tasks in one column load in three pages; empty columns; overdue badge (a past due date cannot be created through the API); a `500` on one column shows its error state and retry.
- Axe on the board in both themes, desktop and mobile.

**Acceptance criteria:**
- `npm run e2e` passes on both Chromium projects.

**Commit:** `test(e2e): cover board loading, filters and infinite scroll`

---

## Definition of Done

- [ ] All steps committed and reviewed.
- [ ] Lint, unit tests, build and E2E pass; CI green on the PR to `dev`.
- [ ] `ARCHITECTURE.md` board data flow matches the implementation (where debounce happens, `connect(filters)`, URL normalization).
- [ ] `ENGINEERING_GUIDELINES.md`: Phase 4 checklist added; dates boxes ticked.
- [ ] New ADR if a hard-to-reverse decision was made.
