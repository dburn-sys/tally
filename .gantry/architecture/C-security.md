# C. Security and identity

## Design
Callers authenticate with a signed session token or an API key. Both resolve
through `currentUser()` in `src/auth/context.ts`, the only place that builds the
current user (Chapter 15's fix). Roles are employee, approver, and finance, and
are checked on the server from that user. The payment provider calls back
through a signed webhook.

## Rules
C-1: Every route except POST /login and /webhooks/* is registered behind requireUser.
C-2: The current user is built only by currentUser() in src/auth/context.ts.
C-3: Role and ownership checks use the authenticated user, never a value from the request.
C-4: Webhooks verify an HMAC over the raw body with timingSafeEqual, reject timestamps older than five minutes, and record each event id once.
C-5: Secrets come from environment variables with no default value in code.
C-6: Only hashes of API keys are stored.

## Conformance checklist
C-C1: Is every new route behind requireUser, unless it is /login or a webhook? (C-1)
C-C2: Does the change avoid building a user anywhere but currentUser()? (C-2)
C-C3: Do new permission checks use only the authenticated user? (C-3)
C-C4: Does any new or changed webhook meet all three parts of C-4? (C-4)
C-C5: Are new secrets read from the environment with no default? (C-5)
C-C6: Are API keys stored only as hashes? (C-6)

## Resolved inconsistencies
None.
