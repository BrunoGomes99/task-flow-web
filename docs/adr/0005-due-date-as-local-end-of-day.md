---
status: accepted
---

# Due date is a local date sent as end of day

The UI handles the due date as a calendar date, but the API stores a UTC `DateTime`. The frontend sends the chosen date as 23:59:59 local time converted to UTC (20/11/2026 in UTC-3 becomes `2026-11-21T02:59:59Z`), and reads it back as a local date.

## Considered Options

- **00:00 local:** the reminder e-mail would show the right date in UTC, but the backend's "not in the past" validation (`dueDate > UtcNow`) would reject "today", since local midnight has already passed.
- **00:00 UTC:** users west of UTC would see the previous day.

## Consequences

"Today" is valid without the backend knowing the user's time zone, and the stored instant is the real deadline. The reminder e-mail must format the date in `America/Sao_Paulo`, otherwise it shows the next day; this is a backend change listed in [PROJECT_SPEC.md](../PROJECT_SPEC.md#7-backend-dependencies). All conversion lives in one tested date utility.
