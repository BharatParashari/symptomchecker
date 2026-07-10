# Deployment Guide — AI Symptom Checker

Full-stack deploy to a Hostinger VPS using Docker Compose. The frontend (nginx)
is the only publicly exposed service and reverse-proxies `/api` and `/socket.io`
to the backend. Postgres and MongoDB run as private containers.

---

## What you need first

- SSH access to the VPS (you have hPanel → **VPS → Browser terminal** or SSH).
- A domain/subdomain pointing at the VPS IP (e.g. `symptom.yourdomain.com`).
- Docker + Docker Compose on the VPS (install steps below).
- A strong `JWT_SECRET` and Postgres password.

Optional (features degrade gracefully if omitted):
- **ApiMedic** account → secondary diagnosis comparison. https://apimedic.com
- **ABDM sandbox** client id/secret → real hospital lookup across India. https://sandbox.abdm.gov.in

---

## 1. Install Docker on the VPS (skip if already installed)

```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker
docker --version && docker compose version
```

## 2. Get the code

```bash
cd /opt
git clone https://github.com/BharatParashari/symptomchecker.git
cd symptomchecker
```

## 3. Configure environment

```bash
cp .env.example .env
# Generate a strong JWT secret:
echo "JWT_SECRET=$(openssl rand -hex 48)" >> /tmp/secret && cat /tmp/secret
nano .env
```

Set at minimum:
- `POSTGRES_PASSWORD` — a strong password
- `JWT_SECRET` — the 96-char value you generated (the backend **refuses to start
  in production** without a valid one — this is intentional)
- `CLIENT_URL` — your public URL, e.g. `https://symptom.yourdomain.com`
- `FRONTEND_PORT` — internal host port nginx listens on (default `8080`)

## 4. Build and start

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend   # watch for the startup banner, Ctrl-C to exit
```

The backend logs should show:
```
🏥 Symptom Checker API running on http://localhost:5000
   Diagnosis engine: bayesian-differential-v1 (self-hosted)
```

Verify health:
```bash
curl http://localhost:8080/api/health
```

## 5. Put HTTPS in front (reverse proxy)

The `frontend` container listens on `FRONTEND_PORT` (8080) over plain HTTP.
Terminate TLS with a proxy on the host.

**If you already run Traefik/nginx on this VPS** (you have, for other projects),
just add a virtual host that proxies your domain → `http://127.0.0.1:8080`.

**Fresh nginx + Let's Encrypt example:**
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo tee /etc/nginx/sites-available/symptom <<'NGINX'
server {
    server_name symptom.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX
sudo ln -s /etc/nginx/sites-available/symptom /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d symptom.yourdomain.com
```

Make sure `CLIENT_URL` in `.env` matches the final HTTPS domain, then:
```bash
docker compose up -d
```

## 6. Enable optional integrations later

Edit `.env`, add the credentials, and restart the backend only:
```bash
# ApiMedic comparison source
APIMEDIC_USERNAME=...
APIMEDIC_PASSWORD=...
# ABDM real hospital lookup (India)
ABDM_CLIENT_ID=...
ABDM_CLIENT_SECRET=...

docker compose up -d backend
```
Confirm: `curl https://symptom.yourdomain.com/api/health` →
`apiMedicComparison: "enabled"` / `abdmFacilityLookup: "enabled"`.

---

## Updating after a new commit

```bash
cd /opt/symptomchecker
git pull
docker compose up -d --build
```

## Common operations

```bash
docker compose logs -f backend        # tail backend logs
docker compose restart backend        # restart one service
docker compose down                   # stop everything (keeps data volumes)
docker compose down -v                # stop AND delete data (careful)
```

## Data & backups

Postgres and Mongo persist in named volumes (`pgdata`, `mongodata`).
Back up Postgres:
```bash
docker compose exec postgres pg_dump -U symptom symptom_checker > backup_$(date +%F).sql
```

---

## Security notes baked into this build

- **JWT secret**: no hardcoded fallback; production won't boot without a strong secret.
- **Rate limiting**: global (300 / 15 min), strict auth limiter (20 failed / 15 min),
  diagnosis limiter (40 / 5 min). `trust proxy` is set so limits key off the real
  client IP behind your reverse proxy.
- **CORS**: locked to `CLIENT_URL` (supports a comma-separated allow-list).
- **helmet** security headers enabled; JSON body capped at 1 MB.
- **No fabricated medical data**: hospital lookup returns real ABDM registry
  results or an explicit "not configured" — never invented facilities.
- Only verified doctors are ever returned by the doctor-matching endpoints.
