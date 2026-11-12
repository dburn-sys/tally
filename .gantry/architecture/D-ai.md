# D. AI

## Design
One model feature: receipt suggestions (`src/ai/receipts/`). Every model call
goes through `ModelClient` in `src/ai/model.ts`. Suggestions are validated,
blanked below 0.8 confidence, and confirmed by the employee before anything is
created. The eval set is in `test/ai/evals/`.

## Rules
D-1: Every model call goes through a ModelClient from src/ai/model.ts.
D-2: Untrusted text in a prompt is inside delimiting tags, labeled as data, and can't close its own tags.
D-3: Model output is validated field by field, fields under the confidence threshold are left for a person, and nothing the model produces is submitted without a person confirming.
D-4: Every model call has a timeout, a retry limit, and a fallback that keeps the feature usable.
D-5: A new model feature adds eval cases in test/ai/evals/.
D-6: Prompts contain only the data the task needs: no names, emails, or ids.

## Conformance checklist
D-C1: Do new model calls go through ModelClient? (D-1)
D-C2: Is untrusted text fenced and labeled as data? (D-2)
D-C3: Is model output validated and confirmed by a person before use? (D-3)
D-C4: Do new model calls have a timeout, retries, and a fallback? (D-4)
D-C5: Does a new model feature come with eval cases? (D-5)
D-C6: Do prompts leave out personal data? (D-6)

## Resolved inconsistencies
None.
