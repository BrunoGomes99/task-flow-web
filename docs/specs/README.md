# TaskFlow Web — Phase Specs

This folder holds one implementation spec per phase of [PROJECT_SPEC.md](../PROJECT_SPEC.md#8-phases). The project follows **spec-driven development (SDD)**: the spec is written and reviewed first, and the code implements it step by step.

The specs say **how** and **in which order** each phase is built. They do not restate business rules: requirements live in [PROJECT_SPEC.md](../PROJECT_SPEC.md), standards in [ENGINEERING_GUIDELINES.md](../ENGINEERING_GUIDELINES.md), architecture in [ARCHITECTURE.md](../ARCHITECTURE.md), and decisions in [adr/](../adr/). When a spec and those documents disagree, fix the disagreement before implementing.

---

## Development Happens in Steps

Each phase is split into small, numbered **steps**. A step is implemented, verified, explained, committed, and reviewed **before the next step starts**. The agent never implements a whole phase, or several steps, at once.

To start a step, ask for it by number, for example: *"Implement step 2.3 of `phase-2-authentication.md`."*

### Step protocol

Every step follows the same six actions:

1. **Explain first.** Before writing code, explain the Angular concept the step introduces and the decision involved, with a .NET analogy where it helps.
2. **Implement only the step's scope.** Do not start work that belongs to a later step. If the step reveals a gap in the spec, stop and discuss it.
3. **Verify.** Run the verification commands listed in the step (lint, unit tests, build, and E2E when the step asks). All must pass with no warnings.
4. **Summarize.** At the end, write a short explanation: what was done, why, which files to look at, and how to try it.
5. **Commit.** Commit the step's changes with the Conventional Commit message suggested in the step (adjust it if the scope changed).
6. **Stop for review.** Wait for the user to review before starting the next step. Review feedback is fixed in the same step, in a new commit.

### Phase protocol

- **Branch:** each phase has its own branch from `dev`, named in the spec (e.g. `feat/phase-2-authentication`).
- **Commits:** one commit per step, plus review fix commits when needed.
- **Definition of done:** each spec ends with a checklist. It always includes updating [ARCHITECTURE.md](../ARCHITECTURE.md) when the architecture changed, ticking the boxes in [ENGINEERING_GUIDELINES.md](../ENGINEERING_GUIDELINES.md), and recording a new ADR for any hard-to-reverse trade-off.
- **Pull request:** at the end of the phase, open a PR from the phase branch to `dev`. Never to `main`; the maintainer promotes `dev` to `main` manually.

### Default verification commands

Once Phase 1 has created them, every step runs at least:

```bash
npm run lint
npm test
npm run build
```

Steps that touch user flows also run `npm run e2e` (Playwright). The E2E suite against the real API needs task-flow-api running locally (see [phase-1-setup.md](phase-1-setup.md), step 1.6).

---

## Spec Template

Each phase spec contains:

- **Goal**, **references** (spec sections, ADRs) and **out of scope**.
- **Prerequisites:** what earlier phases must have delivered.
- **Steps**, each with:
  - **Goal:** what the step delivers.
  - **Concepts to explain:** the Angular topics to explain before coding.
  - **Deliverables:** files and folders created or changed.
  - **Acceptance criteria:** observable behavior that proves the step is done.
  - **Tests:** unit and E2E tests the step must add.
  - **Commit:** the suggested Conventional Commit message.
- **Definition of done** for the phase.

---

## Phases

| Phase | Spec | Branch |
|-------|------|--------|
| 0 — Backend prerequisites | Done in [task-flow-api](https://github.com/BrunoGomes99/task-flow-api) (`docs/superpowers/specs/2026-11-13-frontend-prereqs-design.md`) | — |
| 1 — Setup | [phase-1-setup.md](phase-1-setup.md) | `chore/phase-1-setup` |
| 2 — Authentication | [phase-2-authentication.md](phase-2-authentication.md) | `feat/phase-2-authentication` |
| 3 — Shell | [phase-3-shell.md](phase-3-shell.md) | `feat/phase-3-shell` |
| 4 — Board | [phase-4-board.md](phase-4-board.md) | `feat/phase-4-board` |
| 5 — Task dialog | [phase-5-task-dialog.md](phase-5-task-dialog.md) | `feat/phase-5-task-dialog` |
| 6 — Status changes | [phase-6-status-changes.md](phase-6-status-changes.md) | `feat/phase-6-status-changes` |

---

## API Contract Reference

Confirmed in task-flow-api after Phase 0. The generated types in `src/app/core/api/` are the source of truth once Phase 1 step 1.7 is done; this table is a quick reference.

| Method and path | Body / query | Success | Notable errors |
|-----------------|--------------|---------|----------------|
| `POST /api/users/register` | `{ name, email, password }` | `201 { id }` | `400` validation, `409 user.email_already_in_use` |
| `POST /api/users/login` | `{ email, password }` | `200 { accessToken, expiresIn }` (seconds) | `401 auth.invalid_credentials` |
| `GET /api/users/me` | — | `200 { id, name, email, createdAt }` | `401`, `404 user.not_found` |
| `GET /api/tasks` | `pageNumber`, `pageSize` (max 20), `titleContains`, `descriptionContains`, `status`, `dueDateOrder` (`ascending` / `descending`) | `200 { items, pageNumber, pageSize, totalCount }` | `400` |
| `GET /api/tasks/summary` | — | `200 { pending, inProgress, completed, total }` | `401` |
| `GET /api/tasks/{id}` | — | `200 TaskDto` | `404 task.not_found` |
| `POST /api/tasks` | `{ title, description?, dueDate? }` | `201 { id }` | `400` validation (`errors.DueDate` for a past date) |
| `PUT /api/tasks/{id}` | `{ title, description?, dueDate? }` (full replacement: omitted `dueDate` clears it) | `204` | `400`, `400 task.due_date_in_past`, `404`, `409 task.locked` |
| `PATCH /api/tasks/{id}/status` | `{ status }` | `204` | `400`, `404`, `409 task.status_transition_invalid` |
| `DELETE /api/tasks/{id}` | — | `204` | `404` |

`TaskDto` is `{ id, title, description, status, dueDate, createdAt, updatedAt }`, with `status` in `pending` / `inProgress` / `completed`. Errors are `ProblemDetails` with `extensions.code`; validation errors are `ValidationProblemDetails` whose `errors` keys are PascalCase (`Title`, `DueDate`).

---

## Document History

- **2026-11-16:** Initial phase specs (Phases 1 to 6) and SDD workflow.
