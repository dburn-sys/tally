# E. Cloud and deployment

## Design
The API runs as a container. Infrastructure is Terraform in `infra/`. The
database is reachable only from inside the private network. Secrets come from
the cloud's secret store at runtime. Telemetry is OpenTelemetry, configured by
environment variables. CI runs on every push.

## Rules
E-1: Every deployable has a Dockerfile with a base image pinned by digest and a non-root user.
E-2: The database has no public network exposure. Only the API and the migration job can reach it.
E-3: Secrets reach containers from the cloud secret store at runtime, never through image layers, build args, or Terraform variables with defaults.
E-4: Every cloud resource that supports tags carries app=tally and env=<env>.
E-5: Telemetry uses OpenTelemetry, configured by environment variables, and never exports request bodies or personal data.
E-6: CI runs the full test suite and a secret scan on every push.

## Conformance checklist
E-C1: Is every base image pinned by digest, with a non-root user? (E-1)
E-C2: Is the database unreachable from outside the private network? (E-2)
E-C3: Do secrets come only from the secret store at runtime? (E-3)
E-C4: Does every taggable resource carry app and env tags? (E-4)
E-C5: Is telemetry OpenTelemetry, configured by environment, with no bodies or personal data? (E-5)
E-C6: Does CI run the full test suite and a secret scan on every push? (E-6)

## Resolved inconsistencies
None.
