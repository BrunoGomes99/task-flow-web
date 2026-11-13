---
status: accepted
---

# JWT in localStorage, without refresh tokens

The access token is stored in `localStorage` so the session survives closing the tab. The API returns the token in the response body (not as an `HttpOnly` cookie) and has no refresh endpoint, so the 60-minute token is the whole session.

## Considered Options

- **`sessionStorage`:** session ends with the tab; same exposure to scripts.
- **Memory only:** safest against XSS, but every reload logs the user out.
- **`HttpOnly` cookie:** would need backend changes (cookie issuing, CSRF protection, CORS with credentials).

## Consequences

A successful XSS could read the token, so templates must never bypass Angular's sanitization and no third-party scripts are loaded. The app logs out proactively at `expiresAt` and on any `401`. Refresh tokens, if added to the API later, are additive.
