---
status: accepted
---

# Signal-based stores without a state library

State lives in plain injectable services that hold private signals, expose read-only signals, and change state only through command methods. We chose this over NgRx Store and NgRx Signal Store because the project is a study of Angular fundamentals, and a library would hide the mechanics we want to learn.

## Considered Options

- **NgRx Store (Redux):** explicit flow, but heavy ceremony for two features.
- **NgRx Signal Store:** the natural migration target if hand-written stores get hard to keep consistent; it uses the same mental model.
- **RxJS `BehaviorSubject` services:** the pre-signals pattern; signals are now the idiomatic choice for state.

## Consequences

Consistency depends on discipline: every store follows the shape in [ENGINEERING_GUIDELINES.md](../ENGINEERING_GUIDELINES.md#store-shape-signal-based-services). RxJS stays at the edges (HTTP, debounce, cancellation), because signals do not solve request races.
