# Run: 2026-06-03 feat/m6
Lane: feat
Request: Roadmap M6: container, infrastructure as code, CI, and telemetry, under Section E.
Authors: infra-author (Dockerfile, infra/, CI), backend-author (src/telemetry/)

## Tests (from the evidence ledger)
| At | Scope | Result |
| --- | --- | --- |
| 14:02:51 | full | fail (telemetry: no database spans; pg was imported before the ESM loader hook was registered) |
| 14:20:13 | full | pass (103 tests) |
| 15:11:40 | full | pass (104 tests, after the E-5 fix) |

## Static checks
- `checkov -d infra`: 23 passed, 5 failed. Failed: geo-redundant backup (on in prod
  only; checkov reads the expression as off), Key Vault firewall and public access,
  and two "private endpoint" checks. Postgres uses VNet integration (a delegated
  subnet, private DNS, public access off, and an NSG allowing 5432 only from the apps
  subnet), which checkov doesn't count as private. Key Vault public access is
  [NEEDS-TRIAGE]: closing it needs a private endpoint and a deploy runner inside the
  network.
- `checkov -f Dockerfile`: 48 passed, 0 failed.
- `actionlint`: clean.

## Conformance (Section E, gantry:architect-reviewer-e)
| Round | Verdict | Failing items |
| --- | --- | --- |
| 1 | NON-CONFORMANT | E-C1 (base images not pinned by digest), E-C5 (HTTP spans recorded client IP and user agent) |
| 2 | NON-CONFORMANT | E-C1 |

E-C5 was fixed: `RedactingExporter` strips client addresses, user agents, and query
strings before export, with a test over real HTTP that fails without it.

E-C1 is open. This change was built where no container registry was reachable, so
the digest couldn't be looked up. Run `scripts/pin-images.sh`, commit the pinned
Dockerfile, and re-run `/gantry:conformance`. Until then G-ARCH refuses commits that
touch Section E, and CI's `images` job fails.

## Review findings
| # | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| 1 | HIGH | DEP-2: @opentelemetry/sdk-node pulls in gRPC and protobufjs, which runs an install script | fixed: replaced with sdk-trace-node and the HTTP exporter only; no new install scripts |
| 2 | MEDIUM | E-5: telemetry test checked only emails and passwords, not IPs or user agents | fixed: second test sends X-Forwarded-For and a user agent over real HTTP |
| 3 | LOW | OpenTelemetry packages have narrow peer ranges on @opentelemetry/api | fixed: exact versions in package.json |

## Overrides
None.

## Result
Merged feat/m6 into main with E-C1 open, as described above.
