# Phase 6 — Status Changes

> **Development happens in steps.** Implement one step at a time, following the [step protocol](README.md#step-protocol): explain the concept, implement only the step, verify, summarize what was done, commit, and stop for review before the next step.

## Goal

Tasks move between statuses by drag-and-drop, by quick icons on the card, and by the "Mover para..." menu in the dialog. Moves are optimistic and roll back on failure. Completing a task always asks for confirmation and locks it.

## References

- [PROJECT_SPEC.md](../PROJECT_SPEC.md): sections 3.2 (status transitions), 4.4.2 and 4.4.3 (card actions), 4.5.4 ("Mover para..."), 4.6 (status change), 4.10 (feedback), 5 (accessibility and touch).
- [ARCHITECTURE.md](../ARCHITECTURE.md): section 4 (optimistic status change).
- ADRs: [0008](../adr/0008-optimistic-moves-and-card-placement.md).
- API: `PATCH /api/tasks/{id}/status` with `{ status }`, `204` on success, `409 task.status_transition_invalid` for a forbidden transition ([README](README.md#api-contract-reference)).

## Out of Scope

- Reordering cards inside a column ([PROJECT_SPEC section 9](../PROJECT_SPEC.md#9-out-of-scope)): a drop in the same column is a no-op.

## Prerequisites

- Phase 5 merged into `dev`: confirm dialog, task dialog, card actions, `BoardStore` insert, replace and remove.

**Branch:** `feat/phase-6-status-changes`, from `dev`.

## Decisions for This Phase

- **Rollback per task:** a failed move restores only the moved task (original column, original index, counters). Restoring a snapshot of the whole board would also undo another card's move that succeeded in the meantime. This refines the store example in the rules; the behavior required by [ADR 0008](../adr/0008-optimistic-moves-and-card-placement.md) is the same.
- **One move at a time per card:** while a card's move is in flight, its actions and drag are disabled (`pendingTaskIds` in the store).
- **Pagination drift:** moving cards changes the server-side offsets of the columns involved; the next page of a column may skip or repeat a task until the next reload or filter change. Repeats are removed by the de-duplication from Phase 4; skips are accepted, consistent with "until the next reload" in ADR 0008. Record this in `ARCHITECTURE.md`.
- **Hidden target column:** when the target status is hidden by the filter, the card leaves its column and the hidden column is not touched; it reloads when shown again.

---

## Steps

### 6.1 — Transition rules

**Goal:** one tested source for the allowed transitions ([PROJECT_SPEC 3.2](../PROJECT_SPEC.md#32-status-transitions)).

**Concepts to explain:** encoding domain rules as data (`Record<TaskStatus, readonly TaskStatus[]>`) compared with a state machine in the domain layer.

**Deliverables:**
- `src/app/features/tasks/models/task-transitions.ts`: `allowedTargets(status)`, `canMove(from, to)`, `isLocked(status)`.

**Acceptance criteria:**
- Completed has no targets; Pending and In Progress can reach each other and Completed.

**Tests:** `task-transitions.spec.ts` (full matrix).

**Commit:** `feat(tasks): add status transition rules`

---

### 6.2 — Optimistic move in the board store

**Goal:** `BoardStore.moveTask` per [ADR 0008](../adr/0008-optimistic-moves-and-card-placement.md) and [ARCHITECTURE.md section 4](../ARCHITECTURE.md#optimistic-status-change).

**Concepts to explain:** optimistic UI (compare with an optimistic concurrency flow, but on the client); immutable updates of nested signal state; why the rollback lives in the same method that applied the change.

**Deliverables:**
- `TasksApi.updateStatus(id, status)`, called with `SKIP_ERROR_TOAST`.
- `BoardStore.moveTask(taskId, target, index?)`:
  - rejects moves that `canMove` forbids (no request);
  - removes the card from its column (counter - 1) and inserts it with the new status in the target column at `index`, or at the top when `index` is missing (counter + 1), if the target is visible;
  - adds the id to `pendingTaskIds` until the request ends;
  - on success: `SummaryStore.refresh()`; toast "Tarefa concluída." when the target is Completed;
  - on failure: rollback per task, and an error toast: `409 task.status_transition_invalid` gives "Esta mudança de status não é permitida.", `404` gives "Tarefa não encontrada." (and the card is removed), anything else gives "Não foi possível mover a tarefa. Tente novamente."
- `ToastStore` is injected by the store (stores may inject `core`).

**Acceptance criteria:**
- After a failed move, the card is back at its original index and both counters are restored.
- A concurrent successful move of another card is not undone by a rollback.

**Tests:** `board-store.spec.ts`: move with and without index, hidden target, counters, success refreshes the summary, each error path, concurrent moves, forbidden move sends no request.

**Commit:** `feat(tasks): add optimistic status move with per-task rollback`

---

### 6.3 — Quick move icons and completion confirmation

**Goal:** the keyboard-friendly move actions on the card ([PROJECT_SPEC 4.4.2](../PROJECT_SPEC.md#44-task-card)).

**Concepts to explain:** a presentational card emitting intent (`move` output) and the smart page deciding (confirmation, store call).

**Deliverables:**
- Card icon buttons with accessible labels and tooltips:
  - Pending: "Mover para Em Andamento" (Lucide `ArrowRight`);
  - In Progress: "Mover para Pendente" (Lucide `ArrowLeft`);
  - both: "Concluir tarefa" (Lucide `CircleCheck`).
- Completed cards keep only delete (Phase 5).
- Card input `pending` disables its actions while a move is in flight.
- Board page: completing asks for confirmation (default tone): title "Concluir tarefa", message "Concluir "{título}"? Tarefas concluídas ficam travadas e não podem mais ser editadas nem movidas.", buttons "Concluir" and "Cancelar". Confirmed or non-completing moves call `moveTask(id, target)` (top of the target column).

**Acceptance criteria:**
- All moves are possible with the keyboard alone.

**Tests:** extend `task-card.spec.ts` (icons per status, disabled while pending); `board-page.spec.ts` (confirm and cancel on complete).

**Commit:** `feat(tasks): add quick move icons with completion confirmation`

---

### 6.4 — "Mover para..." menu in the dialog

**Goal:** status change from the edit dialog ([PROJECT_SPEC 4.5.4](../PROJECT_SPEC.md#45-task-dialog-create-view-edit)).

**Concepts to explain:** CDK `Menu` (keyboard navigation and roles for free).

**Deliverables:**
- `src/app/shared/ui/menu/`: thin styling over CDK `cdkMenuTriggerFor` / `cdkMenu` / `cdkMenuItem`.
- Edit dialog: "Mover para..." button listing only `allowedTargets(status)` with their labels.
- If the form has unsaved changes, the menu is disabled with the hint "Salve as alterações antes de mover a tarefa."
- Selecting Completed asks for the same confirmation as step 6.3. The move uses `moveTask(id, target)` (top of the target column) and the dialog closes.
- The menu is absent in read-only mode.

**Acceptance criteria:**
- The menu is fully operable by keyboard and focus returns to the trigger when it closes.

**Tests:** extend `task-dialog-page.spec.ts` (targets per status, disabled when dirty, confirmation for Completed, closes after move).

**Commit:** `feat(tasks): add "Mover para..." menu to task dialog`

---

### 6.5 — Drag-and-drop

**Goal:** move cards between columns with mouse and touch ([PROJECT_SPEC 4.6](../PROJECT_SPEC.md#46-status-change)).

**Concepts to explain:** CDK drag-and-drop (`cdkDropListGroup`, `cdkDropList`, `cdkDrag`, `cdkDropListEnterPredicate`); `previousIndex` and `currentIndex`; touch start delay so a column can still scroll on phones; why drag-and-drop is never the only way to do something.

**Deliverables:**
- Columns are connected drop lists carrying their status; cards are draggable unless completed or pending.
- The enter predicate accepts only valid transitions (`canMove`), so an invalid column shows no drop placeholder.
- A drop in another column calls `moveTask(id, target, currentIndex)`; the card stays where it was dropped. A drop in the same column is a no-op.
- A drop on Completed opens the completion confirmation first; cancelling leaves the card in its original column and position.
- Touch: `cdkDragStartDelay` of about 200 ms for touch input; auto-scroll inside columns while dragging; a drag preview and placeholder styled with tokens.
- Completed cards show the lock icon and the `not-allowed` cursor when hovered for drag.

**Acceptance criteria:**
- Dragging from Pending to the middle of In Progress places the card exactly there and updates both counters.
- Cancelling the Completed confirmation returns the card to its origin.

**Tests:** `board-page.spec.ts` (simulated `cdkDropListDropped` events: valid move with index, same column no-op, Completed with confirm and cancel); drag itself is covered by E2E.

**Commit:** `feat(tasks): add drag-and-drop between board columns`

---

### 6.6 — E2E and accessibility

**Deliverables:**
- `e2e/real/status-changes.spec.ts`: move with quick icons both ways; complete with confirmation, then the card is locked (no move icons, read-only dialog); cancel completion; drag from Pending to In Progress at a given position (Chromium desktop); "Mover para..." from the dialog; counters and summary update after each move.
- `e2e/mocked/status-changes.spec.ts`: `409 task.status_transition_invalid` and `500` roll back to the original position with the error toast; a delayed `PATCH` shows the card in the target column before the response; touch drag on the mobile project.
- Axe on the board with move icons visible, the "Mover para..." menu open and the completion confirmation, in both themes.

**Acceptance criteria:**
- `npm run e2e` passes on both Chromium projects; the manual cross-browser workflow passes on Firefox and WebKit.

**Commit:** `test(e2e): cover status changes, rollback and drag-and-drop`

---

## Definition of Done

- [ ] All steps committed and reviewed.
- [ ] Lint, unit tests, build and E2E pass; CI green on the PR to `dev`.
- [ ] `ARCHITECTURE.md` updated: per-task rollback, pending moves, pagination drift.
- [ ] `ENGINEERING_GUIDELINES.md`: Phase 6 checklist added; store shape and accessibility boxes ticked.
- [ ] `.cursor/rules/frontend-architecture.mdc` store example updated to the per-task rollback.
- [ ] New ADR if a hard-to-reverse decision was made.
- [ ] Every requirement of [PROJECT_SPEC section 4](../PROJECT_SPEC.md#4-functional-requirements) checked against the running app.
