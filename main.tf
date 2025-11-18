terraform {
  required_version = "~> 1.11"
  required_providers {
    # https://registry.terraform.io/providers/kreuzwerker/docker/latest/docs
    docker = {
      source  = "kreuzwerker/docker"
      version = "3.6.2"
    }
  }
}

variable "APP_DEV_MODE" {
  type = string
}

variable "APP_ENV_CODE" {
  type = string
}

variable "APP_ENV_NAME" {
  type = string
}

variable "APP_API_SERVICE_URL" {
  type = string
}

variable "APP_API_SERVICE_KEY" {
  type = string
}

variable "docker_host_uri" {
  type = string
}

variable "docker_image" {
  type = string
}

variable "deploy_domain" {
  type = string
}

variable "docker_container_name" {
  type = string
}

variable "ghcr_username" {
  type = string
}

variable "ghcr_token" {
  type = string
}

locals {
  current_timestamp = timestamp()
  priority          = tonumber(formatdate("YYYYMMDDhhmm", local.current_timestamp))
}

provider "docker" {
  host     = var.docker_host_uri
  ssh_opts = ["-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null"]
  registry_auth {
    address  = "ghcr.io"
    username = var.ghcr_username
    password = var.ghcr_token
  }
}

# Creating Docker Image with the `latest` as Tag.
resource "docker_image" "ai_katalogizace" {
  name = var.docker_image
}

# Create Docker Container
resource "docker_container" "ai_katalogizace" {
  memory            = 256
  count             = 1
  image             = docker_image.ai_katalogizace.image_id
  name              = var.docker_container_name
  must_run          = true
  publish_all_ports = true
  restart           = "always" # default "no"
  env = [
    "APP_DEV_MODE=${var.APP_DEV_MODE}",
    "APP_ENV_NAME=${var.APP_ENV_NAME}",
    "APP_ENV_CODE=${var.APP_ENV_CODE}",
    "APP_API_SERVICE_URL=${var.APP_API_SERVICE_URL}",
    "APP_API_SERVICE_KEY=${var.APP_API_SERVICE_KEY}"
  ]

  labels {
    label = "traefik.http.routers.${var.docker_container_name}.rule"
    value = "Host(`${var.deploy_domain}`)"
  }
  labels {
    label = "traefik.http.routers.${var.docker_container_name}.tls"
    value = true
  }
  labels {
    label = "traefik.http.routers.${var.docker_container_name}.tls.certresolver"
    value = "myresolver"
  }
  labels {
    label = "traefik.http.routers.${var.docker_container_name}.priority"
    value = local.priority
  }
}
