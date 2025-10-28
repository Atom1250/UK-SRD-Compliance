#!/bin/bash

# ESG Client Interview Bot Deployment Script
# Usage: ./scripts/deploy.sh [environment] [version]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-production}"
VERSION="${2:-latest}"
DEPLOY_USER="esg-bot"
DEPLOY_PATH="/opt/esg-bot"
BACKUP_PATH="/opt/esg-bot-backups"
SERVICE_NAME="esg-bot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root"
        exit 1
    fi
}

# Validate environment
validate_environment() {
    case $ENVIRONMENT in
        development|staging|production)
            log_info "Deploying to $ENVIRONMENT environment"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            log_error "Valid environments: development, staging, production"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if ! printf '%s\n%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V -C; then
        log_error "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_VERSION+"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check systemctl (for production)
    if [[ $ENVIRONMENT == "production" ]] && ! command -v systemctl &> /dev/null; then
        log_error "systemctl is not available"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Create backup
create_backup() {
    if [[ -d "$DEPLOY_PATH" ]]; then
        log_info "Creating backup of current deployment..."
        
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        sudo mkdir -p "$BACKUP_PATH"
        sudo cp -r "$DEPLOY_PATH" "$BACKUP_PATH/$BACKUP_NAME"
        
        # Create database backup
        if [[ -f "$DEPLOY_PATH/.env.$ENVIRONMENT" ]]; then
            cd "$DEPLOY_PATH"
            sudo -u $DEPLOY_USER npm run db:backup "$BACKUP_NAME" || log_warn "Database backup failed"
        fi
        
        log_info "Backup created: $BACKUP_PATH/$BACKUP_NAME"
    fi
}

# Deploy application
deploy_application() {
    log_info "Deploying application..."
    
    # Create deploy directory if it doesn't exist
    sudo mkdir -p "$DEPLOY_PATH"
    sudo chown $DEPLOY_USER:$DEPLOY_USER "$DEPLOY_PATH"
    
    # Copy application files
    sudo -u $DEPLOY_USER cp -r "$PROJECT_DIR"/* "$DEPLOY_PATH/"
    
    # Set permissions
    sudo chown -R $DEPLOY_USER:$DEPLOY_USER "$DEPLOY_PATH"
    sudo chmod -R 750 "$DEPLOY_PATH"
    
    # Install dependencies
    cd "$DEPLOY_PATH"
    sudo -u $DEPLOY_USER npm ci --only=production
    
    log_info "Application deployed successfully"
}

# Configure environment
configure_environment() {
    log_info "Configuring environment..."
    
    ENV_FILE="$DEPLOY_PATH/.env.$ENVIRONMENT"
    ENV_TEMPLATE="$DEPLOY_PATH/.env.$ENVIRONMENT.template"
    
    if [[ ! -f "$ENV_FILE" ]] && [[ -f "$ENV_TEMPLATE" ]]; then
        log_warn "Environment file not found. Creating from template..."
        sudo -u $DEPLOY_USER cp "$ENV_TEMPLATE" "$ENV_FILE"
        log_warn "Please edit $ENV_FILE with your configuration"
        
        if [[ $ENVIRONMENT == "production" ]]; then
            log_error "Production environment file must be configured before deployment"
            exit 1
        fi
    fi
    
    # Set secure permissions on environment file
    sudo chmod 600 "$ENV_FILE"
    
    log_info "Environment configured"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    cd "$DEPLOY_PATH"
    sudo -u $DEPLOY_USER npm run db:migrate || {
        log_error "Database migration failed"
        exit 1
    }
    
    log_info "Database migrations completed"
}

# Setup systemd service (production only)
setup_service() {
    if [[ $ENVIRONMENT != "production" ]]; then
        return 0
    fi
    
    log_info "Setting up systemd service..."
    
    SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"
    
    sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=ESG Client Interview Bot
After=network.target

[Service]
Type=simple
User=$DEPLOY_USER
WorkingDirectory=$DEPLOY_PATH
Environment=NODE_ENV=$ENVIRONMENT
EnvironmentFile=$DEPLOY_PATH/.env.$ENVIRONMENT
ExecStart=/usr/bin/node server/server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$SERVICE_NAME

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DEPLOY_PATH

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    
    log_info "Systemd service configured"
}

# Start services
start_services() {
    log_info "Starting services..."
    
    case $ENVIRONMENT in
        production)
            sudo systemctl start "$SERVICE_NAME"
            sleep 5
            sudo systemctl status "$SERVICE_NAME" --no-pager
            ;;
        development)
            cd "$DEPLOY_PATH"
            npm run start:dev &
            PROCESS_PID=$!
            echo $PROCESS_PID > "$DEPLOY_PATH/app.pid"
            ;;
        staging)
            cd "$DEPLOY_PATH"
            NODE_ENV=staging npm start &
            PROCESS_PID=$!
            echo $PROCESS_PID > "$DEPLOY_PATH/app.pid"
            ;;
    esac
    
    log_info "Services started"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Determine port based on environment
    case $ENVIRONMENT in
        production) PORT=8080 ;;
        staging) PORT=8080 ;;
        development) PORT=4000 ;;
    esac
    
    # Wait for service to start
    sleep 10
    
    # Check health endpoint
    for i in {1..30}; do
        if curl -f "http://localhost:$PORT/health" > /dev/null 2>&1; then
            log_info "Health check passed"
            return 0
        fi
        
        log_warn "Health check attempt $i/30 failed, retrying..."
        sleep 2
    done
    
    log_error "Health check failed after 30 attempts"
    return 1
}

# Rollback function
rollback() {
    log_error "Deployment failed. Rolling back..."
    
    # Stop current service
    case $ENVIRONMENT in
        production)
            sudo systemctl stop "$SERVICE_NAME" || true
            ;;
        *)
            if [[ -f "$DEPLOY_PATH/app.pid" ]]; then
                kill "$(cat "$DEPLOY_PATH/app.pid")" || true
                rm -f "$DEPLOY_PATH/app.pid"
            fi
            ;;
    esac
    
    # Restore from backup
    LATEST_BACKUP=$(ls -t "$BACKUP_PATH" | head -1)
    if [[ -n "$LATEST_BACKUP" ]]; then
        log_info "Restoring from backup: $LATEST_BACKUP"
        sudo rm -rf "$DEPLOY_PATH"
        sudo cp -r "$BACKUP_PATH/$LATEST_BACKUP" "$DEPLOY_PATH"
        sudo chown -R $DEPLOY_USER:$DEPLOY_USER "$DEPLOY_PATH"
        
        # Restart service
        start_services
    fi
    
    log_error "Rollback completed"
    exit 1
}

# Cleanup old backups
cleanup_backups() {
    log_info "Cleaning up old backups..."
    
    if [[ -d "$BACKUP_PATH" ]]; then
        # Keep only last 5 backups
        cd "$BACKUP_PATH"
        ls -t | tail -n +6 | xargs -r sudo rm -rf
    fi
    
    # Cleanup old database backups
    cd "$DEPLOY_PATH"
    sudo -u $DEPLOY_USER npm run db:cleanup 30 || log_warn "Database cleanup failed"
    
    log_info "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting deployment of ESG Client Interview Bot"
    log_info "Environment: $ENVIRONMENT"
    log_info "Version: $VERSION"
    
    # Set trap for rollback on error
    trap rollback ERR
    
    check_root
    validate_environment
    check_prerequisites
    create_backup
    deploy_application
    configure_environment
    run_migrations
    setup_service
    start_services
    
    if health_check; then
        cleanup_backups
        log_info "Deployment completed successfully!"
        
        # Display service information
        case $ENVIRONMENT in
            production)
                log_info "Service status: sudo systemctl status $SERVICE_NAME"
                log_info "Service logs: sudo journalctl -u $SERVICE_NAME -f"
                ;;
            *)
                log_info "Process PID: $(cat "$DEPLOY_PATH/app.pid" 2>/dev/null || echo "Not found")"
                log_info "Application logs: tail -f $DEPLOY_PATH/server/data/audit.log"
                ;;
        esac
    else
        rollback
    fi
}

# Run main function
main "$@"