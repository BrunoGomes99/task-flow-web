# Phase 5 — Task Dialog

> **Development happens in steps.** Implement one step at a time, following the [step protocol](README.md#step-protocol): explain the concept, implement only the step, verify, summarize what was done, commit, and stop for review before the next step.

## Goal

Create, view, edit and delete tasks in a dialog over the board, opened by URL. Changes are reflected on the board and in the summary without a reload.

## References

- [PROJECT_SPEC.md](../PROJECT_SPEC.md): sections 3.1 (fields), 3.2 (completed is read-only), 3.3 (due date), 4.4 (card actions), 4.5 (task dialog), 4.6.3 (created card placement), 4.7 (delete), 4.10 (feedback).
- [ARCHITECTURE.md](../ARCHITECTURE.md): sections 3 (components) and 6 (routing).
- ADRs: [0005](../adr/0005-due-date-as-local-end-of-day.md), [0008](../adr/0008-optimistic-moves-and-card-placement.md).
- API: `PUT` is a full replacement; an omitted `dueDate` clears it; a completed task answers `409 task.locked`; a changed past due date answers `400 task.due_date_in_past` ([README](README.md#api-contract-reference)).

## Out of Scope

- Status changes: quick move icons, "Mover para..." menu, drag-and-drop ([Phase 6](phase-6-status-changes.md)). Completing a task is a status change and also belongs to Phase 6.

## Prerequisites

- Phase 4 merged into `dev`: board store, cards, columns, date utilities.

**Branch:** `feat/phase-5-task-dialog`, from `dev`.

## Decisions for This Phase

- **Date picker:** native `<input type="date">` plus a "Remover data" button. It is accessible, keyboard-operable and touch-friendly with no extra dependency. Revisit only if the visual result is not acceptable.
- **Unchanged due date:** when the user did not change the date, the update sends the original `dueAt` instant back. A recomputed end-of-day value could differ from the stored one and be re-validated as past for an overdue task.
- **After create**, the dialog fetches the new task with `GET /api/tasks/{id}` (the create response only has the `id`) and inserts it at the top of Pending. If Pending is hidden or the task does not match the current text filters (case-insensitive "contains", as the API), it is not inserted; the toast still confirms the creation.
- **After edit**, the card is updated in place and keeps its position ([ADR 0008](../adr/0008-optimistic-moves-and-card-placement.md)).
- **Closing the dialog** returns to `/tasks` and preserves the board query parameters.

---

## Steps

### 5.1 — Dialog and confirm dialog

**Goal:** accessible dialogs reused by this phase and Phase 6.

**Concepts to explain:** CDK `Dialog` (overlay, focus trap, focus restore, `Escape`); opening a component programmatically and getting a result back (compare with a modal returning `DialogResult`); `DialogRef` and injecting `DIALOG_DATA`.

**Deliverables:**
- `src/app/shared/ui/dialog/`: dialog frame component (title linked with `aria-labelledby`, close button, content and actions slots), styled with tokens, full screen on phones.
- `src/app/shared/ui/confirm-dialog/`: `ConfirmDialog` service with `open({ title, message, confirmLabel, cancelLabel, tone: 'default' | 'danger' }): Observable<boolean>`; focus starts on the cancel button for danger confirmations.

**Acceptance criteria:**
- Focus is trapped while open and returns to the trigger on close.
- `Escape` and the close button cancel.

**Tests:** `dialog.spec.ts`; `confirm-dialog.spec.ts` (true on confirm, false on cancel and `Escape`, danger focus).

**Commit:** `feat(ui): add dialog frame and confirm dialog`

---

### 5.2 — Tasks API: get, create, update, delete

**Goal:** the remaining task endpoints.

**Concepts to explain:** request bodies typed from the generated contract; `204 No Content` as `Observable<void>`.

**Deliverables:**
- `TasksApi`: `getById(id)`, `create(input)`, `update(id, input)`, `delete(id)`.
- `TaskInput { title, description, dueAt: Date | null }` in `models/`; the mapper serializes `dueAt` with `toISOString()` (or `null`), trims the title, and always sends `description` as a string (empty when blank).
- Every method accepts an option to set `SKIP_ERROR_TOAST` (Phase 3) for callers that show their own message.

**Acceptance criteria:**
- `update` always sends `title`, `description` and `dueDate` (full replacement).

**Tests:** extend `tasks-api.spec.ts` and `task-mappers.spec.ts`.

**Commit:** `feat(tasks): add get, create, update and delete to tasks API`

---

### 5.3 — Task form

**Goal:** the presentational form of [PROJECT_SPEC 4.5](../PROJECT_SPEC.md#45-task-dialog-create-view-edit).

**Concepts to explain:** typed Reactive Forms with custom validators (compare with FluentValidation rules); a validator that depends on the initial value; disabling a whole form for read-only mode; `aria-describedby` for counters and errors.

**Deliverables:**
- `src/app/shared/utils/validators.ts`: `dueDateNotInPast(initialDate)`: invalid only when the date is before today **and** differs from the initial date.
- `src/app/features/tasks/components/task-form/`:
  - fields "Título" (counter `n / 200`), "Descrição" (textarea, counter `n / 2000`), "Data de vencimento" (date input with "Remover data");
  - validation: title required, 3 to 200 characters after trimming; description at most 2000; due date rule above. Messages in pt-BR, inline under each field;
  - inputs: `task` (initial values, or none for create), `readOnly`, `fieldErrors` (server errors, applied with `applyServerErrors`), `saving`;
  - output `save` with `{ title, description, dueDate: string | null, dueDateChanged: boolean }` (`dueDate` as `yyyy-MM-dd`).
- No status field.

**Acceptance criteria:**
- An overdue task can be saved when only its title changed.
- Picking yesterday on any task shows the inline error; picking today is valid.

**Tests:** `validators.spec.ts`; `task-form.spec.ts` (counters, each validation message, read-only disables inputs, server errors appear inline, emitted value).

**Commit:** `feat(tasks): add task form with validation and counters`

---

### 5.4 — Dialog routes and create flow

**Goal:** `/tasks/new` creates a task ([PROJECT_SPEC 4.5.1](../PROJECT_SPEC.md#45-task-dialog-create-view-edit) and 4.6.3).

**Concepts to explain:** child routes rendered while the parent stays on screen; a route component that opens a CDK dialog and navigates back on close; sharing the board's route-scoped `BoardStore` with the child route; `withComponentInputBinding` for `:id`.

**Deliverables:**
- Child routes of the board route: `new` and `:id`, both rendering `TaskDialogPage` (smart, in `pages/task-dialog-page/`).
- `TaskDialogPage` opens the dialog on init and, on close, navigates to `/tasks` with `queryParamsHandling: 'preserve'`.
- "Nova Tarefa" button (Lucide `Plus`) on the board page, linking to `new` with the query parameters preserved.
- Create: `TasksApi.create`, then `getById`, then `BoardStore.addCreatedTask(task)` (top of Pending, Pending counter + 1, per the decision above), `SummaryStore.refresh()`, toast "Tarefa criada com sucesso.", close.
- The due date is sent as `endOfLocalDay(date)`; `400` field errors go to the form; the dialog stays open on errors.

**Acceptance criteria:**
- Opening `/tasks/new` directly (reload) shows the board with the dialog over it.
- The created card is the first in Pending, even when sorted descending.

**Tests:** `board-store.spec.ts` (`addCreatedTask` with matching and non-matching filters, hidden Pending); `task-dialog-page.spec.ts` (create success, `400` field errors, close navigation keeps query params).

**Commit:** `feat(tasks): add task dialog routes and create flow`

---

### 5.5 — View and edit

**Goal:** `/tasks/:id` shows a task, editable unless completed ([PROJECT_SPEC 4.5.3](../PROJECT_SPEC.md#45-task-dialog-create-view-edit)).

**Concepts to explain:** loading state inside a dialog; branching on `ApiError.code` instead of message text.

**Deliverables:**
- The dialog fetches the task with `getById` and shows a loading state.
- Non-completed: edit mode; save calls `update` with the full body (unchanged date sends the original `dueAt`, a changed date sends `endOfLocalDay`, a cleared date sends `null`); on success `BoardStore.replaceTask(task)` updates the card in place, toast "Tarefa atualizada com sucesso.", close.
- Completed: read-only form with the notice "Esta tarefa está concluída e travada. Ela não pode ser editada nem movida." (lock icon); only delete is available.
- Errors (requests use `SKIP_ERROR_TOAST` where a specific message is shown):
  - `404 task.not_found`: error toast "Tarefa não encontrada.", the card is removed from the board if present, dialog closes.
  - `409 task.locked`: error toast "Esta tarefa foi concluída e não pode mais ser editada.", the task is reloaded and shown read-only.
  - `400 task.due_date_in_past`: inline error on the due date field.
  - `400` validation: inline field errors.
- Card: the title becomes a link to `/tasks/:id` (query parameters preserved); an edit icon button ("Editar tarefa") on non-completed cards.

**Acceptance criteria:**
- Opening `/tasks/<unknown id>` shows the not-found toast and the board.
- Editing does not move the card.

**Tests:** extend `task-dialog-page.spec.ts` (edit success, read-only completed, each error code); `board-store.spec.ts` (`replaceTask`, `removeTask`); extend `task-card.spec.ts` (link and edit button, hidden for completed).

**Commit:** `feat(tasks): add view and edit modes to task dialog`

---

### 5.6 — Delete

**Goal:** delete with confirmation from the card and the dialog ([PROJECT_SPEC 4.7](../PROJECT_SPEC.md#47-delete)).

**Deliverables:**
- Delete icon button ("Excluir tarefa", danger tone) on every card, completed included, and a "Excluir" button in the dialog.
- Confirm dialog (danger): title "Excluir tarefa", message "Você tem certeza que deseja excluir "{título}"? Esta ação não pode ser desfeita.", buttons "Excluir" and "Cancelar".
- On confirm: `delete`, then `BoardStore.removeTask(id)` (counter - 1), `SummaryStore.refresh()`, toast "Tarefa excluída com sucesso."; the dialog closes if open.
- `404` on delete: the card is removed anyway and the toast "Tarefa não encontrada." is shown.

**Acceptance criteria:**
- Cancelling leaves the task untouched.

**Tests:** `board-page.spec.ts` (delete from card with confirm and cancel); extend `task-dialog-page.spec.ts` (delete from dialog).

**Commit:** `feat(tasks): add task deletion with confirmation`

---

### 5.7 — E2E and accessibility

**Deliverables:**
- `e2e/real/task-dialog.spec.ts`: create with and without due date (card on top of Pending, counter and summary updated, toast); create with yesterday rejected inline; edit title and due date; clear the due date ("Sem prazo"); delete from card and from dialog with confirmation; reload on `/tasks/:id` opens the dialog; a completed task (completed through the API helper) opens read-only.
- `e2e/mocked/task-dialog.spec.ts`: `404` on open; `409 task.locked` on save; `400` validation errors from the API shown inline; overdue task saved with an unchanged date.
- Axe with the dialog open (create, edit, read-only) and the confirm dialog, in both themes.

**Acceptance criteria:**
- `npm run e2e` passes on both Chromium projects.

**Commit:** `test(e2e): cover task dialog create, edit and delete`

---

## Definition of Done

- [ ] All steps committed and reviewed.
- [ ] Lint, unit tests, build and E2E pass; CI green on the PR to `dev`.
- [ ] `ARCHITECTURE.md` updated (dialog route flow, created-card insertion rule).
- [ ] `ENGINEERING_GUIDELINES.md`: Phase 5 checklist added; forms boxes ticked.
- [ ] New ADR if a hard-to-reverse decision was made (for example, the native date input, if it is kept).
