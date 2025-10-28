#!/usr/bin/env node
/**
 * Database Migration Script
 * Handles database schema migrations and data transformations
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { config } from '../../config/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');
const MIGRATION_TABLE = 'schema_migrations';

class DatabaseMigrator {
  constructor() {
    this.dbConfig = config.database;
    this.db = null;
  }

  async initialize() {
    if (this.dbConfig.type === 'sqlite') {
      try {
        const { default: Database } = await import('better-sqlite3');
        
        // Ensure directory exists
        const dbDir = dirname(this.dbConfig.sqlite.path);
        if (!existsSync(dbDir)) {
          mkdirSync(dbDir, { recursive: true });
        }
        
        this.db = new Database(this.dbConfig.sqlite.path);
        
        // Apply SQLite optimizations
        const options = this.dbConfig.sqlite.options;
        if (options) {
          for (const [key, value] of Object.entries(options)) {
            this.db.pragma(`${key} = ${value}`);
          }
        }
      } catch (error) {
        if (error.code === 'ERR_MODULE_NOT_FOUND') {
          console.error('better-sqlite3 not found. Please install it with: npm install better-sqlite3');
          process.exit(1);
        }
        throw error;
      }
    } else {
      throw new Error(`Database type ${this.dbConfig.type} not supported for migrations yet`);
    }

    // Create migrations table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        checksum TEXT NOT NULL
      )
    `);
  }

  async getAppliedMigrations() {
    const stmt = this.db.prepare(`SELECT version FROM ${MIGRATION_TABLE} ORDER BY version`);
    return stmt.all().map(row => row.version);
  }

  async applyMigration(migration) {
    console.log(`Applying migration: ${migration.version} - ${migration.name}`);
    
    const transaction = this.db.transaction(() => {
      // Execute migration SQL
      this.db.exec(migration.sql);
      
      // Record migration
      const stmt = this.db.prepare(`
        INSERT INTO ${MIGRATION_TABLE} (version, name, checksum)
        VALUES (?, ?, ?)
      `);
      stmt.run(migration.version, migration.name, migration.checksum);
    });

    transaction();
    console.log(`Migration ${migration.version} applied successfully`);
  }

  async rollbackMigration(migration) {
    if (!migration.rollback) {
      throw new Error(`Migration ${migration.version} does not support rollback`);
    }

    console.log(`Rolling back migration: ${migration.version} - ${migration.name}`);
    
    const transaction = this.db.transaction(() => {
      // Execute rollback SQL
      this.db.exec(migration.rollback);
      
      // Remove migration record
      const stmt = this.db.prepare(`DELETE FROM ${MIGRATION_TABLE} WHERE version = ?`);
      stmt.run(migration.version);
    });

    transaction();
    console.log(`Migration ${migration.version} rolled back successfully`);
  }

  loadMigrations() {
    if (!existsSync(MIGRATIONS_DIR)) {
      mkdirSync(MIGRATIONS_DIR, { recursive: true });
      return [];
    }

    const migrationFiles = readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return migrationFiles.map(file => {
      const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      const [version, ...nameParts] = file.replace('.sql', '').split('_');
      const name = nameParts.join('_');
      
      // Parse migration file for up/down sections
      const sections = content.split('-- DOWN');
      const sql = sections[0].replace('-- UP', '').trim();
      const rollback = sections[1] ? sections[1].trim() : null;
      
      // Calculate checksum
      const checksum = createHash('sha256').update(content).digest('hex');

      return {
        version,
        name,
        sql,
        rollback,
        checksum,
        file
      };
    });
  }

  async migrate(targetVersion = null) {
    await this.initialize();
    
    const migrations = this.loadMigrations();
    const appliedMigrations = await this.getAppliedMigrations();
    
    const pendingMigrations = migrations.filter(m => 
      !appliedMigrations.includes(m.version) &&
      (!targetVersion || m.version <= targetVersion)
    );

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migrations`);
    
    for (const migration of pendingMigrations) {
      await this.applyMigration(migration);
    }

    console.log('All migrations applied successfully');
  }

  async rollback(targetVersion) {
    await this.initialize();
    
    const migrations = this.loadMigrations();
    const appliedMigrations = await this.getAppliedMigrations();
    
    const migrationsToRollback = migrations
      .filter(m => appliedMigrations.includes(m.version) && m.version > targetVersion)
      .sort((a, b) => b.version.localeCompare(a.version)); // Reverse order

    if (migrationsToRollback.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    console.log(`Rolling back ${migrationsToRollback.length} migrations`);
    
    for (const migration of migrationsToRollback) {
      await this.rollbackMigration(migration);
    }

    console.log('Rollback completed successfully');
  }

  async status() {
    await this.initialize();
    
    const migrations = this.loadMigrations();
    const appliedMigrations = await this.getAppliedMigrations();
    
    console.log('\nMigration Status:');
    console.log('================');
    
    for (const migration of migrations) {
      const status = appliedMigrations.includes(migration.version) ? '✓' : '✗';
      console.log(`${status} ${migration.version} - ${migration.name}`);
    }
    
    const pending = migrations.filter(m => !appliedMigrations.includes(m.version));
    console.log(`\nPending migrations: ${pending.length}`);
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// CLI interface
async function main() {
  const migrator = new DatabaseMigrator();
  const command = process.argv[2];
  const target = process.argv[3];

  try {
    switch (command) {
      case 'migrate':
        await migrator.migrate(target);
        break;
      case 'rollback':
        if (!target) {
          console.error('Rollback requires a target version');
          process.exit(1);
        }
        await migrator.rollback(target);
        break;
      case 'status':
        await migrator.status();
        break;
      default:
        console.log('Usage: node migrate.js [migrate|rollback|status] [version]');
        console.log('  migrate [version] - Apply pending migrations up to version');
        console.log('  rollback <version> - Rollback migrations to version');
        console.log('  status - Show migration status');
        break;
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    migrator.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DatabaseMigrator };