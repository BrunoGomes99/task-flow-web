---
status: accepted
---

# Angular CDK and own components, styled with Tailwind

We build our own UI components on top of the Angular CDK (dialog, overlay, drag-and-drop, focus trap, a11y) and style them with Tailwind CSS v4 over CSS custom properties. The product has its own visual identity, which a component library such as Angular Material or PrimeNG would fight, and building the components is part of the learning goal.

## Consequences

The first usable screen takes longer: button, form field, dialog, confirm dialog, toast, tooltip, multi-select, avatar and badge must be built and tested by us. The CDK covers the hard parts (positioning, focus, keyboard, touch drag). Colors exist only as theme tokens; templates never contain raw hex values.
