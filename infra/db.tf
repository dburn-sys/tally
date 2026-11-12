resource "random_password" "db_owner" {
  length  = 32
  special = false
}

resource "random_password" "db_app" {
  length  = 32
  special = false
}

# Private access only: a delegated subnet and private DNS, no public endpoint (E-2).
resource "azurerm_postgresql_flexible_server" "db" {
  name                          = "psql-${local.name}"
  resource_group_name           = azurerm_resource_group.tally.name
  location                      = azurerm_resource_group.tally.location
  version                       = "16"
  sku_name                      = var.env == "prod" ? "GP_Standard_D2ds_v5" : "B_Standard_B1ms"
  storage_mb                    = 32768
  backup_retention_days         = var.env == "prod" ? 35 : 7
  geo_redundant_backup_enabled  = var.env == "prod"
  delegated_subnet_id           = azurerm_subnet.db.id
  private_dns_zone_id           = azurerm_private_dns_zone.db.id
  public_network_access_enabled = false
  administrator_login           = "tally_owner"
  administrator_password        = random_password.db_owner.result
  zone                          = "1"
  tags                          = local.tags

  depends_on = [azurerm_private_dns_zone_virtual_network_link.db]
}

resource "azurerm_postgresql_flexible_server_database" "tally" {
  name      = "tally"
  server_id = azurerm_postgresql_flexible_server.db.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_configuration" "require_tls" {
  name      = "require_secure_transport"
  server_id = azurerm_postgresql_flexible_server.db.id
  value     = "on"
}
