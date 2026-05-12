#!/usr/bin/env bash

set -e

ENVIRONMENT="$1"

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "prod" ]; then
  echo "Uso: $0 [staging|prod]"
  exit 1
fi

apt update
apt upgrade -y

apt install -y \
  docker.io \
  docker-compose-v2 \
  curl \
  ufw

systemctl enable docker
systemctl start docker

ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable

mkdir -p "/opt/app/deploy/$ENVIRONMENT"

apt autoremove -y