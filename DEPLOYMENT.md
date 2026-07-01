# EC2 Deployment Guide

This project is configured for a React frontend and FastAPI backend with PostgreSQL.

## Files To Commit

Commit source code, docs, env templates, lock files, and tests that are part of the app.

Do not commit:

* `.env` files
* `backend/uploads/`
* logs
* scratch/debug scripts
* cache folders
* generated test reports
* `node_modules/`, build outputs, or virtualenvs

## Backend Environment

Create `backend/.env` on the EC2 instance from `backend/.env.example`:

```env
DATABASE_TYPE=postgres
POSTGRES_URL=postgresql://postgres:CHANGE_ME@localhost:5432/str_project
JWT_SECRET_KEY=CHANGE_ME_TO_A_LONG_RANDOM_SECRET
CORS_ORIGINS=https://your-domain.com,http://your-ec2-public-ip
PUBLIC_BACKEND_URL=https://api.your-domain.com
PUBLIC_FRONTEND_URL=https://your-domain.com
```

`MONGO_URL` is only a legacy fallback. Keep `DATABASE_TYPE=postgres` for the current app.

## Frontend Environment

Create `frontend/.env` on the EC2 instance:

```env
# Leave empty when Nginx proxies /api to the backend on the same domain/IP.
REACT_APP_BACKEND_URL=
ENABLE_HEALTH_CHECK=false
```

For local development only, use:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

## EC2 Setup

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip postgresql postgresql-contrib nginx nodejs npm
```

Create the database:

```bash
sudo -u postgres psql
CREATE DATABASE str_project;
CREATE USER str_user WITH PASSWORD 'CHANGE_ME';
GRANT ALL PRIVILEGES ON DATABASE str_project TO str_user;
\q
```

Use this DSN in `backend/.env`:

```env
POSTGRES_URL=postgresql://str_user:CHANGE_ME@localhost:5432/str_project
```

## Backend Run

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python setup_pg.py
uvicorn server:app --host 0.0.0.0 --port 8001
```

For production, run it with `systemd` or another process manager.

## Frontend Build

```bash
cd frontend
npm ci
npm run deploy:production
```

`deploy:production` uploads versioned assets first, verifies every JavaScript and
CSS file referenced by the build, and publishes `index.html` last. It retains old
hashed assets so that cached HTML cannot produce a blank page during a release.

The default production targets are:

```bash
S3_BUCKET=xspace-prod-frontend
CLOUDFRONT_DISTRIBUTION_ID=EQPC5S4OUUUUH
```

Override either environment variable before running the command for another
environment.

## Nginx Sketch

```nginx
server {
    listen 80;
    server_name your-domain.com;
    client_max_body_size 20M;

    root /var/www/goldenrichstay/frontend/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Final Checks

```bash
curl http://localhost:8001/api/health
npm run build
git status --short
```

Before pushing to GitHub, confirm that `.env`, uploads, logs, caches, and scratch folders are absent from `git status`.
