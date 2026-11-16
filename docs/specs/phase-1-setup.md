# Phase 1 — Setup

> **Development happens in steps.** Implement one step at a time, following the [step protocol](README.md#step-protocol): explain the concept, implement only the step, verify, summarize what was done, commit, and stop for review before the next step.

## Goal

Create the Angular workspace and all the tooling the next phases rely on: strict TypeScript, lint and format, design tokens and theme bootstrap, icons and CDK, logo assets, dev proxy, generated API types, unit and E2E test runners, and CI. No product screens are built in this phase.

## References

- [ENGINEERING_GUIDELINES.md](../ENGINEERING_GUIDELINES.md): Stack, Phase 1 checklist, CI.
- [ARCHITECTURE.md](../ARCHITECTURE.md): sections 2 (folders), 7 (theming), 8 (dev and CI topology).
- [PROJECT_SPEC.md](../PROJECT_SPEC.md): section 6 (visual identity and logos).
- ADRs: [0002](../adr/0002-cdk-and-own-components-with-tailwind.md), [0006](../adr/0006-api-types-from-versioned-openapi-snapshot.md), [0009](../adr/0009-hybrid-e2e-against-real-api.md).

## Out of Scope

- Any product screen, store, interceptor or guard (Phases 2 to 6).
- Deployment and production CORS.

## Prerequisites

- Phase 0 merged in task-flow-api (`main`).
- Branch `dev` exists in this repository (created together with these specs).
- Docker Desktop, to run task-flow-api locally for steps 1.6, 1.7 and 1.9.

**Branch:** `chore/phase-1-setup`, from `dev`.

---

## Steps

### 1.1 — Angular workspace

**Goal:** an empty Angular 22 app that builds and runs.

**Concepts to explain:** Angular CLI and `angular.json` (compare with `.csproj` and `dotnet new`); standalone components versus `NgModule`; zoneless change detection and why signals make it possible; `main.ts` and `app.config.ts` as the composition root (compare with `Program.cs`); strict TypeScript and strict templates.

**Deliverables:**
- Node 24 LTS pinned in `.nvmrc` (and `engines` in `package.json`).
- Workspace generated in the repository root (not a subfolder) with: standalone, zoneless, strict, no SSR, routing, CSS styles, Vitest as the unit test runner.
- `zone.js` absent from `package.json` and `angular.json`.
- `ChangeDetectionStrategy.OnPush` as the schematic default for components.
- The CLI-generated placeholder content removed from `app.html`; the app renders an empty `<router-outlet />`.
- `.gitignore` covering Angular, Node, Playwright and coverage outputs.

**Acceptance criteria:**
- `npm start` serves the app at `http://localhost:4200`.
- `npm run build` and `npm test` succeed.
- `tsconfig.json` has `strict: true` and `angularCompilerOptions.strictTemplates: true`.

**Tests:** the CLI-generated `app.spec.ts`, adjusted to the empty template.

**Commit:** `chore: create Angular 22 workspace (zoneless, strict, Vitest)`

---

### 1.2 — Lint, format and pre-commit

**Goal:** consistent code style enforced locally and later in CI.

**Concepts to explain:** angular-eslint (template and TypeScript rules) compared with Roslyn analyzers; Prettier compared with `dotnet format`; Git hooks with husky and lint-staged.

**Deliverables:**
- `angular-eslint` with the recommended TypeScript and template rules, plus `@typescript-eslint/no-explicit-any` as an error and the template accessibility rules.
- Prettier with a `.prettierrc` and `.prettierignore` (ignores generated API types and build output). `eslint-config-prettier` to avoid rule conflicts.
- `husky` and `lint-staged`: on pre-commit, ESLint (`--max-warnings=0`) and Prettier on staged files.
- npm scripts: `lint`, `format`, `format:check`.
- `.editorconfig` aligned with Prettier.

**Acceptance criteria:**
- `npm run lint` and `npm run format:check` pass with zero warnings.
- A commit with a lint error is blocked by the hook.

**Tests:** none beyond the commands above.

**Commit:** `chore: add angular-eslint, Prettier and lint-staged`

---

### 1.3 — Tailwind, design tokens and theme bootstrap

**Goal:** one place for colors, used by Tailwind utilities, with both themes and no flash of the wrong theme.

**Concepts to explain:** CSS custom properties as design tokens (compare with resource dictionaries in XAML); Tailwind v4 `@theme` mapping tokens to utilities; why the theme class is set by an inline script in `index.html` before Angular boots.

**Deliverables:**
- Tailwind CSS v4 configured for the Angular build.
- `src/styles/tokens.css` (or equivalent) with the palette from [PROJECT_SPEC.md section 6](../PROJECT_SPEC.md#6-visual-identity) as raw tokens, and semantic tokens per theme: background, surface, border, text, secondary text, accent, accent text (`#c179b9` in dark), danger, focus ring, and one token per status color. Light values on `:root`, dark values on `html.dark`.
- Tailwind theme mapping the semantic tokens to utilities (e.g. `bg-surface`, `text-accent-text`, `text-danger`).
- An inline script in `index.html` that reads the saved theme from `localStorage` (key `taskflow.theme`, values `light` / `dark`) or falls back to `prefers-color-scheme`, and sets the `dark` class on `<html>`.
- A global visible focus style (`:focus-visible`) using the focus ring token.

**Acceptance criteria:**
- Setting `localStorage['taskflow.theme'] = 'dark'` and reloading shows the dark background without a light flash.
- No raw hex colors outside the token file.
- Status colors use palette tones, and red is used only by the danger token.

**Tests:** none (visual); contrast is checked by axe in step 1.9 and in later phases.

**Commit:** `feat(theme): add Tailwind v4, design tokens and theme bootstrap`

---

### 1.4 — Folder skeleton, CDK and icons

**Goal:** the folder structure from the architecture and the UI dependencies.

**Concepts to explain:** feature-based folders and dependency direction (compare with Clean Architecture projects and their references); TypeScript path aliases; Angular CDK as behavior without styles; how `@lucide/angular` icons are imported per component (tree-shaking).

**Deliverables:**
- Folders `src/app/core/`, `src/app/shared/ui/`, `src/app/shared/utils/`, `src/app/features/` (empty folders kept with a `.gitkeep` only where needed).
- Path aliases in `tsconfig.json`: `@core/*`, `@shared/*`, `@features/*`.
- ESLint rule enforcing the dependency direction (e.g. `no-restricted-imports` per folder): `shared` cannot import `core` or `features`; `core` cannot import `features`; a feature cannot import another feature.
- `@angular/cdk` and `@lucide/angular` installed; CDK overlay styles included globally.

**Acceptance criteria:**
- An import from `@features/...` inside `core/` fails lint.
- Build passes.

**Tests:** none beyond lint.

**Commit:** `chore: add folder structure, path aliases, CDK and Lucide icons`

---

### 1.5 — Logo assets

**Goal:** optimized logo files for the app, keeping the originals in `docs/design/`.

**Concepts to explain:** the `public/` folder and how Angular copies static assets; `<picture>` with WebP and PNG fallback; `srcset` for 1x and 2x.

**Deliverables:**
- In `public/images/`: the full logo (auth card) and the wordmark (sidebar), each resized to its display size, at 1x and 2x, in WebP and PNG.
- The symbol (infinity and check mark) cropped from the full logo: `favicon.ico` plus a PNG favicon, and the mobile header icon at 1x and 2x.
- `index.html` points to the new favicon; the page `<title>` is "TaskFlow".
- A one-off, reproducible way to regenerate the assets (an npm script using `sharp`, or documented commands), so the sizes can be changed later.

The display sizes are decided in this step from the prototype screenshots and recorded in the summary. Logo colors are a brand asset and are not changed.

**Acceptance criteria:**
- The favicon shows the symbol in the browser tab.
- The originals in `docs/design/` are unchanged.

**Tests:** none.

**Commit:** `chore(assets): add optimized logo, wordmark and favicon`

---

### 1.6 — Dev proxy and environments

**Goal:** the app talks to the local API through `/api` without CORS in development.

**Concepts to explain:** the dev server proxy (compare with a reverse proxy such as YARP); Angular `environment` files and file replacements (compare with `appsettings.{Environment}.json`); an `InjectionToken` for the API base URL.

**Deliverables:**
- `proxy.conf.json` mapping `/api` to `http://localhost:8080`, wired in `angular.json` for `ng serve`.
- `src/environments/environment.ts` and `environment.development.ts` with `apiBaseUrl` (empty string in development, so requests use the proxy; a placeholder production URL until the deployment phase).
- `API_BASE_URL` injection token in `src/app/core/api/`, provided in `app.config.ts` from the environment.
- `provideHttpClient(withFetch())` in `app.config.ts` (interceptors come in Phase 2).
- README section "Running locally": start task-flow-api with `docker compose up taskflow.api` in the API repo, then `npm start`.

**Acceptance criteria:**
- With the API running, `http://localhost:4200/api/tasks/summary` returns `401` from the API (not a proxy error).

**Tests:** none.

**Commit:** `chore(api): add dev proxy, environments and API base URL token`

---

### 1.7 — OpenAPI snapshot and generated types

**Goal:** DTO types generated from a versioned snapshot of the API contract ([ADR 0006](../adr/0006-api-types-from-versioned-openapi-snapshot.md)).

**Concepts to explain:** TypeScript structural types versus C# classes; `openapi-typescript` output (`paths`, `components['schemas']`); why the snapshot is committed instead of fetched at build time.

**Deliverables:**
- `api-contract/openapi.json`: snapshot from `http://localhost:8080/swagger/v1/swagger.json` (the API runs in Development in local compose).
- `api-contract/API_REF`: the task-flow-api commit SHA (or tag) the snapshot came from.
- `src/app/core/api/generated/api-types.ts`, generated by `openapi-typescript`, excluded from lint and Prettier.
- `src/app/core/api/api-models.ts` re-exporting the DTOs with readable names (`TaskDto`, `TaskSummaryDto`, `LoginResponse`, `UserDto`, `PagedTaskDto`, `ProblemDetails`, `ValidationProblemDetails`, and the status and order enums).
- npm scripts:
  - `api:types`: regenerate the types from the committed snapshot.
  - `api:refresh`: download the snapshot from the local API, then run `api:types`. The script prints a reminder to update `API_REF`.
- CI-friendly check: `api:types` run in CI must produce no diff (added to the CI workflow in step 1.10).

**Acceptance criteria:**
- The generated status enum is `'pending' | 'inProgress' | 'completed'` and the order enum is `'ascending' | 'descending'` (Phase 0, item 7).
- `CreateTaskRequest` has no `status` field.

**Tests:** none (type-level); build must pass.

**Commit:** `chore(api): add OpenAPI snapshot, API_REF and generated types`

---

### 1.8 — Unit test setup

**Goal:** Vitest with Angular Testing Library ready for stores, utilities and components.

**Concepts to explain:** Vitest compared with xUnit; Angular `TestBed` (compare with a test host and DI container); Angular Testing Library's philosophy: test what the user sees, query by role and label.

**Deliverables:**
- `@testing-library/angular`, `@testing-library/user-event` and `@testing-library/jest-dom` matchers configured for Vitest.
- A shared test setup file (matchers, zoneless test providers).
- npm scripts: `test` (single run, used by CI), `test:watch`.
- `app.spec.ts` rewritten with Angular Testing Library as the reference example.

**Acceptance criteria:**
- `npm test` passes in a single run without watch mode.

**Tests:** the rewritten `app.spec.ts`.

**Commit:** `test: configure Vitest with Angular Testing Library`

---

### 1.9 — Playwright and accessibility checks

**Goal:** the E2E runner with the two folders from [ADR 0009](../adr/0009-hybrid-e2e-against-real-api.md) and axe.

**Concepts to explain:** Playwright projects (browser and device matrix); `webServer` to start the app; `page.route` for network mocks; `@axe-core/playwright`.

**Deliverables:**
- `playwright.config.ts` with projects `chromium-desktop` and `chromium-mobile` (default), and `firefox` and `webkit` (selected only by the manual workflow).
- `webServer` running `npm start` (proxy to the local API).
- `e2e/real/` and `e2e/mocked/` folders; `e2e/support/` with:
  - a helper that creates a unique e-mail per test (e.g. `e2e+<timestamp>-<random>@taskflow.test`);
  - an axe helper that runs `AxeBuilder` with WCAG 2 A/AA tags and fails on violations;
  - a theme helper that sets `taskflow.theme` before navigation, to run a check in both themes.
- One smoke test in `e2e/mocked/` that opens `/` and runs the axe helper in light and dark.
- npm scripts: `e2e`, `e2e:ui`.

**Acceptance criteria:**
- `npm run e2e` passes on both Chromium projects.

**Tests:** the smoke test.

**Commit:** `test(e2e): configure Playwright projects and axe helpers`

---

### 1.10 — CI workflows

**Goal:** every PR to `dev` or `main` is linted, tested, built and checked end to end against the API version in `API_REF`.

**Concepts to explain:** GitHub Actions jobs and steps (compare with Azure DevOps pipelines); checking out a second repository; compose overrides for CI.

**Deliverables:**
- `.github/workflows/ci.yml`, on `pull_request` to `dev` and `main`:
  1. Install with `npm ci` (Node from `.nvmrc`, npm cache).
  2. `npm run format:check`, `npm run lint`, `npm run api:types` followed by `git diff --exit-code`, `npm test`, `npm run build`.
  3. E2E job: checkout task-flow-api at the ref in `api-contract/API_REF`; run `docker compose -f docker-compose.yml -f <ci override> up -d taskflow.api`; wait for `GET http://localhost:8080/health/live`; install Playwright browsers; run `npm run e2e` on the two Chromium projects; upload the Playwright report on failure.
- `ci/docker-compose.ci.yml` in this repository: publishes port `8080` and sets the JWT settings through environment variables with a test-only key (no User Secrets volume).
- `.github/workflows/e2e-cross-browser.yml`: `workflow_dispatch` and a weekly schedule, running Firefox and WebKit against `dev`.
- No secrets in the workflows.

**Acceptance criteria:**
- The CI run on the phase PR is green.
- The JWT configuration keys match the API's options (checked against task-flow-api `appsettings.json`).

**Tests:** the workflow itself.

**Commit:** `ci: add PR pipeline and cross-browser E2E workflow`

---

### 1.11 — Documentation and PR

**Goal:** the docs describe the real setup.

**Deliverables:**
- `README.md`: prerequisites, running locally, scripts table, how to refresh the API contract.
- `ARCHITECTURE.md`: status updated (workspace exists), any deviation found during the phase.
- `ENGINEERING_GUIDELINES.md`: Phase 1 and CI boxes ticked.
- PR from `chore/phase-1-setup` to `dev`.

**Commit:** `docs: document local setup and close Phase 1`

---

## Definition of Done

- [ ] All steps committed and reviewed.
- [ ] `npm run lint`, `npm run format:check`, `npm test`, `npm run build` and `npm run e2e` pass locally.
- [ ] CI green on the PR to `dev`.
- [ ] `ARCHITECTURE.md` and `ENGINEERING_GUIDELINES.md` updated; new ADR if a hard-to-reverse decision was made.
