# No secret is a Terraform variable (E-3). Generated secrets come from
# random_password and go straight into Key Vault; Payrail's are set there by hand.

variable "env" {
  description = "Environment name: dev, staging, or prod."
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.env)
    error_message = "env must be dev, staging, or prod."
  }
}

variable "location" {
  description = "Azure region."
  type        = string
  default     = "eastus2"
}

variable "api_image" {
  description = "API image, pinned by digest: <registry>/tally-api@sha256:<digest>."
  type        = string
  validation {
    condition     = can(regex("@sha256:[0-9a-f]{64}$", var.api_image))
    error_message = "api_image must be pinned by digest (architecture rule E-1)."
  }
}

variable "otel_endpoint" {
  description = "OTLP/HTTP endpoint for traces. Empty turns tracing off."
  type        = string
  default     = ""
}
