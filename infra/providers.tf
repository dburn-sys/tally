terraform {
  required_version = ">= 1.9"
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 4.40" }
    random  = { source = "hashicorp/random", version = "~> 3.7" }
  }
  # State lives in a storage account created once by hand. Supply the rest with
  # `terraform init -backend-config=backend.<env>.hcl`.
  backend "azurerm" {}
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
    }
  }
}
