#!/usr/bin/env node
/**
 * Development Setup Script for ESG Client Interview Bot
 * Cross-platform Node.js version
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(__dirname);

// Colors for output (simplified for cross-platform)
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

// Logging functions
function logInfo(message) {
  console.log(`${colors.green}[INFO]${colors.reset} ${message}`);
}

function logWarn(message) {
  console.log(`${colors.yellow}[WARN]${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

// Check Node.js version
function checkNodeVersion() {
  logInfo("Checking Node.js version...");
  
  const nodeVersion = process.version.slice(1); // Remove 'v' prefix
  const [major, minor] = nodeVersion.split('.').map(Number);
  const requiredMajor = 18;
  
  if (major < requiredMajor) {
    logError(`Node.js version ${nodeVersion} is too old. Required: ${requiredMajor}.0.0+`);
    process.exit(1);
  }
  
  logInfo(`Node.js version ${nodeVersion} is compatible`);
}

// Create necessary directories
function createDirectories() {
  logInfo("Creating necessary directories...");
  
  const directories = [
    'server/data',
    'server/data/reports',
    'server/data/backups',
    'tmp',
    'logs'
  ];
  
  for (const dir of directories) {
    const fullPath = join(projectRoot, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  }
  
  logInfo("Directories created successfully");
}

// Setup environment file
function setupEnvironment() {
  logInfo("Setting up environment configuration...");
  
  const envPath = join(projectRoot, '.env');
  const templatePath = join(projectRoot, '.env.development.template');
  
  if (!existsSync(envPath)) {
    if (existsSync(templatePath)) {
      copyFileSync(templatePath, envPath);
      logInfo("Created .env from template");
    } else {
      logWarn(".env.development.template not found, .env will need to be created manually");
    }
  } else {
    logInfo(".env file already exists");
  }
  
  // Check if OpenAI API key needs to be configured
  try {
    const envContent = readFileSync(envPath, 'utf8');
    if (envContent.includes('OPENAI_API_KEY=your_openai_api_key_here') || 
        envContent.includes('OPENAI_API_KEY=')) {
      logWarn("Please update OPENAI_API_KEY in .env file, or set OPENAI_STUB=true for testing without API");
    }
  } catch (error) {
    logWarn("Could not read .env file to check API key configuration");
  }
}

// Install dependencies
function installDependencies() {
  logInfo("Installing dependencies...");
  
  try {
    execSync('npm install', { 
      cwd: projectRoot, 
      stdio: 'inherit' 
    });
    logInfo("Dependencies installed successfully");
  } catch (error) {
    logError("Failed to install dependencies");
    logError(error.message);
    process.exit(1);
  }
}

// Initialize database
function initializeDatabase() {
  logInfo("Initializing database...");
  
  const migratePath = join(projectRoot, 'scripts/database/migrate.js');
  
  if (existsSync(migratePath)) {
    try {
      execSync('npm run db:migrate', { 
        cwd: projectRoot, 
        stdio: 'inherit' 
      });
      logInfo("Database migrations completed");
    } catch (error) {
      logWarn("Database migration failed, but continuing setup");
      logWarn(error.message);
    }
  } else {
    logWarn("Migration script not found, skipping database initialization");
  }
}

// Create initial data files
function setupInitialData() {
  logInfo("Setting up initial data...");
  
  // Create audit log file
  const auditLogPath = join(projectRoot, 'server/data/audit.log');
  if (!existsSync(auditLogPath)) {
    writeFileSync(auditLogPath, '');
  }
  
  const dbPath = join(projectRoot, 'server/data/sessions.db');
  if (existsSync(dbPath)) {
    logInfo("Database file exists, skipping test data creation");
  } else {
    logInfo("Database will be created on first run");
  }
}

// Verify setup
function verifySetup() {
  logInfo("Verifying setup...");
  
  const requiredFiles = [
    'server/server.js',
    'server/router.js',
    'package.json',
    '.env'
  ];
  
  for (const file of requiredFiles) {
    const filePath = join(projectRoot, file);
    if (!existsSync(filePath)) {
      logError(`Required file missing: ${file}`);
      process.exit(1);
    }
  }
  
  // Test Node.js syntax of main server file
  try {
    execSync('node -c server/server.js', { 
      cwd: projectRoot, 
      stdio: 'pipe' 
    });
  } catch (error) {
    logError("Server file has syntax errors");
    logError(error.message);
    process.exit(1);
  }
  
  logInfo("Setup verification completed successfully");
}

// Display next steps
function showNextSteps() {
  logInfo("Development environment setup completed!");
  console.log();
  console.log("Next steps:");
  console.log("1. Review and update .env file with your configuration");
  console.log("2. If you don't have an OpenAI API key, set OPENAI_STUB=true in .env");
  console.log("3. Start the development server: npm run dev");
  console.log("4. Open your browser to: http://localhost:4000");
  console.log("5. Check health endpoint: curl http://localhost:4000/health");
  console.log();
  console.log("Useful development commands:");
  console.log("  npm run dev         - Start development server");
  console.log("  npm run dev:stub    - Start with OpenAI stub mode");
  console.log("  npm run dev:watch   - Start with file watching");
  console.log("  npm test            - Run tests");
  console.log("  npm run db:status   - Check database migration status");
  console.log("  npm run health:check - Test health endpoint");
  console.log();
  console.log("For troubleshooting, see: docs/troubleshooting.md");
}

// Main setup function
async function main() {
  try {
    logInfo("Starting development environment setup...");
    
    checkNodeVersion();
    createDirectories();
    setupEnvironment();
    installDependencies();
    initializeDatabase();
    setupInitialData();
    verifySetup();
    showNextSteps();
    
  } catch (error) {
    logError("Setup failed:");
    logError(error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}