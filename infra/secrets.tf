# Secrets live in Key Vault and reach containers at runtime through a managed
# identity (E-3). Generated values never appear in variables or images.
# Payrail's API key and webhook secret are set by hand, once per environment:
#   az keyvault secret set --vault-name kv-tally-<env> --name payrail-api-key --value ...
#   az keyvault secret set --vault-name kv-tally-<env> --name payrail-webhook-secret --value ...

resource "azurerm_key_vault" "tally" {
  name                       = "kv-${local.name}"
  resource_group_name        = azurerm_resource_group.tally.name
  location                   = azurerm_resource_group.tally.location
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  rbac_authorization_enabled = true
  purge_protection_enabled   = true
  soft_delete_retention_days = 90
  tags                       = local.tags
}

resource "azurerm_role_assignment" "deployer_secrets" {
  scope                = azurerm_key_vault.tally.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "random_password" "signing_key" {
  length  = 64
  special = false
}

locals {
  generated_secrets = {
    "tally-signing-key"   = random_password.signing_key.result
    "tally-app-password"  = random_password.db_app.result
    "database-url"        = "postgres://tally_app:${random_password.db_app.result}@${azurerm_postgresql_flexible_server.db.fqdn}:5432/tally?sslmode=require"
    "migration-database-url" = "postgres://tally_owner:${random_password.db_owner.result}@${azurerm_postgresql_flexible_server.db.fqdn}:5432/tally?sslmode=require"
  }
}

resource "azurerm_key_vault_secret" "generated" {
  for_each        = local.generated_secrets
  name            = each.key
  value           = each.value
  key_vault_id    = azurerm_key_vault.tally.id
  content_type    = "text/plain"
  expiration_date = "2027-12-31T00:00:00Z"
  tags            = local.tags

  depends_on = [azurerm_role_assignment.deployer_secrets]
}

resource "azurerm_user_assigned_identity" "api" {
  name                = "id-${local.name}-api"
  resource_group_name = azurerm_resource_group.tally.name
  location            = azurerm_resource_group.tally.location
  tags                = local.tags
}

resource "azurerm_role_assignment" "api_secrets" {
  scope                = azurerm_key_vault.tally.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.api.principal_id
}
