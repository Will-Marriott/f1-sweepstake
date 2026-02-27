# F1 Sweepstake - Deployment Guide

## Prerequisites

- Raspberry Pi 5 running a 64-bit OS (e.g. Raspberry Pi OS Lite 64-bit)
- Docker and Docker Compose installed
- Git installed

### Installing Docker on Raspberry Pi

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group change to take effect
```

---

## Initial Deployment

### 1. Clone the repository

```bash
git clone <your-repo-url> f1-sweepstake
cd f1-sweepstake
```

### 2. Build and start

```bash
docker compose up -d --build
```

This will:

1. Build the Next.js app in a multi-stage Docker build
2. Automatically run Prisma migrations on startup (creating the SQLite database if it doesn't exist)
3. Start the Next.js server on port 3000
4. Start a lightweight cron sidecar container that triggers the API endpoints every hour

### 3. Verify it's running

```bash
# Check container status
docker compose ps

# Check app logs
docker compose logs app

# Check cron logs
docker compose logs cron
```

The app will be available at `http://<your-pi-ip>:3000`.

---

## Updating the App

When you have new code changes to deploy:

```bash
cd f1-sweepstake

# Pull latest changes
git pull

# Rebuild and restart (--build forces a fresh image build)
docker compose up -d --build
```

The entrypoint script runs `prisma migrate deploy` every time the container starts, so any new migrations included in the update will be applied automatically.

### Zero-downtime consideration

The app will have a brief downtime during the restart. On a Raspberry Pi this is typically 30-60 seconds for the container to rebuild and start. For this use case that's acceptable.

---

## Database

### Where is the data stored?

The SQLite database is stored in a Docker named volume called `f1-data`. This persists across container rebuilds and restarts.

### Backup the database

```bash
# Find the volume mount path
docker volume inspect f1-sweepstake_f1-data

# Copy the database file out of the container
docker cp f1-sweepstake:/app/data/f1-sweepstake.db ./backup-f1-sweepstake.db
```

### Restore a backup

```bash
docker cp ./backup-f1-sweepstake.db f1-sweepstake:/app/data/f1-sweepstake.db
docker compose restart app
```

---

## Cron Jobs

Two cron jobs run in a separate lightweight Alpine container:

| Job              | Schedule          | Endpoint                         |
| ---------------- | ----------------- | -------------------------------- |
| Allocate Drivers | Every hour at :00 | `POST /api/allocate-drivers`     |
| Process Results  | Every hour at :30 | `POST /api/process-last-results` |

The jobs are staggered by 30 minutes to avoid hitting the external F1 API simultaneously.

### Viewing cron output

```bash
docker compose logs -f cron
```

### Manually triggering jobs

```bash
# Allocate drivers
curl -X POST http://localhost:3000/api/allocate-drivers

# Process results
curl -X POST http://localhost:3000/api/process-last-results
```

---

## Useful Commands

```bash
# Stop everything
docker compose down

# Stop everything AND delete the database volume (fresh start)
docker compose down -v

# Restart just the app (keeps cron running)
docker compose restart app

# View live logs
docker compose logs -f

# Shell into the app container
docker exec -it f1-sweepstake sh
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs for errors
docker compose logs app
```

Common issues:

- **Migration errors**: Check that the Prisma schema and migration files are correct
- **Port already in use**: Another process is using port 3000. Change the port mapping in `docker-compose.yml` (e.g. `"3001:3000"`)

### Cron jobs not firing

```bash
# Check the cron container is running
docker compose ps cron

# Check cron logs
docker compose logs cron
```

### Database issues

If you need to reset the database completely:

```bash
docker compose down -v
docker compose up -d --build
```

This deletes the volume and creates a fresh database with all migrations applied.
