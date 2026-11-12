# Tally roadmap

| Milestone | Adds | Main risk |
| --- | --- | --- |
| M1 Core API | Expense create, list, and get. (Done.) | Money stored imprecisely. |
| M2 People | Login, roles (employee, approver, finance), API keys for integrations. | Credentials and secrets in code. |
| M3 Companies and approvals | Many companies in one database, kept separate; an approval workflow with history. | One company seeing another company's data. |
| M4 Receipts and payouts | Receipt photos read by an AI model; a worker that pays approved expenses through a payment provider's sandbox. | Trusting model output and outside callbacks. |
| M5 Approver dashboard | A React web app for managers. | Client and server disagreeing about data shapes. |
| M6 Production | Containers, infrastructure as code, CI, telemetry. | Exposed infrastructure and leaked telemetry. |
