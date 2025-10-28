#!/bin/bash

# Development Setup Script for ESG Client Interview Bot
# This script sets up the local development environment

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Check Node.js version
check_node_version() {
    log_info "Checking Node.js version..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18.0.0 or higher."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if ! printf '%s\n%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V -C; then
        log_error "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_VERSION+"
        exit 1
    fi
    
    log_info "Node.js version $NODE_VERSION is compatible"
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    
    mkdir -p server/data
    mkdir -p server/data/reports
    mkdir -p server/data/backups
    mkdir -p tmp
    mkdir -p logs
    
    log_info "Directories created successfully"
}

# Setup environment file
setup_environment() {
    log_info "Setting up environment configuration..."
    
    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.development.template" ]]; then
            cp .env.development.template .env
            log_info "Created .env from template"
        else
            log_warn ".env.development.template not found, .env already exists or will be created manually"
        fi
    else
        log_info ".env file already exists"
    fi
    
    # Check if OpenAI API key is set
    if grep -q "OPENAI_API_KEY=your_openai_api_key_here" .env 2>/dev/null; then
        log_warn "Please update OPENAI_API_KEY in .env file, or set OPENAI_STUB=true for testing without API"
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    npm install
    
    log_info "Dependencies installed successfully"
}

# Initialize database
initialize_database() {
    log_info "Initializing database..."
    
    # Check if migration script exists
    if [[ -f "scripts/database/migrate.js" ]]; then
        npm run db:migrate
        log_info "Database migrations completed"
    else
        log_warn "Migration script not found, skipping database initialization"
    fi
}

# Create initial data directories and files
setup_initial_data() {
    log_info "Setting up initial data..."
    
    # Create audit log file
    touch server/data/audit.log
    
    # Create a simple test session for verification
    if [[ -f "server/data/sessions.db" ]]; then
        log_info "Database file exists, skipping test data creation"
    else
        log_info "Database will be created on first run"
    fi
}

# Verify setup
verify_setup() {
    log_info "Verifying setup..."
    
    # Check if all required files exist
    local required_files=(
        "server/server.js"
        "server/router.js"
        "package.json"
        ".env"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file missing: $file"
            exit 1
        fi
    done
    
    # Test Node.js syntax
    if ! node -c server/server.js; then
        log_error "Server file has syntax errors"
        exit 1
    fi
    
    log_info "Setup verification completed successfully"
}

# Display next steps
show_next_steps() {
    log_info "Development environment setup completed!"
    echo
    echo "Next steps:"
    echo "1. Review and update .env file with your configuration"
    echo "2. If you don't have an OpenAI API key, set OPENAI_STUB=true in .env"
    echo "3. Start the development server: npm run start:dev"
    echo "4. Open your browser to: http://localhost:4000"
    echo "5. Check health endpoint: curl http://localhost:4000/health"
    echo
    echo "Useful development commands:"
    echo "  npm run start:dev     - Start development server"
    echo "  npm test              - Run tests"
    echo "  npm run db:status     - Check database migration status"
    echo "  npm run health:check  - Test health endpoint"
    echo "  npm run logs:audit    - View audit logs"
    echo
    echo "For troubleshooting, see: docs/troubleshooting.md"
}

# Main setup function
main() {
    log_info "Starting development environment setup..."
    
    check_node_version
    create_directories
    setup_environment
    install_dependencies
    initialize_database
    setup_initial_data
    verify_setup
    show_next_steps
}

# Run main function
main "$@"