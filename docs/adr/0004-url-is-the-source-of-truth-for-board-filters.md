---
status: accepted
---

# The URL is the source of truth for board filters

Filters and sorting live only in the query string (`title`, `description`, `status`, `order`). The filters bar navigates; the board store reads the route and reloads. Keeping a second copy in the store would require two-way sync and invite drift, and the URL gives reloads, back/forward and shareable links for free.

## Consequences

The store never writes filters directly. Invalid or missing query parameters are normalized to defaults (all statuses, ascending) by replacing the URL.
