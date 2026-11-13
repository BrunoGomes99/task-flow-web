---
status: accepted
---

# Optimistic status changes, and cards stay where placed

Status changes are applied to the board immediately and rolled back if the API fails. Until the next reload, cards are not re-sorted: a dragged card stays exactly where it was dropped, a created card appears at the top of Pending, and a card moved by icon or menu appears at the top of the target column. Re-sorting a card the user just placed would make it jump away, and with infinite scroll its sorted position may not even be loaded.

## Consequences

A column can be temporarily out of due-date order; reloading or changing filters restores it. Counters are adjusted locally at once. Rollback restores both the original column and the original index. Moving to Completed asks for confirmation before the optimistic update.
