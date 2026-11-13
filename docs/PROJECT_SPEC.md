# TaskFlow Web — Project Specification

This document describes the approved requirements and business rules for **TaskFlow Web**, the Angular SPA that consumes the [TaskFlow API](https://github.com/BrunoGomes99/task-flow-api). Development standards live in [ENGINEERING_GUIDELINES.md](ENGINEERING_GUIDELINES.md); the architecture is explained in [ARCHITECTURE.md](ARCHITECTURE.md); individual decisions are recorded in [adr/](adr/).

The project has two goals: deliver a working frontend, and serve as a study of Angular and frontend architecture for a developer coming from C#/.NET. Decisions should be explained, not only applied.

---

## 1. Product

TaskFlow is a task manager inspired by Trello. Each user registers, logs in, and manages **only their own tasks** on a Kanban board with three columns: Pending, In Progress and Completed.

The UI language is **Brazilian Portuguese** only (no i18n).

---

## 2. Terminology

| Term | Meaning | UI label (pt-BR) |
|------|---------|------------------|
| Task | A unit of work owned by one user | Tarefa |
| Title | The task's required name. The API field is `title`; never call it `name` in code | Título |
| Description | Optional free text of a task | Descrição |
| Due date | Optional calendar date by which the task should be done | Data de vencimento |
| Status | `pending`, `inProgress` or `completed` | Pendente, Em Andamento, Concluída |
| Board | The Kanban view with one column per status | Quadro de Tarefas |
| Column | The list of tasks of one status on the board | — |
| Locked task | A task in `completed`; it can no longer change | Concluída (Travada) |
| Overdue task | A non-completed task whose due date is before today (local date) | Atrasada |
| Summary | Count of all the user's tasks per status, ignoring filters | Resumo Geral |

---

## 3. Business Rules

### 3.1 Task fields

- **Title:** required, 3 to 200 characters.
- **Description:** optional, at most 2000 characters.
- **Due date:** optional, **date only** (no time). It can be edited and cleared.
- **Status:** always `pending` on creation; the create form has no status field.

### 3.2 Status transitions

| From | Allowed targets |
|------|-----------------|
| Pending | In Progress, Completed |
| In Progress | Pending, Completed |
| Completed | none |

- Completed is final. The frontend must prevent any change to a completed task; the backend is the final guarantee and answers `409 task.status_transition_invalid`.
- Moving a task to Completed always asks for confirmation, because it cannot be undone.
- A completed task is **read-only**: it cannot be dragged, moved, or edited. It **can be deleted**.

### 3.3 Due date semantics

- The user picks a local calendar date. The frontend sends it as **23:59:59 local time, converted to UTC** (see [ADR 0005](adr/0005-due-date-as-local-end-of-day.md)).
- A due date before today (local) is rejected, **only when the due date is created or changed**. Today is valid. An already overdue task stays editable as long as its due date is not changed.
- A task is overdue from the day after its due date, unless it is completed.
- Tasks without a due date are shown as "Sem prazo" and are always placed at the end of a column, in both sort orders.

---

## 4. Functional Requirements

### 4.1 Authentication

1. **Register** (`/register`): full name, e-mail, password (minimum 8 characters, as the API). On success, navigate to `/login` with a success message. Registration does not log in.
2. **Login** (`/login`): e-mail and password. On success, load the profile, open the board, and show the toast "Bem-vindo(a) de volta, {nome}!". Wrong credentials show a form-level message, not a toast.
3. Login and register share the same card with two tabs ("Entrar" / "Criar Conta"), but each tab is its own route. The card header shows the full logo (symbol and name) above the subtitle "Gerenciador de Tarefas no estilo Kanban".
4. **Session:** the access token is stored in `localStorage` and survives closing the tab. There is no refresh token.
5. **Expiry:** the app logs out proactively when `expiresIn` elapses, and on any `401` response. In both cases it returns to `/login` with the notice that the session expired.
6. **Logout:** client-side only (the API has no logout endpoint). The logout button lives only in the sidebar.
7. Authenticated routes redirect guests to `/login`; guest routes redirect logged users to the board.

### 4.2 Board

1. Three columns: Pendente, Em Andamento, Concluída (Travada). The Completed column header has a tooltip explaining that completed tasks are locked.
2. Each column loads its tasks independently with its own pagination (API `PageSize` max 20) and **infinite scroll inside the column** (see [ADR 0003](adr/0003-board-loads-each-column-independently.md)).
3. Each column header shows its count, taken from the API `totalCount` and adjusted locally after changes.
4. Empty column state: "Nenhuma tarefa nesta coluna".

### 4.3 Filters and sorting

1. Two separate text filters: title contains, description contains. Both are combined with AND, as the API does.
2. Status filter is a **multi-select** that shows or hides columns. All three are selected by default; the last selected status cannot be unselected.
3. Sorting by due date: "Crescente" (default) or "Decrescente". There is no "no sorting" option.
4. Filters and sorting live in the URL query string, so they survive reloads and can be shared (see [ADR 0004](adr/0004-url-is-the-source-of-truth-for-board-filters.md)). Text filters are debounced.

### 4.4 Task card

1. Shows title, description preview, due date badge ("dd/MM/yyyy", "Sem prazo", or the date with "(Atrasada)" in red).
2. Quick action icons on non-completed cards:
   - Pending: move to In Progress.
   - In Progress: move to Pending.
   - Both: complete (asks for confirmation).
   - Edit and delete.
3. Completed cards show a lock icon and only the delete action.
4. Clicking the title opens the task dialog.

### 4.5 Task dialog (create, view, edit)

1. Create opens at `/tasks/new`; an existing task opens at `/tasks/:id`. Both are dialogs over the board, which stays visible behind.
2. Fields: title (with counter `n / 200`), description (with counter `n / 2000`), due date (date picker, clearable).
3. Non-completed tasks open in edit mode; completed tasks open read-only with a locked notice.
4. The edit dialog has a "Mover para..." menu with the valid status transitions.
5. Validation errors appear inline under each field, including `400` validation errors returned by the API.

### 4.6 Status change

1. By drag-and-drop between columns (mouse and touch), by the card quick icons, or by the "Mover para..." menu.
2. Updates are **optimistic**: the card moves immediately; if the API fails, it returns to its original column and position, and an error toast is shown (see [ADR 0008](adr/0008-optimistic-moves-and-card-placement.md)).
3. Card placement until the next reload:
   - A **created** card appears at the top of the Pending column.
   - A **dragged** card stays exactly where it was dropped.
   - A card moved by **icon or menu** (no drop position) appears at the top of the target column.
   - Column counters update immediately in all cases.
4. Dropping on Completed asks for confirmation. Cancelling returns the card to its origin.

### 4.7 Delete

Always asks for confirmation: "Você tem certeza que deseja excluir "{título}"? Esta ação não pode ser desfeita."

### 4.8 Sidebar

1. The TaskFlow wordmark (name-only logo) at the top, with the "WORKSPACE" badge below it.
2. User card: avatar with initials, name, e-mail, and total "Suas Tarefas".
3. "Resumo Geral": count per status, from the API summary endpoint, **ignoring filters**.
4. Logout button ("Sair da Conta").
5. On small screens the sidebar collapses and opens from a menu button.

### 4.9 Theme

1. Light and dark themes. The default follows the operating system (`prefers-color-scheme`); the user's choice is saved in `localStorage`.
2. The toggle is available on the auth screens and in the board header. Toggling shows no toast.

### 4.10 Feedback

- **Success toasts:** welcome after login, task created, task updated, task deleted, task completed.
- **Error toasts:** unexpected errors (network, `5xx`, failed optimistic updates, task not found).
- **Inline errors:** field validation, wrong credentials, e-mail already in use.

---

## 5. Non-Functional Requirements

- **Devices:** desktop first, usable on tablet and phone (collapsible sidebar, touch drag-and-drop).
- **Browsers:** evergreen browsers (latest Chrome, Edge, Firefox, Safari), per Angular defaults.
- **Accessibility:** keyboard navigation, visible focus, labels and ARIA, WCAG AA contrast in both themes. Drag-and-drop always has a keyboard alternative (quick icons and "Mover para...").
- **Security:** no secrets in the frontend; the token is only sent to the TaskFlow API.
- **Rendering:** client-side SPA only, no SSR.

---

## 6. Visual Identity

The Figma Make prototype in [design/](design/) (screenshots and `taskflow_dashboard.tsx`) is a **visual reference only**. When it diverges from this document, **this document wins**. Divergences not covered here must be discussed before implementation.

- **Light palette:** `#f8f4f9` (background), `#ffffff` (cards, containers), `#e2c2c6` / `#dfc8d9` (borders), `#2f242c` (text), `#502274` (secondary text), `#a42cd6` (primary accent).
- **Dark palette:** `#2f242c` (background), `#502274` (sidebar, containers), `#a42cd6` (primary buttons and accent backgrounds), `#c179b9` (accent text and icons), `#e2c2c6` (text).
- **Contrast rule:** in the dark theme, accent **text and icons** use `#c179b9`, because `#a42cd6` fails WCAG on dark backgrounds. `#a42cd6` stays on buttons with white text.
- **Status colors** use palette tones, not off-palette colors.
- **Red** is reserved for danger and errors: delete actions and dialog, error messages and toasts, and overdue tasks. It is always paired with an icon and explicit text.
- **Logout** uses a neutral palette tone (it is not destructive).
- **Logo:** the originals, with transparent backgrounds, are in [design/](design/):
  - `logo-taskflow.png` is the full logo (symbol and name), used on the auth card.
  - `logo-taskflow-titulo.png` is the wordmark (name only), used at the top of the sidebar.
  - The symbol alone (infinity and check mark) is cropped from the full logo and used as the favicon and in the mobile header.
  - The logo colors, including the pink check mark, are a brand asset and do not follow the palette rule.
  - If the wordmark is not legible on the dark sidebar (`#502274`), the fix (a light variant or a different background) must be discussed before being applied.
- Icons: Lucide, as in the prototype.
- Color changes beyond the prototype must be discussed before being applied.
- The prototype's "Preencher dados de teste (demo@taskflow.com)" button is not part of the product.

---

## 7. Backend Dependencies

These API changes are specified and implemented **in the task-flow-api repository, before frontend development starts**:

1. Endpoint returning the count of the user's tasks per status, ignoring filters.
2. `PUT /api/tasks/{id}` accepts `dueDate`, allowing it to be changed and cleared.
3. `POST /api/tasks` no longer accepts `status`; tasks are always created as Pending.
4. Tasks without a due date are sorted last, in both orders.
5. A due date in the past is rejected when it is created or changed.
6. The due reminder e-mail shows the due date in the `America/Sao_Paulo` time zone instead of UTC.
7. The OpenAPI document represents enums as camelCase strings, matching the JSON the API returns.

---

## 8. Phases

| Phase | Scope |
|-------|-------|
| 0 — Backend prerequisites | Section 7, in task-flow-api |
| 1 — Setup | Angular workspace, tooling, theme tokens, CI, OpenAPI types, docs |
| 2 — Authentication | Login, register, session, guards, interceptors |
| 3 — Shell | Layout, sidebar, header, theme toggle, toasts |
| 4 — Board | Columns, pagination, filters, sorting, summary |
| 5 — Task dialog | Create, view, edit, delete |
| 6 — Status changes | Drag-and-drop, quick icons, "Mover para...", optimistic updates |
| Future — Deployment | Hosting on Cloudflare Pages and production CORS in the API |

---

## 9. Out of Scope

- Refresh tokens and server-side logout.
- Reordering cards within a column (the API has no position field).
- Real-time updates between tabs or devices.
- SSR, i18n, offline support.
- Deployment (future phase).

---

## 10. Document History

- **2026-11-13:** Added the TaskFlow logo: full logo on the auth card, wordmark in the sidebar, symbol as favicon and mobile header icon.
- **2026-11-12:** Initial specification, consolidated from the requirements discussion, the prototype review, and the architecture decisions.
