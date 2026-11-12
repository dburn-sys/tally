output "api_url" {
  value = "https://${azurerm_container_app.api.ingress[0].fqdn}"
}

output "key_vault_name" {
  value = azurerm_key_vault.tally.name
}

output "migrate_job_name" {
  value = azurerm_container_app_job.migrate.name
}
