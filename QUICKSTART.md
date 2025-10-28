# Quick Start Guide - Local Development

This guide will get you up and running with the ESG Client Interview Bot on your local machine in under 5 minutes.

## Prerequisites

- **Node.js 18.0.0+** - [Download here](https://nodejs.org/)
- **npm 8.0.0+** (comes with Node.js)

## Quick Setup

### 1. Run the Setup Script

```bash
npm run setup:dev
```

This will:
- Check your Node.js version
- Create necessary directories
- Install dependencies
- Set up the database
- Configure environment variables

### 2. Start the Development Server

Choose one of these options:

```bash
# Standard development mode
npm run dev

# With file watching (restarts on changes)
npm run dev:watch

# With debugging enabled
npm run dev:debug

# Using stub mode (no OpenAI API key needed)
npm run dev:stub
```

### 3. Verify It's Working

Open your browser to: http://localhost:4000

Or test the health endpoint:
```bash
curl http://localhost:4000/health
```

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 10,
  "memory": {...},
  "version": "0.2.0"
}
```

## Testing the Application

### Basic Functionality Test

1. **Open the web interface**: http://localhost:4000
2. **Start a new session**: Click "Start Interview"
3. **Test conversation**: Send a message like "Hello"
4. **Check the response**: You should get a response from the conversation engine

### API Testing

```bash
# Create a new session
curl -X POST http://localhost:4000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"clientType": "individual"}'

# Send a message (replace SESSION_ID with the ID from above)
curl -X POST http://localhost:4000/api/sessions/SESSION_ID/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, I want to learn about ESG investing"}'
```

## Configuration Options

### Using Without OpenAI API Key

If you don't have an OpenAI API key, you can use stub mode:

1. **Edit .env file**:
   ```bash
   OPENAI_STUB=true
   ```

2. **Or start with stub mode**:
   ```bash
   npm run dev:stub
   ```

### Database Options

By default, the app uses SQLite (no setup required). The database file is created at:
```
server/data/sessions.db
```

### Logging

Development logs are written to:
- **Console**: Formatted, colorful logs
- **Audit log**: `server/data/audit.log`

View audit logs in real-time:
```bash
npm run logs:audit
```

## Common Development Tasks

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test tests/conversationEngine.test.js
```

### Database Management

```bash
# Check migration status
npm run db:status

# Create a backup
npm run db:backup

# View database contents (requires sqlite3)
sqlite3 server/data/sessions.db ".tables"
```

### Monitoring

```bash
# Check application health
npm run health:check

# View metrics (Prometheus format)
curl http://localhost:9090/metrics
```

## Troubleshooting

### Port Already in Use

If port 4000 is busy:
```bash
# Change port in .env
PORT=4001

# Or set environment variable
PORT=4001 npm run dev
```

### Database Issues

```bash
# Reset database
rm server/data/sessions.db
npm run db:migrate
```

### OpenAI API Issues

```bash
# Use stub mode instead
OPENAI_STUB=true npm run dev
```

### Memory Issues

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=2048" npm run dev
```

## Development Features

### Hot Reloading

Use the watch mode for automatic restarts:
```bash
npm run dev:watch
```

### Debugging

Start with debugging enabled:
```bash
npm run dev:debug
```

Then connect with Chrome DevTools:
1. Open Chrome
2. Go to `chrome://inspect`
3. Click "Open dedicated DevTools for Node"

### Environment Variables

Key development settings in `.env`:

```bash
# Server
NODE_ENV=development
PORT=4000
HOST=localhost

# OpenAI (set to true to avoid API calls)
OPENAI_STUB=false

# Logging
LOG_LEVEL=debug
DEBUG=false

# Rate limiting (disabled for easier testing)
DISABLE_RATE_LIMIT=true
```

## Next Steps

Once you have the basic setup working:

1. **Read the full documentation**: [README.md](README.md)
2. **Explore the API**: Check `server/spec/` for OpenAPI docs
3. **Run the test suite**: `npm test`
4. **Try the conversation flow**: Start a full interview session
5. **Generate a report**: Complete a session to see PDF generation

## Getting Help

- **Troubleshooting**: [docs/troubleshooting.md](docs/troubleshooting.md)
- **Architecture**: [docs/architecture.md](docs/architecture.md)
- **Full deployment**: [docs/deployment.md](docs/deployment.md)

## Development Workflow

```bash
# 1. Start development server
npm run dev:watch

# 2. Make changes to code
# Files are automatically reloaded

# 3. Test your changes
npm test

# 4. Check health
npm run health:check

# 5. View logs
npm run logs:audit
```

That's it! You should now have a fully functional local development environment.