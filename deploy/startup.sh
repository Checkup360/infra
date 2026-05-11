#!/usr/bin/env bash

set -e

apt update
apt upgrade -y

apt install -y \
  docker.io \
  docker-compose-v2 \
  curl \
  ufw \
  certbot

systemctl enable docker
systemctl start docker

ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable

mkdir -p /opt/app

apt autoremove -y

# To certify a domain with certbot, run the following command and follow the instructions:
# certbot certonly --standalone -d your-domain.com