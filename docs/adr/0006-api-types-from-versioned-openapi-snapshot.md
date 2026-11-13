---
status: accepted
---

# API types are generated from a versioned OpenAPI snapshot

DTO types are generated with `openapi-typescript` from `api-contract/openapi.json`, a snapshot committed to this repository together with `api-contract/API_REF` (the task-flow-api tag or commit it came from). An npm script refreshes the snapshot from the local API and regenerates the types. API services and mappers are written by hand.

## Considered Options

- **Hand-written interfaces:** drift silently from the backend, which is changing.
- **Generate from the running API at build time:** builds would depend on a live API, and contract changes would arrive unreviewed.
- **Generate services too (`ng-openapi-gen`):** hides the HTTP layer we want to learn and couples components to DTOs.

## Consequences

A contract change is an explicit, reviewable diff. CI runs E2E against the same `API_REF`, so the types, the tests and the API version always match.
