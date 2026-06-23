# ResourceSpace Staging Host

Purpose: run ResourceSpace outside Vercel for the 10-person cloud beta.

This folder is safe to commit because it contains templates only. Never commit real `.env`, API keys, database passwords, TLS keys, database dumps, or filestore media.

## Host Target

- Ubuntu 24.04 VM or equivalent managed container host
- 2-4 vCPU minimum
- 8 GB RAM minimum
- 80-200 GB persistent disk for beta media
- daily snapshots enabled
- DNS example: `dam-staging.tjc.org`

## Install

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Copy this folder to the VM, then create real config files:

```bash
./scripts/cloud-resourcespace-bootstrap.sh infra/resourcespace-staging/resourcespace-docker
cp .env.staging.example .env
cp resourcespace-config.php.example resourcespace-config.php
```

Edit secrets on the VM only.

## Start

```bash
mkdir -p data/filestore data/mariadb backups
docker compose --env-file .env -f docker-compose.staging.yml up -d
```

## Verify

```bash
curl -I http://127.0.0.1:8080
curl -I https://dam-staging.tjc.org
docker compose --env-file .env -f docker-compose.staging.yml ps
```

Manual checks:

- login works
- search works
- thumbnail preview works
- collection/album exists
- upload into intake collection works if enabled
- original/source files are not public

## Backup

Database:

```bash
docker compose --env-file .env -f docker-compose.staging.yml exec -T mariadb \
  mariadb-dump -u root -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE" > backups/resourcespace-$(date -u +%Y%m%dT%H%M%SZ).sql
```

Filestore:

```bash
tar -C data -czf backups/filestore-$(date -u +%Y%m%dT%H%M%SZ).tar.gz filestore
```

Do not copy media dumps into Git.
