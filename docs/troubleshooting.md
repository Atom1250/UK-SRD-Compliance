# Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered when running the ESG Client Interview Bot in development and production environments.

## Quick Diagnostics

### Health Check

```bash
# Check application health
curl -f http://localhost:4000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "memory": {...},
  "version": "0.2.0"
}
```

### Service Status

```bash
# Check systemd service (production)
sudo systemctl status esg-bot

# Check Docker containers
docker-compose ps

# Check processes
ps aux | grep node
```

### Log Analysis

```bash
# Application logs
sudo journalctl -u esg-bot -f --since "1 hour ago"

# Docker logs
docker-compose logs -f app

# Audit logs
tail -f server/data/audit.log
```

## Common Issues

### 1. Application Won't Start

#### Symptoms
- Service fails to start
- Port binding errors
- Module not found errors

#### Diagnostics
```bash
# Check port availability
sudo lsof -i :4000
sudo netstat -tulpn | grep :4000

# Check Node.js version
node --version
npm --version

# Check dependencies
npm ls --depth=0
```

#### Solutions

**Port Already in Use**
```bash
# Find and kill process using port
sudo lsof -ti:4000 | xargs sudo kill -9

# Or change port in configuration
export PORT=4001
```

**Missing Dependencies**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# For production
npm ci --only=production
```

**Node.js Version Issues**
```bash
# Install correct Node.js version
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Database Connection Issues

#### Symptoms
- "Database connection failed" errors
- Session data not persisting
- Migration failures

#### Diagnostics
```bash
# Check SQLite database
ls -la server/data/sessions.db
sqlite3 server/data/sessions.db ".tables"

# Check PostgreSQL connection
psql -h localhost -U esg_bot -d esg_interview_bot -c "SELECT 1;"

# Check database configuration
npm run db:status
```

#### Solutions

**SQLite Issues**
```bash
# Check file permissions
sudo chown esg-bot:esg-bot server/data/sessions.db
sudo chmod 664 server/data/sessions.db

# Recreate database
rm server/data/sessions.db
npm run db:migrate
```

**PostgreSQL Issues**
```bash
# Check PostgreSQL service
sudo systemctl status postgresql

# Reset connection
sudo systemctl restart postgresql

# Check user permissions
sudo -u postgres psql -c "ALTER USER esg_bot WITH SUPERUSER;"
```

**Migration Issues**
```bash
# Check migration status
npm run db:status

# Force migration
npm run db:migrate --force

# Rollback and retry
npm run db:rollback <version>
npm run db:migrate
```

### 3. OpenAI Integration Issues

#### Symptoms
- "OpenAI API error" messages
- Conversation responses failing
- Timeout errors

#### Diagnostics
```bash
# Check API key configuration
echo $OPENAI_API_KEY | cut -c1-10

# Test API connection
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
```

#### Solutions

**API Key Issues**
```bash
# Verify API key format
# Should start with "sk-" and be 51 characters long

# Update environment variable
export OPENAI_API_KEY="your-new-api-key"

# Or use stub mode for development
export OPENAI_STUB=true
```

**Rate Limiting**
```bash
# Check rate limit headers in logs
grep "rate.limit" server/data/audit.log

# Implement exponential backoff
export OPENAI_MAX_RETRIES=5
```

**Network Issues**
```bash
# Check connectivity
curl -I https://api.openai.com

# Check firewall rules
sudo ufw status
```

### 4. Memory and Performance Issues

#### Symptoms
- High memory usage
- Slow response times
- Process crashes

#### Diagnostics
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Check Node.js memory
node --max-old-space-size=2048 server/server.js

# Monitor performance
npm run health:check
```

#### Solutions

**Memory Leaks**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable garbage collection logging
export NODE_OPTIONS="--expose-gc --trace-gc"

# Restart service regularly
# Add to crontab: 0 2 * * * systemctl restart esg-bot
```

**Performance Optimization**
```bash
# Enable caching
export CACHE_ENABLED=true
export CACHE_TTL=3600

# Optimize database
npm run db:optimize

# Use production mode
export NODE_ENV=production
```

### 5. SSL/TLS Certificate Issues

#### Symptoms
- "Certificate expired" errors
- "Insecure connection" warnings
- HTTPS not working

#### Diagnostics
```bash
# Check certificate validity
openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout -dates

# Check certificate chain
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check nginx configuration
sudo nginx -t
```

#### Solutions

**Expired Certificates**
```bash
# Renew Let's Encrypt certificate
sudo certbot renew --dry-run
sudo certbot renew

# Restart nginx
sudo systemctl restart nginx
```

**Self-signed Certificate Issues**
```bash
# Generate new self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem

# Update nginx configuration
sudo systemctl restart nginx
```

### 6. File Permission Issues

#### Symptoms
- "Permission denied" errors
- Cannot write to log files
- Report generation failures

#### Diagnostics
```bash
# Check file permissions
ls -la server/data/
ls -la server/data/reports/

# Check process owner
ps aux | grep node
```

#### Solutions

**Fix Permissions**
```bash
# Set correct ownership
sudo chown -R esg-bot:esg-bot /opt/esg-bot

# Set correct permissions
sudo chmod -R 750 /opt/esg-bot
sudo chmod 600 /opt/esg-bot/.env.production

# Create missing directories
sudo -u esg-bot mkdir -p server/data/reports
sudo -u esg-bot mkdir -p server/data/backups
```

### 7. Docker Issues

#### Symptoms
- Container won't start
- Build failures
- Volume mount issues

#### Diagnostics
```bash
# Check container status
docker-compose ps

# Check container logs
docker-compose logs app

# Check resource usage
docker stats
```

#### Solutions

**Build Issues**
```bash
# Clean build
docker-compose down
docker system prune -f
docker-compose build --no-cache

# Check Dockerfile syntax
docker build -t esg-bot .
```

**Volume Issues**
```bash
# Check volume mounts
docker-compose config

# Reset volumes
docker-compose down -v
docker-compose up -d
```

**Resource Constraints**
```bash
# Increase memory limit
# In docker-compose.yml:
# mem_limit: 1g
# memswap_limit: 2g
```

## Error Code Reference

### HTTP Error Codes

| Code | Meaning | Common Causes | Solutions |
|------|---------|---------------|-----------|
| 400 | Bad Request | Invalid JSON, missing fields | Validate input data |
| 401 | Unauthorized | Missing/invalid session | Check session management |
| 403 | Forbidden | Insufficient permissions | Check user roles |
| 404 | Not Found | Invalid endpoint/session | Verify URLs and session IDs |
| 429 | Too Many Requests | Rate limiting | Implement backoff strategy |
| 500 | Internal Server Error | Application crash | Check logs and restart |
| 502 | Bad Gateway | Upstream server down | Check backend services |
| 503 | Service Unavailable | Maintenance mode | Wait or check service status |

### Application Error Codes

| Code | Component | Description | Solution |
|------|-----------|-------------|----------|
| DB001 | Database | Connection failed | Check database service |
| DB002 | Database | Query timeout | Optimize queries |
| AI001 | OpenAI | API key invalid | Update API key |
| AI002 | OpenAI | Rate limit exceeded | Implement backoff |
| VAL001 | Validation | COBS 9A violation | Review compliance rules |
| RPT001 | Reports | PDF generation failed | Check template and data |

## Performance Troubleshooting

### Slow Response Times

1. **Check Database Performance**
   ```bash
   # SQLite
   sqlite3 server/data/sessions.db ".timer on" "SELECT COUNT(*) FROM sessions;"
   
   # PostgreSQL
   psql -c "EXPLAIN ANALYZE SELECT * FROM sessions WHERE id = 'test';"
   ```

2. **Check OpenAI Response Times**
   ```bash
   grep "openai.response.time" server/data/audit.log | tail -10
   ```

3. **Monitor Resource Usage**
   ```bash
   top -p $(pgrep node)
   iostat -x 1
   ```

### High Memory Usage

1. **Analyze Memory Leaks**
   ```bash
   # Enable heap profiling
   node --inspect server/server.js
   
   # Use Chrome DevTools to analyze heap
   ```

2. **Check Session Storage**
   ```bash
   # Count active sessions
   sqlite3 server/data/sessions.db "SELECT COUNT(*) FROM sessions;"
   
   # Clean old sessions
   npm run db:cleanup
   ```

## Monitoring and Alerting

### Set Up Monitoring

1. **Application Metrics**
   ```bash
   # Check metrics endpoint
   curl http://localhost:9090/metrics
   ```

2. **Log Monitoring**
   ```bash
   # Set up log rotation
   sudo logrotate -f /etc/logrotate.d/esg-bot
   
   # Monitor error rates
   grep "ERROR" server/data/audit.log | wc -l
   ```

3. **Health Checks**
   ```bash
   # Add to monitoring system
   */5 * * * * curl -f http://localhost:4000/health || echo "Service down"
   ```

### Alert Configuration

```bash
# Example webhook alert
curl -X POST https://your-webhook-url.com/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "service": "esg-bot",
    "level": "critical",
    "message": "Service health check failed",
    "timestamp": "'$(date -Iseconds)'"
  }'
```

## Recovery Procedures

### Service Recovery

1. **Graceful Restart**
   ```bash
   sudo systemctl reload esg-bot
   ```

2. **Force Restart**
   ```bash
   sudo systemctl restart esg-bot
   ```

3. **Emergency Stop**
   ```bash
   sudo systemctl stop esg-bot
   sudo pkill -f "node server/server.js"
   ```

### Data Recovery

1. **Restore from Backup**
   ```bash
   npm run db:restore /path/to/backup.db
   ```

2. **Repair Database**
   ```bash
   # SQLite
   sqlite3 server/data/sessions.db ".recover" | sqlite3 recovered.db
   
   # PostgreSQL
   sudo -u postgres pg_dump esg_interview_bot > backup.sql
   sudo -u postgres dropdb esg_interview_bot
   sudo -u postgres createdb esg_interview_bot
   sudo -u postgres psql esg_interview_bot < backup.sql
   ```

## Getting Help

### Log Collection

```bash
# Collect diagnostic information
mkdir -p /tmp/esg-bot-diagnostics
cp server/data/audit.log /tmp/esg-bot-diagnostics/
sudo journalctl -u esg-bot --since "1 hour ago" > /tmp/esg-bot-diagnostics/service.log
docker-compose logs > /tmp/esg-bot-diagnostics/docker.log 2>&1
npm run db:status > /tmp/esg-bot-diagnostics/db-status.txt
curl -s http://localhost:4000/health > /tmp/esg-bot-diagnostics/health.json

# Create archive
tar -czf esg-bot-diagnostics.tar.gz -C /tmp esg-bot-diagnostics/
```

### Support Contacts

- **Technical Issues**: Create GitHub issue with diagnostic logs
- **Security Issues**: Email security team with encrypted logs
- **Production Outages**: Follow incident response procedures

### Useful Commands

```bash
# Quick health check
curl -f http://localhost:4000/health && echo "OK" || echo "FAIL"

# Service status
sudo systemctl is-active esg-bot

# Resource usage
ps -o pid,ppid,cmd,%mem,%cpu --sort=-%mem -C node

# Network connections
sudo netstat -tulpn | grep node

# Disk usage
du -sh server/data/*
```