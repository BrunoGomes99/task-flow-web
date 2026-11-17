# TaskFlow Web

Angular client for the [TaskFlow API](https://github.com/BrunoGomes99/task-flow-api): register, log in, and manage your own tasks on a Kanban board.

![TaskFlow logo](docs/design/logo-taskflow.png)

> **Status:** Phase 1 setup is in place: Angular workspace, tooling, theme tokens, generated API types, test runners and CI. Product screens start in [Phase 2](docs/specs/phase-2-authentication.md).

## Features

- Login and registration with JWT authentication.
- Kanban board with Pending, In Progress and Completed columns, with infinite scroll per column.
- Drag-and-drop between columns (mouse and touch), plus keyboard-friendly quick actions.
- Completed tasks are locked: they cannot return to a previous status.
- Filters by title, description and status; sorting by due date.
- Create, view, edit and delete tasks in a dialog with its own URL.
- Sidebar with the user profile and a per-status summary.
- Light and dark themes, following the operating system by default.

## Tech Stack

Angular 22 (standalone, zoneless, signals) · TypeScript strict · Angular CDK · Tailwind CSS v4 · Lucide icons · Vitest + Angular Testing Library · Playwright + axe-core · angular-eslint + Prettier.

## Prerequisites

- **Node.js 24 LTS.** CI uses the version in `.nvmrc` (`24.22.3`). `package.json` accepts `^24.15.0`.
- **npm 11** (`packageManager` in `package.json`).
- **Docker**, to run the TaskFlow API locally.
- **Playwright browsers**, before the first end-to-end run: `npx playwright install chromium`.

## Running locally

1. In the [task-flow-api](https://github.com/BrunoGomes99/task-flow-api) repository, start the API. The compose file publishes `http://localhost:8080` and defaults `ASPNETCORE_ENVIRONMENT` to Development:

   ```bash
   docker compose up taskflow.api
   ```

2. In this repository, install dependencies and start the dev server. `ng serve` proxies `/api` to the local API, so the browser talks only to `http://localhost:4200`:

   ```bash
   npm install
   npm start
   ```

3. Open `http://localhost:4200`. The Phase 1 app renders an empty router outlet.

## Scripts

| Script                 | What it does                                                           |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm start`            | Dev server at `http://localhost:4200`, with the `/api` proxy           |
| `npm run build`        | Production build                                                       |
| `npm test`             | Unit tests, single run (Vitest)                                        |
| `npm run test:watch`   | Unit tests in watch mode                                               |
| `npm run lint`         | angular-eslint, zero warnings                                          |
| `npm run format`       | Format with Prettier                                                   |
| `npm run format:check` | Check formatting                                                       |
| `npm run e2e`          | Playwright on Chromium desktop and Chromium mobile                     |
| `npm run e2e:ui`       | Playwright UI for those two projects                                   |
| `npm run api:types`    | Regenerate DTO types from `api-contract/openapi.json`                  |
| `npm run api:refresh`  | Download the OpenAPI snapshot from the local API, then run `api:types` |
| `npm run assets:logos` | Regenerate the optimized logo, wordmark and favicon                    |

Firefox and WebKit are not part of `npm run e2e`. On GitHub they run from the manual **E2E cross-browser** workflow (`workflow_dispatch`) against `dev`.

## Refreshing the API contract

DTO types come from the committed snapshot `api-contract/openapi.json`. `api-contract/API_REF` is the task-flow-api commit that snapshot came from. CI checks out that commit for end-to-end tests ([ADR 0006](docs/adr/0006-api-types-from-versioned-openapi-snapshot.md)).

1. Start the API as in [Running locally](#running-locally). Swagger is on in Development.
2. Run `npm run api:refresh`. It downloads `http://localhost:8080/swagger/v1/swagger.json`, writes the snapshot, and regenerates `src/app/core/api/generated/api-types.ts`.
3. Set `api-contract/API_REF` to the task-flow-api commit you snapshotted. The script prints this reminder.
4. Commit `api-contract/openapi.json`, `api-contract/API_REF` and the generated types together.

`npm run api:types` only regenerates types from the snapshot already in the repo. CI runs it and fails if the generated file changes.

## Documentation

| Document                                                         | Content                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md)                     | Requirements and business rules                              |
| [docs/ENGINEERING_GUIDELINES.md](docs/ENGINEERING_GUIDELINES.md) | Development standards and checklists                         |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                     | Current architecture and diagrams                            |
| [docs/adr/](docs/adr/)                                           | Architecture decision records                                |
| [docs/specs/](docs/specs/README.md)                              | Phase specs and the step-by-step workflow                    |
| [docs/design/](docs/design/)                                     | Figma prototype screenshots and code (visual reference only) |

## Contributing

Create feature branches from `dev` and open pull requests to `dev`. Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
