---
status: accepted
---

# Hybrid E2E: real API for flows, mocked network for edge cases

Main user flows run against the real task-flow-api; edge cases that are hard to produce for real (`409`, `500`, expired session, long lists) run with Playwright network mocks. Both run in CI on every PR to `dev` and `main`.

## Consequences

- CI checks out task-flow-api at `api-contract/API_REF` and runs `docker compose up taskflow.api`, which starts only the API, MongoDB and Redis. Port `8080`, `ASPNETCORE_ENVIRONMENT` and the JWT settings come from that compose file and from the image's `appsettings.json`.
- The API has no endpoint to delete users, so each test registers a user with a unique e-mail instead of cleaning up.
- Mocks must follow the generated contract types so they cannot describe an API that does not exist.
