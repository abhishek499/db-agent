# Deployment Guide

## Production Build

### 1. Build the frontend

```bash
cd frontend
npm run build
```

This produces `frontend/dist/` with static files. FastAPI is configured to serve them automatically — no separate static file server needed.

### 2. Set environment variables

At minimum, set:

```env
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=<long random string>
```

Generate a secure `JWT_SECRET`:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Run the server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

For production, use a process manager like Gunicorn with the Uvicorn worker:

```bash
pip install gunicorn
gunicorn app.main:app \
  -w 2 \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

---

## Docker

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

# Copy source
COPY app/ ./app/

# Copy built frontend (run `npm run build` first)
COPY frontend/dist/ ./frontend/dist/

# Storage directories (mount as volumes in production)
RUN mkdir -p agents/drafts users

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml

```yaml
services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - AGENTS_DIR=/data/agents
      - USERS_DIR=/data/users
    volumes:
      - db-agent-data:/data
    restart: unless-stopped

volumes:
  db-agent-data:
```

---

## Reverse Proxy (Nginx)

Example Nginx config for serving DB Agent behind a reverse proxy with TLS:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /etc/ssl/certs/yourdomain.com.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;

    location / {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

---

## Database URIs in Production

Database URIs are stored in agent JSON files on disk. They are never logged or returned via the API. The `db_uri` field is present on `AgentConfig` but is excluded from all API responses (only the `db_type` string is exposed).

If you rotate a database password, you must update the corresponding agent's JSON file manually or re-run the onboarding wizard to create a new agent.

For databases that require TLS, append the appropriate query parameters to the URI:

```
# PostgreSQL with SSL
postgresql://user:pass@host:5432/dbname?sslmode=require

# MySQL with SSL
mysql+pymysql://user:pass@host:3306/dbname?ssl_ca=/path/to/ca.pem

# MongoDB with TLS
mongodb://user:pass@host:27017/dbname?tls=true&tlsCAFile=/path/to/ca.pem
```

---

## Persistent Storage

By default, agents and users are stored in `./agents/` and `./users/` relative to the working directory. In any deployment where the filesystem is ephemeral (e.g., containers), mount these directories as persistent volumes and point the app to them via environment variables:

```env
AGENTS_DIR=/data/agents
USERS_DIR=/data/users
```

---

## Health Check

`GET /health` returns `{"status": "ok"}` with no authentication. Use this for load balancer or container health probes:

```yaml
# Docker Compose healthcheck
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
  interval: 30s
  timeout: 5s
  retries: 3
```

---

## Security Checklist

Before deploying to production:

- [ ] `JWT_SECRET` is a long random value (32+ bytes), not a default or guessable string
- [ ] `ANTHROPIC_API_KEY` is set via environment variable, not committed to source control
- [ ] Agent/user data directories are not publicly accessible
- [ ] TLS is configured (via reverse proxy)
- [ ] `AGENTS_DIR` and `USERS_DIR` are on persistent storage
- [ ] Backups are configured for the data directories
- [ ] Consider rate limiting on auth endpoints to prevent brute-force attacks
