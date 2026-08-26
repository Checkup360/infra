SHELL := /usr/bin/env bash

COMPOSE_E2E       := docker compose -f docker-compose.e2e.yml --env-file .env.e2e
COMPOSE_E2E_LOCAL := docker compose -f docker-compose.e2e.yml -f docker-compose.e2e.local.yml --env-file .env.e2e

APP_SERVICES := db motor backend web dashboard backoffice

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

.PHONY: db-up
db-up: # for local dev
	docker compose -f docker-compose.dev.yml up

.PHONY: e2e-build
e2e-build: ## Build backend + 3 frontend images from sibling repos
	$(COMPOSE_E2E_LOCAL) build

.PHONY: e2e-up
e2e-up: ## Bring up db + backend + frontends, locally built
	$(COMPOSE_E2E_LOCAL) up -d --build $(APP_SERVICES)

.PHONY: e2e-down
e2e-down: ## Stop and remove the e2e stack
	$(COMPOSE_E2E_LOCAL) down

.PHONY: e2e-down-volumes
e2e-down-volumes: ## Stop and wipe the e2e stack including the postgres volume
	$(COMPOSE_E2E_LOCAL) down -v

.PHONY: e2e-logs
e2e-logs: ## Tail logs from all e2e services
	$(COMPOSE_E2E_LOCAL) logs -f

.PHONY: e2e-seed
e2e-seed: ## Re-run the seed against a running e2e stack
	$(COMPOSE_E2E_LOCAL) exec backend /app/entrypoint.sh seed-superuser

.PHONY: e2e-install
e2e-install: ## One-time setup: install e2e deps + chromium (run once / when deps change)
	cd e2e && pnpm install --frozen-lockfile
	cd e2e && pnpm exec playwright install --with-deps chromium

.PHONY: e2e-test
e2e-test: ## Run the playwright suite against an already-running stack
	@test -d e2e/node_modules || { echo "e2e/node_modules missing — run 'make e2e-install' first"; exit 1; }
	@set -a; [ -f .env.e2e ] && . ./.env.e2e; set +a; \
		cd e2e && pnpm test

.PHONY: e2e
e2e: e2e-up e2e-test ## Up + tests

.PHONY: e2e-up-remote
e2e-up-remote: ## Pull pinned GHCR images and bring up the stack (CI-style)
	$(COMPOSE_E2E) pull
	$(COMPOSE_E2E) up -d $(APP_SERVICES)
