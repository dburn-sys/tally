# Plan: Payouts

### T-1: payouts and webhook_events tables (MVP)
- Files: migrations/008_payouts.sql
- Change: both tables company-owned per MIG-1 and MIG-2; one live payout per expense
- Verify: tenancy test "AC-6" lists the new tables
- Covers: AC-4
- Depends on: none

### T-2: Start a payout (MVP)
- Files: src/payouts/provider.ts, src/payouts/service.ts, src/app.ts, test/payouts.test.ts
- Change: POST /expenses/:id/payout for finance; amount from our record; provider call outside the transaction
- Verify: tests "AC-1" to "AC-5" pass
- Covers: AC-1, AC-2, AC-3, AC-4, AC-5
- Depends on: T-1

### T-3: Verified, idempotent webhook (MVP)
- Files: src/webhooks/signature.ts, src/webhooks/payouts.ts, test/payouts.test.ts, test/fixtures/payouts.ts
- Change: HMAC over the raw body, constant-time compare, 5-minute window, event ids recorded once
- Verify: tests "AC-6" to "AC-12" pass
- Covers: AC-6 to AC-12
- Depends on: T-2
