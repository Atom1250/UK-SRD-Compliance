# ESG Client Interview Bot

A Node.js-based conversational AI system that guides UK financial planning clients through compliant ESG investment interviews, ensuring adherence to FCA Consumer Duty, COBS 9A suitability requirements, and SDR (Sustainability Disclosure Requirements).

## Features

- **8-Segment Conversation Flow**: Structured interview process from explanation to report delivery
- **Regulatory Compliance**: Built-in COBS 9A validation and FCA Consumer Duty compliance
- **ESG Education**: Comprehensive educational content on sustainable investing concepts
- **Investment Matching**: Intelligent matching of client preferences to authorized investment universe
- **PDF Report Generation**: Professional suitability reports with digital signatures
- **Real-time Monitoring**: Comprehensive logging, metrics, and alerting
- **Multi-modal Interface**: Support for both conversational and structured data input

## Quick Start

**For local development and testing, see [QUICKSTART.md](QUICKSTART.md) for a 5-minute setup guide.**

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- SQLite (included) or PostgreSQL for production

### Local Development Setup

```bash
# One-command setup
npm run setup:dev

# Start development server
npm run dev

# Or with file watching
npm run dev:watch

# Test without OpenAI API key
npm run dev:stub
```

### Production Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd esg-client-interview-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   # For production
   npm run setup:prod
   # Edit .env.production with your configuration
   ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Start the application**
   ```bash
   npm run start:prod
   ```

6. **Verify installation**
   ```bash
   curl http://localhost:8080/health
   ```

## Architecture

The system follows a modular architecture with clear separation of concerns:

- **Conversation Engine**: Manages the 8-segment interview flow
- **Session Management**: Handles persistent session storage and state
- **Validation System**: Ensures COBS 9A compliance and regulatory requirements
- **Report Generation**: Creates professional PDF suitability reports
- **Investment Explorer**: Matches client preferences to investment products
- **OpenAI Integration**: Provides natural language processing capabilities

For detailed architecture information, see [docs/architecture.md](docs/architecture.md).

## Conversation Flow

The system guides clients through 8 structured segments:

1. **Explanation**: System introduction and purpose
2. **Onboarding**: Client identification and basic information
3. **Consent**: Data processing and regulatory consents
4. **Education**: ESG concepts and SDR label education
5. **Options**: Investment preference capture
6. **Confirmation**: Review and confirmation of captured data
7. **Report**: Suitability report generation
8. **Delivery**: Report delivery and completion

## API Endpoints

### Core Endpoints

- `GET /health` - Health check endpoint
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Retrieve session data
- `POST /api/sessions/:id/message` - Send message to conversation engine
- `GET /api/sessions/:id/report` - Generate and retrieve suitability report

### Management Endpoints

- `GET /api/sessions` - List all sessions (with filtering)
- `PUT /api/sessions/:id` - Update session data
- `DELETE /api/sessions/:id` - Delete session
- `POST /api/sessions/:id/reset` - Reset session to beginning

For complete API documentation, see the OpenAPI specification in `server/spec/`.

## Configuration

### Environment Variables

Key configuration options:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_STUB=false  # Set to true for development without API key

# Database Configuration
DB_TYPE=sqlite  # or postgresql
SQLITE_PATH=./server/data/sessions.db

# Server Configuration
NODE_ENV=development  # or production
PORT=4000
HOST=localhost

# Security Configuration
CORS_ORIGIN=*  # Restrict in production
RATE_LIMIT_MAX=100
```

For complete configuration options, see the environment templates:
- [.env.development.template](.env.development.template)
- [.env.production.template](.env.production.template)

### Using GitHub Secrets for OpenAI Access

If you run the test suite or other automated tasks from GitHub Actions, store your real
OpenAI key as a repository secret so the workflows can authenticate against the API:

1. In GitHub, navigate to **Settings → Secrets and variables → Actions → New repository secret**.
2. Create a secret named `OPENAI_API_KEY` and paste your production key as the value.
3. The included workflow in `.github/workflows/openai-ci.yml` reads the secret and sets
   `OPENAI_STUB=false`, allowing `npm test` to exercise the live OpenAI integration.
4. Dispatch the workflow manually or trigger it by pushing to `main`/opening a pull request.

Workflows will fail fast with a clear error message if the secret is not defined, preventing
accidental runs without valid credentials.

## Deployment

### Development Deployment

```bash
npm run start:dev
```

### Production Deployment

#### Option 1: Direct Node.js
```bash
./scripts/deploy.sh production
```

#### Option 2: Docker
```bash
docker-compose up -d --build
```

#### Option 3: Docker Development
```bash
docker-compose -f docker-compose.dev.yml up --build
```

For detailed deployment instructions, see [docs/deployment.md](docs/deployment.md).

## Database Management

### Migrations

```bash
# Run pending migrations
npm run db:migrate

# Check migration status
npm run db:status

# Rollback to specific version
npm run db:rollback <version>
```

### Backups

```bash
# Create backup
npm run db:backup [backup-name]

# List backups
npm run db:backup list

# Restore from backup
npm run db:restore <backup-file>

# Cleanup old backups
npm run db:cleanup [retention-days]
```

## Monitoring and Operations

### Health Monitoring

The application provides comprehensive monitoring capabilities:

- Health check endpoint: `/health`
- Metrics endpoint: `:9090/metrics` (Prometheus format)
- Audit logging: `server/data/audit.log`

### Operational Commands

```bash
# Check service status
sudo systemctl status esg-bot

# View logs
sudo journalctl -u esg-bot -f

# View audit logs
npm run logs:audit

# Security audit
npm run security:audit
```

For complete operational procedures, see [docs/operations.md](docs/operations.md).

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test tests/conversationEngine.test.js
```

### Test Categories

- **Unit Tests**: Core functionality testing
- **Integration Tests**: End-to-end conversation flows
- **Compliance Tests**: Regulatory requirement validation
- **Performance Tests**: Load and stress testing

## Security

### Security Features

- Input validation and sanitization
- Rate limiting and DDoS protection
- CORS policy enforcement
- Security headers (HSTS, CSP, etc.)
- Audit logging and compliance tracking
- Secure session management

### Security Configuration

```bash
# Enable security features in production
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_MAX=100
AUDIT_LOG_ENABLED=true
```

## Compliance

The system ensures compliance with:

- **FCA Consumer Duty**: Plain language, comprehension checks, best interests
- **COBS 9A**: Suitability assessment and documentation requirements
- **SDR**: Sustainability Disclosure Requirements and anti-greenwashing rules
- **Data Protection**: GDPR-compliant data handling and consent management

## Troubleshooting

### Common Issues

1. **Service won't start**: Check port availability and Node.js version
2. **Database connection failed**: Verify database configuration and permissions
3. **OpenAI API errors**: Check API key and rate limits
4. **Memory issues**: Monitor resource usage and optimize configuration

For detailed troubleshooting, see [docs/troubleshooting.md](docs/troubleshooting.md).

### Getting Help

- Check the troubleshooting guide
- Review application logs
- Create GitHub issue with diagnostic information
- Contact support team for production issues

## Development

### Project Structure

```
├── server/                 # Server-side code
│   ├── state/             # Business logic and state management
│   ├── integrations/      # External service integrations
│   ├── monitoring/        # Logging and metrics
│   └── spec/              # API specifications
├── public/                # Client-side assets
├── tests/                 # Test files
├── docs/                  # Documentation
├── config/                # Environment configurations
├── scripts/               # Deployment and utility scripts
└── monitoring/            # Monitoring configurations
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style

- Use ESM modules (import/export)
- Follow Node.js best practices
- Include comprehensive error handling
- Add JSDoc comments for public APIs
- Maintain test coverage above 80%

## License

This project is proprietary software. All rights reserved.

## Support

For technical support:
- Create GitHub issues for bugs and feature requests
- Contact the development team for urgent production issues
- Review documentation and troubleshooting guides first

---

**Version**: 0.2.0  
**Last Updated**: January 2024  
**Node.js**: 18.0.0+  
**License**: Proprietary