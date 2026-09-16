# Checkup360 Infrastructure

Infrastructure management, local development environments, End-to-End (E2E) testing suites, and deployment configuration for **Checkup360**.

---

## Repository Overview

- **`docker-compose.dev.yml`**: Baseline containerized services for local development (PostgreSQL 16 and Dozzle log viewer).
- **`e2e/`**: Full Playwright End-to-End testing suite with integrated docker compose definitions.
- **`versions/`**: Declarative GitOps version manifests (`staging.yml` and `prod.yml`) pinning active container versions.
- **`ansible/`**: Playbooks and roles for server provisioning, firewall configuration, and automated deployments with Caddy. See [`ansible/README.md`](ansible/README.md).

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose v2+
- `make` (GNU Make)
- [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) (for executing E2E tests)

---

## Local Environment: Database & Container Logs

To spin up the local PostgreSQL database and Dozzle container log viewer:

```bash
cd infra
make db-up
```

- **PostgreSQL:** `localhost:5432` (credentials configured in `.env`).
- **Dozzle (Web Log Viewer):** `http://localhost:8080/dozzle`.

---

## End-to-End (E2E) Testing with Playwright

The E2E suite launches the complete containerized application stack (`db`, `engine`, `backend`, `web`, `dashboard`, `backoffice`, `cms`) and runs automated browser tests.

### 1. Initial One-time Setup

```bash
make e2e-install
```

### 2. Start the Local E2E Stack

```bash
make e2e-up
```

### 3. Run the Playwright Suite

```bash
make e2e-test
```

*(Or spin up the stack and run tests in a single command: `make e2e`)*

### Additional E2E Commands:

```bash
# Follow live logs from all services in the E2E stack
make e2e-logs

# Re-run superuser seed inside the running backend container
make e2e-seed

# Stop E2E containers
make e2e-down

# Stop and wipe database volume
make e2e-down-volumes
```

---

## Deployment Workflow

Checkup360 uses declarative version pinning in `versions/` to manage releases:

1. **Deploy to Staging:** Update the service version in `versions/staging.yml` on the `main` branch. The `auto-deploy-staging` workflow triggers Ansible to deploy the release to the staging server.
2. **Promote to Production:** Once staging deployment succeeds and is verified, GitHub Actions automatically opens a Pull Request updating `versions/prod.yml`. Reviewing and merging that PR triggers the production deployment.

For manual deployments and server provisioning, refer to [`ansible/README.md`](ansible/README.md).
