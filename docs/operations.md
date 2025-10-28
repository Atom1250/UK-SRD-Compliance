# Operations Runbook

## Overview

This runbook provides step-by-step procedures for common operational tasks for the ESG Client Interview Bot system.

## Daily Operations

### Morning Health Check

**Frequency**: Daily at 9:00 AM  
**Duration**: 5 minutes  
**Owner**: Operations Team

#### Procedure

1. **Check Service Status**
   ```bash
   # Production
   sudo systemctl status esg-bot
   
   # Docker
   docker-compose ps
   
   # Expected: Active (running)
   ```

2. **Verify Application Health**
   ```bash
   curl -f https://your-domain.com/health
   
   # Expected response:
   {
     "status": "healthy",
     "timestamp": "2024-01-01T09:00:00.000Z",
     "uptime": 86400,
     "memory": {
       "rss": 134217728,
       "heapTotal": 67108864,
       "heapUsed": 45088768
     },
     "version": "0.2.0"
   }
   ```

3. **Check Error Rates**
   ```bash
   # Count errors in last 24 hours
   grep "ERROR" server/data/audit.log | grep "$(date -d '1 day ago' '+%Y-%m-%d')" | wc -l
   
   # Expected: < 10 errors per day
   ```

4. **Verify Database Connectivity**
   ```bash
   npm run db:status
   
   # Expected: All migrations applied
   ```

5. **Check Disk Usage**
   ```bash
   df -h /opt/esg-bot
   du -sh server/data/*
   
   # Expected: < 80% disk usage
   ```

#### Escalation

If any check fails:
1. Follow troubleshooting guide
2. If unresolved in 15 minutes, escalate to on-call engineer
3. Document incident in operations log

### Log Rotation

**Frequency**: Daily at 2:00 AM  
**Duration**: 2 minutes  
**Automation**: Cron job

#### Setup

```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/esg-bot > /dev/null <<EOF
/opt/esg-bot/server/data/audit.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 esg-bot esg-bot
    postrotate
        systemctl reload esg-bot
    endscript
}
EOF

# Test configuration
sudo logrotate -d /etc/logrotate.d/esg-bot
```

### Backup Verification

**Frequency**: Daily at 3:00 AM  
**Duration**: 5 minutes  
**Automation**: Cron job

#### Procedure

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/opt/esg-bot/backups"
DATE=$(date +%Y%m%d)
LOG_FILE="/var/log/esg-bot-backup.log"

echo "$(date): Starting backup verification" >> $LOG_FILE

# Create backup
cd /opt/esg-bot
npm run db:backup "daily-$DATE" >> $LOG_FILE 2>&1

if [ $? -eq 0 ]; then
    echo "$(date): Backup created successfully" >> $LOG_FILE
    
    # Verify backup integrity
    BACKUP_FILE="$BACKUP_DIR/daily-$DATE.db"
    if [ -f "$BACKUP_FILE" ]; then
        sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" >> $LOG_FILE 2>&1
        echo "$(date): Backup verification completed" >> $LOG_FILE
    else
        echo "$(date): ERROR - Backup file not found" >> $LOG_FILE
        exit 1
    fi
else
    echo "$(date): ERROR - Backup creation failed" >> $LOG_FILE
    exit 1
fi

# Cleanup old backups (keep 30 days)
npm run db:cleanup 30 >> $LOG_FILE 2>&1
echo "$(date): Backup cleanup completed" >> $LOG_FILE
```

## Weekly Operations

### Security Updates

**Frequency**: Weekly on Sunday at 1:00 AM  
**Duration**: 30 minutes  
**Owner**: Security Team

#### Procedure

1. **System Updates**
   ```bash
   # Update system packages
   sudo apt update
   sudo apt list --upgradable
   
   # Apply security updates
   sudo unattended-upgrade -d
   
   # Reboot if kernel updated
   if [ -f /var/run/reboot-required ]; then
       sudo reboot
   fi
   ```

2. **Node.js Security Audit**
   ```bash
   cd /opt/esg-bot
   npm audit --audit-level moderate
   
   # Fix vulnerabilities
   npm audit fix
   
   # Restart service if packages updated
   sudo systemctl restart esg-bot
   ```

3. **SSL Certificate Check**
   ```bash
   # Check certificate expiry
   openssl x509 -in /etc/nginx/ssl/cert.pem -noout -dates
   
   # Renew if expiring within 30 days
   sudo certbot renew --dry-run
   ```

### Performance Review

**Frequency**: Weekly on Monday at 10:00 AM  
**Duration**: 15 minutes  
**Owner**: Operations Team

#### Metrics to Review

1. **Response Times**
   ```bash
   # Average response time last 7 days
   grep "response.time" server/data/audit.log | \
   grep "$(date -d '7 days ago' '+%Y-%m-%d')" | \
   awk '{sum+=$NF; count++} END {print "Average:", sum/count, "ms"}'
   ```

2. **Error Rates**
   ```bash
   # Error rate by day
   for i in {1..7}; do
       DATE=$(date -d "$i days ago" '+%Y-%m-%d')
       ERRORS=$(grep "ERROR" server/data/audit.log | grep "$DATE" | wc -l)
       TOTAL=$(grep "$DATE" server/data/audit.log | wc -l)
       echo "$DATE: $ERRORS errors out of $TOTAL requests"
   done
   ```

3. **Resource Usage**
   ```bash
   # Memory usage trend
   sar -r 1 1
   
   # CPU usage trend
   sar -u 1 1
   
   # Disk I/O
   sar -d 1 1
   ```

#### Actions

- If response time > 2000ms: Investigate performance issues
- If error rate > 5%: Review error logs and fix issues
- If memory usage > 80%: Consider scaling or optimization

## Monthly Operations

### Capacity Planning

**Frequency**: Monthly on 1st at 9:00 AM  
**Duration**: 60 minutes  
**Owner**: Infrastructure Team

#### Procedure

1. **Usage Analysis**
   ```bash
   # Session count by month
   sqlite3 server/data/sessions.db "
   SELECT 
       strftime('%Y-%m', created_at) as month,
       COUNT(*) as sessions
   FROM sessions 
   GROUP BY strftime('%Y-%m', created_at)
   ORDER BY month DESC
   LIMIT 12;"
   
   # Report generation trends
   ls -la server/data/reports/ | wc -l
   ```

2. **Resource Trends**
   ```bash
   # Database size growth
   du -sh server/data/sessions.db
   
   # Log file growth
   du -sh server/data/audit.log*
   
   # Report storage growth
   du -sh server/data/reports/
   ```

3. **Capacity Recommendations**
   - Database: Plan for 20% monthly growth
   - Storage: Plan for 50MB per 1000 sessions
   - Memory: Monitor for gradual increases

### Disaster Recovery Test

**Frequency**: Monthly on 15th at 2:00 PM  
**Duration**: 2 hours  
**Owner**: Operations Team

#### Procedure

1. **Backup Restoration Test**
   ```bash
   # Create test environment
   mkdir -p /tmp/dr-test
   cd /tmp/dr-test
   
   # Copy application
   cp -r /opt/esg-bot/* .
   
   # Restore from backup
   LATEST_BACKUP=$(ls -t /opt/esg-bot/backups/*.db | head -1)
   npm run db:restore "$LATEST_BACKUP"
   
   # Start test instance
   PORT=4001 npm start &
   TEST_PID=$!
   
   # Verify functionality
   sleep 10
   curl -f http://localhost:4001/health
   
   # Cleanup
   kill $TEST_PID
   cd /
   rm -rf /tmp/dr-test
   ```

2. **Configuration Backup Test**
   ```bash
   # Backup configuration
   tar -czf config-backup.tar.gz \
       .env.production \
       nginx/nginx.conf \
       /etc/systemd/system/esg-bot.service
   
   # Verify archive
   tar -tzf config-backup.tar.gz
   ```

3. **Documentation Review**
   - Verify all runbooks are up to date
   - Test emergency contact procedures
   - Update recovery time objectives

## Incident Response

### Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| P1 | Service completely down | 15 minutes | Immediate |
| P2 | Major functionality impaired | 1 hour | 30 minutes |
| P3 | Minor issues, workaround available | 4 hours | 2 hours |
| P4 | Enhancement requests | Next business day | N/A |

### P1 Incident Response

**Service Completely Down**

1. **Immediate Actions (0-5 minutes)**
   ```bash
   # Check service status
   sudo systemctl status esg-bot
   
   # Check system resources
   free -h
   df -h
   
   # Check network connectivity
   ping 8.8.8.8
   curl -I https://api.openai.com
   ```

2. **Diagnosis (5-10 minutes)**
   ```bash
   # Check recent logs
   sudo journalctl -u esg-bot --since "30 minutes ago"
   
   # Check for recent changes
   git log --oneline -10
   
   # Check database connectivity
   npm run db:status
   ```

3. **Recovery Actions (10-15 minutes)**
   ```bash
   # Attempt service restart
   sudo systemctl restart esg-bot
   
   # If restart fails, check configuration
   node -c server/server.js
   
   # If configuration invalid, restore from backup
   cp .env.production.backup .env.production
   sudo systemctl restart esg-bot
   ```

4. **Escalation (15 minutes)**
   - If service not restored, escalate to on-call engineer
   - Notify stakeholders via incident management system
   - Begin detailed incident log

### P2 Incident Response

**Major Functionality Impaired**

1. **Assessment (0-15 minutes)**
   - Identify affected functionality
   - Estimate user impact
   - Check for workarounds

2. **Investigation (15-45 minutes)**
   - Review error logs
   - Check recent deployments
   - Test affected features

3. **Resolution (45-60 minutes)**
   - Apply fix or rollback
   - Verify functionality restored
   - Monitor for recurrence

## Maintenance Windows

### Scheduled Maintenance

**Frequency**: Monthly on 3rd Sunday at 2:00 AM  
**Duration**: 2 hours  
**Notification**: 48 hours advance notice

#### Pre-Maintenance Checklist

- [ ] Backup current database
- [ ] Backup current configuration
- [ ] Prepare rollback plan
- [ ] Notify users of maintenance window
- [ ] Verify all team members available

#### Maintenance Procedure

1. **Enable Maintenance Mode**
   ```bash
   # Create maintenance page
   echo "System under maintenance. Please try again later." > /var/www/maintenance.html
   
   # Update nginx configuration
   # Add: return 503 @maintenance;
   sudo nginx -s reload
   ```

2. **Stop Services**
   ```bash
   sudo systemctl stop esg-bot
   docker-compose down
   ```

3. **Perform Updates**
   ```bash
   # Update application code
   git pull origin main
   
   # Update dependencies
   npm ci --only=production
   
   # Run database migrations
   npm run db:migrate
   
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   ```

4. **Start Services**
   ```bash
   sudo systemctl start esg-bot
   docker-compose up -d
   
   # Wait for startup
   sleep 30
   
   # Verify health
   curl -f http://localhost:8080/health
   ```

5. **Disable Maintenance Mode**
   ```bash
   # Restore nginx configuration
   sudo nginx -s reload
   
   # Verify public access
   curl -f https://your-domain.com/health
   ```

#### Post-Maintenance Checklist

- [ ] Verify all functionality working
- [ ] Check error logs for issues
- [ ] Monitor performance metrics
- [ ] Notify users maintenance complete
- [ ] Document any issues encountered

## Monitoring and Alerting

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Response Time | > 2000ms | > 5000ms | Investigate performance |
| Error Rate | > 2% | > 5% | Check logs and fix |
| Memory Usage | > 70% | > 85% | Scale or optimize |
| Disk Usage | > 80% | > 90% | Clean up or expand |
| CPU Usage | > 70% | > 85% | Scale or optimize |

### Alert Handling

1. **Receive Alert**
   - Acknowledge within 5 minutes
   - Begin investigation immediately

2. **Initial Response**
   - Check service health
   - Review recent changes
   - Identify root cause

3. **Resolution**
   - Apply fix or mitigation
   - Verify alert cleared
   - Document resolution

4. **Follow-up**
   - Conduct post-incident review
   - Update monitoring if needed
   - Implement preventive measures

## Contact Information

### Escalation Matrix

| Role | Primary | Secondary | Phone | Email |
|------|---------|-----------|-------|-------|
| On-Call Engineer | John Doe | Jane Smith | +1-555-0101 | oncall@company.com |
| Operations Manager | Bob Johnson | Alice Brown | +1-555-0102 | ops@company.com |
| Security Team | Security Team | - | +1-555-0103 | security@company.com |
| Infrastructure Team | Infra Team | - | +1-555-0104 | infra@company.com |

### Emergency Procedures

**After Hours Critical Issues**
1. Call on-call engineer directly
2. If no response in 15 minutes, call secondary
3. If no response in 30 minutes, call operations manager
4. Document all actions in incident log

**Security Incidents**
1. Immediately contact security team
2. Do not attempt to fix without security approval
3. Preserve all logs and evidence
4. Follow security incident response plan

This runbook should be reviewed quarterly and updated as the system evolves.