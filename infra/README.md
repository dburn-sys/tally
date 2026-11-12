# Tally infrastructure (Azure)

Terraform for one environment: a Container App for the API, a Container App Job
for migrations, Postgres Flexible Server on a private subnet, and Key Vault.
The architecture rules this must keep are in `.gantry/architecture/E-cloud.md`.

```bash
terraform init -backend-config=backend.dev.hcl
terraform plan -var env=dev -var api_image=<registry>/tally-api@sha256:<digest>
```

Before the first deploy of an environment, set Payrail's two secrets in Key Vault
(see `secrets.tf`). Before each deploy, run the migration job:
`az containerapp job start -n <migrate_job_name> -g rg-tally-<env>`.
