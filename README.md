# Tally (companion repo)

The practice app from *Gantry: Building an Agent Harness for Claude Code*: an expense and
reimbursement API that grows chapter by chapter.

Each chapter's checkpoint is a git tag (`ch01`, `ch02`, ...). To pick up from a chapter:

```bash
git checkout ch07
```

Requirements: Node 22+, Docker (for Postgres), and Python 3.10+ from Chapter 9 onward.

```bash
npm install
docker compose up -d
npm run migrate
npm test
```
