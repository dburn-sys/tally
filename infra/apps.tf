resource "azurerm_container_app_environment" "tally" {
  name                       = "cae-${local.name}"
  resource_group_name        = azurerm_resource_group.tally.name
  location                   = azurerm_resource_group.tally.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.tally.id
  infrastructure_subnet_id   = azurerm_subnet.apps.id
  tags                       = local.tags
}

locals {
  # Container secret name -> Key Vault secret name. Values are read at runtime.
  api_secrets = {
    "database-url"           = "database-url"
    "tally-signing-key"      = "tally-signing-key"
    "payrail-api-key"        = "payrail-api-key"
    "payrail-webhook-secret" = "payrail-webhook-secret"
  }
  api_env_from_secrets = {
    DATABASE_URL           = "database-url"
    TALLY_SIGNING_KEY      = "tally-signing-key"
    PAYRAIL_API_KEY        = "payrail-api-key"
    PAYRAIL_WEBHOOK_SECRET = "payrail-webhook-secret"
  }
}

resource "azurerm_container_app" "api" {
  name                         = "ca-${local.name}-api"
  container_app_environment_id = azurerm_container_app_environment.tally.id
  resource_group_name          = azurerm_resource_group.tally.name
  revision_mode                = "Single"
  tags                         = local.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.api.id]
  }

  dynamic "secret" {
    for_each = local.api_secrets
    content {
      name                = secret.key
      key_vault_secret_id = "${azurerm_key_vault.tally.vault_uri}secrets/${secret.value}"
      identity            = azurerm_user_assigned_identity.api.id
    }
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    transport        = "http"
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = var.env == "prod" ? 2 : 1
    max_replicas = var.env == "prod" ? 6 : 2

    container {
      name   = "api"
      image  = var.api_image
      cpu    = 0.5
      memory = "1Gi"

      dynamic "env" {
        for_each = local.api_env_from_secrets
        content {
          name        = env.key
          secret_name = env.value
        }
      }
      env {
        name  = "TALLY_ENV"
        value = var.env
      }
      env {
        name  = "OTEL_SERVICE_NAME"
        value = "tally-api"
      }
      env {
        name  = "OTEL_EXPORTER_OTLP_ENDPOINT"
        value = var.otel_endpoint
      }

      liveness_probe {
        transport = "HTTP"
        port      = 3000
        path      = "/healthz"
      }
    }
  }

  depends_on = [azurerm_role_assignment.api_secrets]
}

# Migrations run inside the private network as a manual job, before each deploy.
resource "azurerm_container_app_job" "migrate" {
  name                         = "caj-${local.name}-migrate"
  location                     = azurerm_resource_group.tally.location
  resource_group_name          = azurerm_resource_group.tally.name
  container_app_environment_id = azurerm_container_app_environment.tally.id
  replica_timeout_in_seconds   = 600
  replica_retry_limit          = 0
  tags                         = local.tags

  manual_trigger_config {
    parallelism              = 1
    replica_completion_count = 1
  }

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.api.id]
  }

  secret {
    name                = "migration-database-url"
    key_vault_secret_id = "${azurerm_key_vault.tally.vault_uri}secrets/migration-database-url"
    identity            = azurerm_user_assigned_identity.api.id
  }
  secret {
    name                = "tally-app-password"
    key_vault_secret_id = "${azurerm_key_vault.tally.vault_uri}secrets/tally-app-password"
    identity            = azurerm_user_assigned_identity.api.id
  }

  template {
    container {
      name    = "migrate"
      image   = var.api_image
      cpu     = 0.25
      memory  = "0.5Gi"
      command = ["node", "dist/scripts/migrate.js"]
      env {
        name        = "MIGRATION_DATABASE_URL"
        secret_name = "migration-database-url"
      }
      env {
        name        = "TALLY_APP_PASSWORD"
        secret_name = "tally-app-password"
      }
    }
  }

  depends_on = [azurerm_role_assignment.api_secrets]
}
