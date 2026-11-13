---
status: accepted
---

# The board loads each column independently

The API caps `pageSize` at 20, so the board cannot fetch all tasks at once. Each visible column sends its own `GET /api/tasks` with its `status`, the shared text filters and the sort order, and pages with infinite scroll inside the column. Column counters come from each response's `totalCount`.

## Considered Options

- **Fetch every page up front and split by status:** unbounded requests for large accounts.
- **New board endpoint or larger page size in the API:** rejected to keep the API contract unchanged for this.

## Consequences

The status filter is not sent to the API; it only decides which columns exist. The sidebar summary comes from a separate, unfiltered endpoint, so column counters (filtered) and summary counts (unfiltered) can differ by design.
