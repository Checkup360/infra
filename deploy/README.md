# Deploy de Checkup360

Esta carpeta contiene los archivos necesarios para correr la infraestructura de `staging` o `prod` en un servidor Ubuntu:

- `startup.sh`: prepara el servidor con Docker, Docker Compose, `curl` y firewall.
- `docker-compose.yml`: levanta Postgres, backend, frontends y Caddy.
- `Caddyfile`: expone los dominios HTTPS y enruta el trafico a cada servicio.
- `.env.example`: plantilla de variables de entorno para cada ambiente.


## Preparar el servidor

Copiar `startup.sh` al servidor y ejecutarlo indicando el ambiente:

```bash
chmod +x startup.sh
sudo ./startup.sh staging
```

Para produccion:

```bash
sudo ./startup.sh prod
```

El script:

- actualiza paquetes del sistema;
- instala Docker, Docker Compose v2, `curl` y `ufw`;
- habilita e inicia Docker;
- abre los puertos SSH, HTTP y HTTPS;
- crea la carpeta `/opt/app/deploy/$ENVIRONMENT`.

`$ENVIRONMENT` solo puede ser `staging` o `prod`.

## Copiar archivos de deploy

Copiar estos archivos al servidor dentro de la carpeta del ambiente:

```bash
/opt/app/deploy/staging
```

o:

```bash
/opt/app/deploy/prod
```

Archivos requeridos:

- `docker-compose.yml`
- `Caddyfile`


## Deploy desde GitHub Actions

Crear un environment de GitHub por cada ambiente (`staging` y `prod`) y cargar los secrets necesarios para conectarse al servidor y generar el `.env`.

Secrets esperados:

- `ENV_FILE`: contenido completo del `.env` del ambiente, indicado en la sección siguiente.
- `DEPLOY_SERVER_HOST`: IP publica o hostname del servidor.
- `DEPLOY_SSH_KEY`: clave SSH privada para acceder al servidor.
- `DEPLOY_SSH_USER`: usuario SSH del servidor.
- `API_HOST`: dominio de la API.


## Variables dentro de ENV_FILE

Variables principales:

- `POSTGRES_USER`: usuario de Postgres.
- `POSTGRES_PASSWORD`: password de Postgres.
- `POSTGRES_DB`: nombre de la base de datos del ambiente.
- `AUTH_SECRET`: secreto de autenticacion del backend.
- `GOOGLE_CLIENT_ID`: client ID de Google OAuth.
- `GOOGLE_CLIENT_SECRET`: client secret de Google OAuth.
- `API_HOST`: dominio de la API.
- `WEB_HOST`: dominio del sitio web principal.
- `DASHBOARD_HOST`: dominio del dashboard.
- `BACKOFFICE_HOST`: dominio del backoffice.
- `CADDY_EMAIL`: email usado por Caddy para certificados TLS.
- `PUBLIC_WEB_ORIGIN`: origen publico del sitio web.
- `PUBLIC_DASHBOARD_ORIGIN`: origen publico del dashboard.
- `PUBLIC_BACKOFFICE_ORIGIN`: origen publico del backoffice.
- `CORS_ALLOWED_ORIGINS`: lista de origenes permitidos por CORS.
- `IMAGE_REGISTRY`: registry donde estan publicadas las imagenes.
- `BACKEND_VERSION`: tag de la imagen del backend.
- `FRONTENDS_VERSION`: tag de las imagenes de frontend.
- `SUPERUSER_EMAIL`: email del superusuario inicial.
- `SUPERUSER_PASSWORD`: password del superusuario inicial.
- `SEED_OVERWRITE`: usar `true` solo si se quieren sobrescribir datos de seed.

Importante: `PUBLIC_WEB_ORIGIN`, `PUBLIC_DASHBOARD_ORIGIN`, `PUBLIC_BACKOFFICE_ORIGIN` y `CORS_ALLOWED_ORIGINS` deben usar `https://`.

