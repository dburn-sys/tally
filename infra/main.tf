locals {
  name = "tally-${var.env}"
  tags = { app = "tally", env = var.env } # E-4
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "tally" {
  name     = "rg-${local.name}"
  location = var.location
  tags     = local.tags
}

resource "azurerm_log_analytics_workspace" "tally" {
  name                = "log-${local.name}"
  resource_group_name = azurerm_resource_group.tally.name
  location            = azurerm_resource_group.tally.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

# --- Network: the database is reachable only inside this network (E-2) ----------

resource "azurerm_virtual_network" "tally" {
  name                = "vnet-${local.name}"
  resource_group_name = azurerm_resource_group.tally.name
  location            = azurerm_resource_group.tally.location
  address_space       = ["10.20.0.0/16"]
  tags                = local.tags
}

resource "azurerm_subnet" "apps" {
  name                 = "snet-apps"
  resource_group_name  = azurerm_resource_group.tally.name
  virtual_network_name = azurerm_virtual_network.tally.name
  address_prefixes     = ["10.20.0.0/23"]
  delegation {
    name = "container-apps"
    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_subnet" "db" {
  name                 = "snet-db"
  resource_group_name  = azurerm_resource_group.tally.name
  virtual_network_name = azurerm_virtual_network.tally.name
  address_prefixes     = ["10.20.4.0/24"]
  delegation {
    name = "postgres"
    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_private_dns_zone" "db" {
  name                = "${local.name}.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.tally.name
  tags                = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "db" {
  name                  = "db-link"
  resource_group_name   = azurerm_resource_group.tally.name
  private_dns_zone_name = azurerm_private_dns_zone.db.name
  virtual_network_id    = azurerm_virtual_network.tally.id
  tags                  = local.tags
}

# Only the apps subnet (the API and the migration job) can reach Postgres (E-2).
resource "azurerm_network_security_group" "db" {
  name                = "nsg-${local.name}-db"
  resource_group_name = azurerm_resource_group.tally.name
  location            = azurerm_resource_group.tally.location
  tags                = local.tags

  security_rule {
    name                       = "postgres-from-apps"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5432"
    source_address_prefix      = "10.20.0.0/23"
    destination_address_prefix = "*"
  }
  security_rule {
    name                       = "deny-other-inbound"
    priority                   = 4000
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "db" {
  subnet_id                 = azurerm_subnet.db.id
  network_security_group_id = azurerm_network_security_group.db.id
}

resource "azurerm_network_security_group" "apps" {
  name                = "nsg-${local.name}-apps"
  resource_group_name = azurerm_resource_group.tally.name
  location            = azurerm_resource_group.tally.location
  tags                = local.tags
}

resource "azurerm_subnet_network_security_group_association" "apps" {
  subnet_id                 = azurerm_subnet.apps.id
  network_security_group_id = azurerm_network_security_group.apps.id
}
