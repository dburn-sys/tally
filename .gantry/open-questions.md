# Open questions

Every unresolved [CONFIRM-NN] in the repo, with where it lives. Resolved items
move to the bottom with their answer.

## Open
- [CONFIRM-02] Can a user belong to more than one company? Today: no, one
  company per user. (specs/company-isolation.md)
- [CONFIRM-03] Who creates companies: a Tally operator, or self-service
  sign-up? Today: only through code and seed scripts. (specs/company-isolation.md)

## Resolved
- [CONFIRM-01] What happens to a submitted expense if its submitter leaves?
  It stays submitted; an approver can still decide it. (specs/approval-workflow.md)
