# Dokploy Deployment Guide

This guide explains how to deploy Markah to Dokploy on a VPS.

## Prerequisites

- Dokploy instance running on your VPS
- Domain or subdomain configured (e.g., `markah.yourdomain.com`)
- Git repository (GitHub, GitLab, or self-hosted)
- Access to Dokploy dashboard

## Deployment Options

Dokploy supports two deployment methods. Choose one:

### Option 1: Dockerfile Deployment (Recommended)

This uses the existing `Dockerfile` and lets Dokploy handle the database separately.

### Option 2: Docker Compose Deployment

This deploys both the app and PostgreSQL together using `docker-compose.yml`.

---

## Option 1: Dockerfile Deployment (Recommended)

### Step 1: Prepare Your Repository

Ensure your repository includes:
- `Dockerfile` ✅ (already present)
- `.dockerignore` ✅ (already present)
- `docker-entrypoint.sh` ✅ (already present)
- `next.config.ts` with `output: "standalone"` ✅ (already configured)

### Step 2: Create Dokploy Application

1. **Login to Dokploy Dashboard**
   - Navigate to your Dokploy instance
   - Go to "Applications" → "New Application"

2. **Configure Application**
   - **Name**: `markah`
   - **Source**: Connect your Git repository (GitHub/GitLab)
   - **Branch**: `main` (or your deployment branch)
   - **Build Pack**: `Dockerfile`
   - **Dockerfile Path**: `./Dockerfile` (default)
   - **Port**: `3000`

3. **Set Up Database Service**

   In Dokploy, create a PostgreSQL service:
   - **Service Type**: PostgreSQL
   - **Version**: `16-alpine`
   - **Database Name**: `markah`
   - **Username**: `markah`
   - **Password**: Generate a strong password (save it!)
   - **Volume**: Create persistent volume for data

   **Note**: Dokploy will provide a connection string. You'll use this in environment variables.

### Step 3: Configure Environment Variables

In Dokploy application settings, add these environment variables:

```bash
# Database (use the connection string from Dokploy PostgreSQL service)
DATABASE_URL=postgresql://markah:YOUR_PASSWORD@postgres-service:5432/markah

# NextAuth Configuration
NEXTAUTH_SECRET=your-super-secret-key-here-generate-with-openssl-rand-base64-32
NEXTAUTH_URL=https://markah.yourdomain.com

# Optional: AI Tag Suggestions
LLM_PROVIDER=claude  # or: openai | ollama
LLM_API_KEY=your-llm-api-key-here
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Step 4: Configure Domain/Subdomain

1. **In Dokploy Application Settings:**
   - **Domain**: `markah.yourdomain.com`
   - **SSL**: Enable automatic SSL (Let's Encrypt)

2. **DNS Configuration:**
   - Add A record: `markah.yourdomain.com` → Your VPS IP
   - Or CNAME: `markah.yourdomain.com` → `your-vps-domain.com`

### Step 5: Deploy

1. Click "Deploy" in Dokploy
2. Dokploy will:
   - Clone your repository
   - Build the Docker image using `Dockerfile`
   - Run migrations via `docker-entrypoint.sh`
   - Start the application
   - Set up reverse proxy and SSL

### Step 6: Verify Deployment

1. **Check Health Endpoint:**
   ```
   https://markah.yourdomain.com/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Access Application:**
   ```
   https://markah.yourdomain.com
   ```

3. **Test Registration:**
   - Create a new account
   - Login and verify dashboard loads

---

## Option 2: Docker Compose Deployment

If Dokploy supports Docker Compose deployments, you can deploy both app and database together.

### Step 1: Modify docker-compose.yml for Production

Create a production-ready `docker-compose.prod.yml`:

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://markah:${POSTGRES_PASSWORD}@postgres:5432/markah
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - LLM_PROVIDER=${LLM_PROVIDER:-}
      - LLM_API_KEY=${LLM_API_KEY:-}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - markah-network

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=markah
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=markah
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U markah -d markah"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - markah-network

volumes:
  postgres_data:

networks:
  markah-network:
    driver: bridge
```

### Step 2: Configure in Dokploy

1. **Application Type**: Docker Compose
2. **Compose File**: `docker-compose.prod.yml`
3. **Environment Variables**: Same as Option 1
4. **Port**: `3000` (app service)

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_SECRET` | Secret for JWT signing | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Public URL of your app | `https://markah.yourdomain.com` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `LLM_PROVIDER` | AI provider for tag suggestions | `claude`, `openai`, or `ollama` |
| `LLM_API_KEY` | API key for LLM provider | Your provider's API key |

---

## Post-Deployment

### Initial Setup

1. **Seed Test Data (Optional):**
   ```bash
   # SSH into Dokploy container or use Dokploy terminal
   npx prisma db seed
   ```
   This creates test user: `test@markah.com` / `password123`

### Monitoring

- **Health Check**: `https://markah.yourdomain.com/api/health`
- **Logs**: View in Dokploy dashboard
- **Database**: Access via Dokploy PostgreSQL service dashboard

### Updates

1. Push changes to your Git repository
2. Dokploy will automatically rebuild and redeploy (if auto-deploy enabled)
3. Or manually trigger deployment in Dokploy dashboard

---

## Troubleshooting

### Application Won't Start

1. **Check Logs**: View application logs in Dokploy dashboard
2. **Verify Environment Variables**: Ensure all required vars are set
3. **Database Connection**: Verify `DATABASE_URL` is correct
4. **Migrations**: Check if migrations ran successfully (should happen automatically)

### Database Connection Issues

- Verify PostgreSQL service is running
- Check `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Ensure network connectivity between app and database containers

### SSL/HTTPS Issues

- Verify DNS records are correct
- Check Let's Encrypt certificate status in Dokploy
- Ensure `NEXTAUTH_URL` matches your domain exactly (including `https://`)

### Migration Errors

If migrations fail:
```bash
# Access container terminal via Dokploy
npx prisma migrate deploy
```

### Port Conflicts

- Ensure port `3000` is available
- Dokploy handles reverse proxy automatically

---

## Security Checklist

- [ ] Strong `NEXTAUTH_SECRET` generated
- [ ] Strong PostgreSQL password
- [ ] SSL/HTTPS enabled
- [ ] Environment variables secured (not in Git)
- [ ] Database backups configured
- [ ] Regular updates scheduled

---

## Backup Strategy

### Database Backup

Configure regular PostgreSQL backups in Dokploy or manually:

```bash
# Backup
pg_dump -h postgres-service -U markah markah > backup.sql

# Restore
psql -h postgres-service -U markah markah < backup.sql
```

### Volume Backups

Ensure `postgres_data` volume is backed up regularly.

---

## Scaling (Future)

- **Horizontal Scaling**: Deploy multiple app instances behind load balancer
- **Database**: Use managed PostgreSQL service for production
- **CDN**: Add Cloudflare or similar for static assets
- **Monitoring**: Integrate with monitoring tools (Prometheus, Grafana)

---

## Support

For Dokploy-specific issues, refer to:
- [Dokploy Documentation](https://dokploy.com/docs)
- [Dokploy GitHub](https://github.com/dokploy/dokploy)

For Markah-specific issues, check:
- Application logs in Dokploy dashboard
- Health endpoint: `/api/health`
- Database connection status
