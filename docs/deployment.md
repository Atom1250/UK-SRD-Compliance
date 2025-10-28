# Deployment Guide

## Overview

This guide covers the deployment procedures for the ESG Client Interview Bot in both development and production environments.

## Prerequisites

### System Requirements

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Docker**: Version 20.10 or higher (for containerized deployment)
- **PostgreSQL**: Version 13 or higher (for production database)
- **Redis**: Version 6 or higher (optional, for caching)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd esg-client-interview-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # For development
   npm run setup:dev
   
   # For production
   npm run setup:prod
   ```

## Development Deployment

### Local Development

1. **Setup environment**
   ```bash
   cp .env.development.template .env
   # Edit .env with your configuration
   ```

2. **Start the application**
   ```bash
   npm run start:dev
   ```

3. **Verify deployment**
   ```bash
   curl http://localhost:4000/health
   ```

### Docker Development

1. **Build and start services**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

2. **Access the application**
   - Application: http://localhost:4000
   - Health check: http://localhost:4000/health

## Production Deployment

### Option 1: Direct Node.js Deployment

1. **Prepare the server**
   ```bash
   # Install Node.js and npm
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Create application user
   sudo useradd -r -s /bin/false esg-bot
   sudo mkdir -p /opt/esg-bot
   sudo chown esg-bot:esg-bot /opt/esg-bot
   ```

2. **Deploy application**
   ```bash
   # Copy application files
   sudo -u esg-bot cp -r . /opt/esg-bot/
   cd /opt/esg-bot
   
   # Install dependencies
   sudo -u esg-bot npm ci --only=production
   
   # Configure environment
   sudo -u esg-bot cp .env.production.template .env.production
   # Edit .env.production with your configuration
   ```

3. **Setup database**
   ```bash
   # Run migrations
   sudo -u esg-bot npm run db:migrate
   
   # Create initial backup
   sudo -u esg-bot npm run db:backup
   ```

4. **Create systemd service**
   ```bash
   sudo tee /etc/systemd/system/esg-bot.service > /dev/null <<EOF
   [Unit]
   Description=ESG Client Interview Bot
   After=network.target
   
   [Service]
   Type=simple
   User=esg-bot
   WorkingDirectory=/opt/esg-bot
   Environment=NODE_ENV=production
   EnvironmentFile=/opt/esg-bot/.env.production
   ExecStart=/usr/bin/node server/server.js
   Restart=always
   RestartSec=10
   StandardOutput=syslog
   StandardError=syslog
   SyslogIdentifier=esg-bot
   
   [Install]
   WantedBy=multi-user.target
   EOF
   
   sudo systemctl daemon-reload
   sudo systemctl enable esg-bot
   sudo systemctl start esg-bot
   ```

5. **Setup reverse proxy (nginx)**
   ```bash
   sudo apt-get install nginx
   sudo cp nginx/nginx.conf /etc/nginx/sites-available/esg-bot
   sudo ln -s /etc/nginx/sites-available/esg-bot /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Option 2: Docker Deployment

1. **Prepare environment**
   ```bash
   cp .env.production.template .env.production
   # Edit .env.production with your configuration
   ```

2. **Deploy with Docker Compose**
   ```bash
   docker-compose up -d --build
   ```

3. **Verify deployment**
   ```bash
   docker-compose ps
   curl https://your-domain.com/health
   ```

### Option 3: Kubernetes Deployment

1. **Create namespace**
   ```bash
   kubectl create namespace esg-bot
   ```

2. **Create secrets**
   ```bash
   kubectl create secret generic esg-bot-secrets \
     --from-env-file=.env.production \
     --namespace=esg-bot
   ```

3. **Deploy application**
   ```bash
   kubectl apply -f k8s/ --namespace=esg-bot
   ```

## SSL/TLS Configuration

### Let's Encrypt (Recommended)

1. **Install Certbot**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. **Obtain certificate**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Setup auto-renewal**
   ```bash
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   ```

### Self-signed Certificate (Development)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem
```

## Database Setup

### SQLite (Development/Small Production)

SQLite is configured by default and requires no additional setup.

### PostgreSQL (Production)

1. **Install PostgreSQL**
   ```bash
   sudo apt-get install postgresql postgresql-contrib
   ```

2. **Create database and user**
   ```sql
   sudo -u postgres psql
   CREATE DATABASE esg_interview_bot;
   CREATE USER esg_bot WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE esg_interview_bot TO esg_bot;
   \q
   ```

3. **Update configuration**
   ```bash
   # In .env.production
   DB_TYPE=postgresql
   DB_HOST=localhost
   DB_NAME=esg_interview_bot
   DB_USER=esg_bot
   DB_PASSWORD=your_password
   ```

4. **Run migrations**
   ```bash
   npm run db:migrate
   ```

## Monitoring Setup

### Application Monitoring

The application exposes metrics on port 9090 (configurable):

- Health check: `/health`
- Metrics: `:9090/metrics`

### Log Monitoring

Logs are written to:
- Application logs: stdout/stderr
- Audit logs: `/app/logs/audit.log`

### Alerting

Configure webhook URL in environment variables:
```bash
ALERTS_ENABLED=true
ALERT_WEBHOOK_URL=https://your-webhook-url.com/alerts
```

## Backup and Recovery

### Automated Backups

Setup daily backups with cron:
```bash
# Add to crontab
0 2 * * * cd /opt/esg-bot && npm run db:backup
0 3 * * 0 cd /opt/esg-bot && npm run db:cleanup 30
```

### Manual Backup

```bash
npm run db:backup backup-name
```

### Restore from Backup

```bash
npm run db:restore /path/to/backup.db
```

## Security Considerations

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### File Permissions

```bash
# Secure application files
sudo chown -R esg-bot:esg-bot /opt/esg-bot
sudo chmod -R 750 /opt/esg-bot
sudo chmod 600 /opt/esg-bot/.env.production
```

### Regular Updates

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade

# Update Node.js dependencies
npm audit fix
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   sudo lsof -i :8080
   sudo kill -9 <PID>
   ```

2. **Database connection failed**
   ```bash
   # Check database status
   sudo systemctl status postgresql
   
   # Check connection
   psql -h localhost -U esg_bot -d esg_interview_bot
   ```

3. **SSL certificate issues**
   ```bash
   # Check certificate validity
   openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout
   
   # Renew Let's Encrypt certificate
   sudo certbot renew
   ```

### Log Analysis

```bash
# Application logs
sudo journalctl -u esg-bot -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Audit logs
npm run logs:audit
```

## Performance Tuning

### Node.js Optimization

```bash
# Set Node.js options
export NODE_OPTIONS="--max-old-space-size=2048"
```

### Database Optimization

```sql
-- PostgreSQL optimization
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
SELECT pg_reload_conf();
```

### Nginx Optimization

```nginx
# In nginx.conf
worker_processes auto;
worker_connections 2048;
keepalive_timeout 30;
```

## Rollback Procedures

### Application Rollback

1. **Stop current version**
   ```bash
   sudo systemctl stop esg-bot
   ```

2. **Restore previous version**
   ```bash
   sudo -u esg-bot cp -r /opt/esg-bot-backup/* /opt/esg-bot/
   ```

3. **Rollback database if needed**
   ```bash
   npm run db:rollback <previous-version>
   ```

4. **Start application**
   ```bash
   sudo systemctl start esg-bot
   ```

### Docker Rollback

```bash
# Rollback to previous image
docker-compose down
docker-compose up -d --scale app=0
docker tag esg-bot:previous esg-bot:latest
docker-compose up -d
```