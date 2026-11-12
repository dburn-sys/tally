# Plan: Receipt reader

### T-1: Model client with timeout, retries, and a disabled fallback (MVP)
- Files: src/ai/model.ts, test/ai/receipts.test.ts
- Change: ModelClient interface; an HTTP client for the Anthropic Messages API (no SDK dependency); a client that always fails when no key is configured
- Verify: test "AC-3" passes
- Covers: AC-3
- Depends on: none

### T-2: Fenced prompt, validated output, confidence threshold (MVP)
- Files: src/ai/receipts/reader.ts, test/ai/receipts.test.ts
- Change: suggestFields() builds the fenced prompt, validates every field by hand, blanks fields under 0.8
- Verify: tests "AC-1", "AC-2", "AC-4", "AC-5" pass
- Covers: AC-1, AC-2, AC-4, AC-5
- Depends on: T-1

### T-3: Route
- Files: src/app.ts, test/ai/receipts.test.ts
- Change: POST /receipts/suggest behind requireUser; body limit
- Verify: tests "AC-6" and "AC-7" pass
- Covers: AC-6, AC-7
- Depends on: T-2

### T-4: Eval set (AI-5)
- Files: test/ai/evals/cases/*.json, test/ai/evals/run.ts, package.json
- Change: realistic cases with known answers; `npm run eval:receipts` runs them against the real model
- Verify: the eval runner type-checks and reports per-case results
- Covers: AI-5
- Depends on: T-2
