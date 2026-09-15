# Checkup360 Infrastructure with Ansible

This directory contains the configuration to provision servers and perform automated deployments of Checkup360 using **Ansible**. All commands below are run from the `infra/` repository root.

---

## 1. Structure

- **`inventory/hosts.yml`**: Server definitions by environment (`staging` and `prod`).
- **`inventory/group_vars/<environment>/vars.yml`**: Plaintext configuration variables (domains, ports, database names, emails).
- **`inventory/group_vars/<environment>/vault.yml`**: Encrypted secrets with `ansible-vault` (DB passwords, JWT secrets, OAuth credentials, SMTP).
- **`roles/vps_setup`**: OS provisioning: Docker, log rotation in `daemon.json`, and UFW firewall.
- **`roles/app_deploy`**: Application deployment. Contains `docker-compose.yml` and `Caddyfile` in `files/`, the `.env` template in `templates/`, image pull, Caddy reload (only when config changes) and healthcheck.
- **`site.yml`**: Playbook for initial VPS provisioning.
- **`deploy.yml`**: Deployment playbook invoked by GitHub Actions on each release.

---

## 2. Setting up Secrets (`vault.yml`)

For each environment (`staging` and `prod`):

1. Edit `inventory/group_vars/<environment>/vault.yml` and fill in the real secret values:
   ```yaml
   vault_postgres_password: "..."
   vault_auth_secret: "..."
   vault_google_client_id: "..."
   vault_google_client_secret: "..."
   vault_payload_secret: "..."
   vault_superuser_password: "..."
   vault_smtp_user: "..."
   vault_smtp_password: "..."
   ```

2. Encrypt the file with a secure password:
   ```bash
   ansible-vault encrypt ansible/inventory/group_vars/staging/vault.yml
   ansible-vault encrypt ansible/inventory/group_vars/prod/vault.yml
   ```
   *(This password is what you'll store in GitHub Secrets as `ANSIBLE_VAULT_PASSWORD` for each Environment).*

3. To view or edit the file in the future:
   ```bash
   ansible-vault edit ansible/inventory/group_vars/staging/vault.yml
   ```

---

## 3. Provisioning a new VPS (`site.yml`)

To configure a freshly created Ubuntu server:

```bash
ansible-playbook -i ansible/inventory/hosts.yml ansible/site.yml \
  -l <staging|prod> \
  -e "server_host=SERVER_IP" \
  -e "deploy_user=ubuntu"
```

This will:
- Update the system and install Docker, Compose, curl and UFW.
- Configure `/etc/docker/daemon.json` so container logs don't exceed 60MB each.
- Open ports 22 (SSH), 80 (HTTP) and 443 (HTTPS TCP/UDP).
- Create the `/opt/app/deploy/<environment>` directory.

---

## 4. Manual Deployment (`deploy.yml`)

To deploy manually from your terminal:

```bash
export DEPLOY_SERVER_HOST=SERVER_IP
export DEPLOY_SSH_USER=ubuntu
export ORG_PAT=YOUR_GITHUB_PAT
export GITHUB_ACTOR=your-github-username

ansible-playbook -i ansible/inventory/hosts.yml ansible/deploy.yml \
  -l <staging|prod> \
  --ask-vault-pass \
  -e "backend_version=v0.3" \
  -e "frontends_version=v0.5" \
  -e "cms_version=v0.1.5" \
  -e "engine_version=v0.0.1"
```

All other variables (domains, database names, CORS origins, etc.) are automatically loaded from `group_vars/<environment>/vars.yml` and `group_vars/<environment>/vault.yml`.

---

## 5. GitHub Actions Secrets

Each GitHub Environment (`staging` and `prod`) requires the following secrets:

- `DEPLOY_SERVER_HOST`: VPS IP or hostname.
- `DEPLOY_SSH_USER`: SSH user (e.g. `ubuntu` or `root`).
- `DEPLOY_SSH_KEY`: SSH private key.
- `ORG_PAT`: Personal Access Token for pulling images from GHCR.
- `ANSIBLE_VAULT_PASSWORD`: The password used to encrypt the `vault.yml` for that environment.
