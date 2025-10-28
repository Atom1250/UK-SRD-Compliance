#!/usr/bin/env node
/**
 * Database Backup Script
 * Handles database backups and restoration
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, statSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { config } from '../../config/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = process.env.BACKUP_DIR || join(process.cwd(), 'backups');

class DatabaseBackup {
  constructor() {
    this.dbConfig = config.database;
    this.backupDir = BACKUP_DIR;
    
    // Ensure backup directory exists
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }
  }

  generateBackupName(prefix = 'backup') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}_${timestamp}`;
  }

  async backupSQLite(backupName) {
    const dbPath = this.dbConfig.sqlite.path;
    
    if (!existsSync(dbPath)) {
      throw new Error(`Database file not found: ${dbPath}`);
    }

    const backupPath = join(this.backupDir, `${backupName}.db`);
    const metadataPath = join(this.backupDir, `${backupName}.json`);

    // Copy database file
    copyFileSync(dbPath, backupPath);

    // Create metadata file
    const stats = statSync(dbPath);
    const metadata = {
      type: 'sqlite',
      originalPath: dbPath,
      backupPath: backupPath,
      timestamp: new Date().toISOString(),
      size: stats.size,
      checksum: this.calculateChecksum(dbPath)
    };

    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`SQLite backup created: ${backupPath}`);
    return { backupPath, metadataPath, metadata };
  }

  async backupPostgreSQL(backupName) {
    const pgConfig = this.dbConfig.postgresql;
    const backupPath = join(this.backupDir, `${backupName}.sql`);
    const metadataPath = join(this.backupDir, `${backupName}.json`);

    // Build pg_dump command
    const env = {
      ...process.env,
      PGPASSWORD: pgConfig.password
    };

    const command = [
      'pg_dump',
      `-h ${pgConfig.host}`,
      `-p ${pgConfig.port}`,
      `-U ${pgConfig.username}`,
      `-d ${pgConfig.database}`,
      '--no-password',
      '--verbose',
      '--clean',
      '--if-exists',
      `--file=${backupPath}`
    ].join(' ');

    try {
      execSync(command, { env, stdio: 'inherit' });
    } catch (error) {
      throw new Error(`PostgreSQL backup failed: ${error.message}`);
    }

    // Create metadata file
    const stats = statSync(backupPath);
    const metadata = {
      type: 'postgresql',
      host: pgConfig.host,
      port: pgConfig.port,
      database: pgConfig.database,
      username: pgConfig.username,
      backupPath: backupPath,
      timestamp: new Date().toISOString(),
      size: stats.size,
      checksum: this.calculateChecksum(backupPath)
    };

    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`PostgreSQL backup created: ${backupPath}`);
    return { backupPath, metadataPath, metadata };
  }

  async backup(name = null) {
    const backupName = name || this.generateBackupName();
    
    console.log(`Creating backup: ${backupName}`);
    console.log(`Database type: ${this.dbConfig.type}`);

    switch (this.dbConfig.type) {
      case 'sqlite':
        return await this.backupSQLite(backupName);
      case 'postgresql':
        return await this.backupPostgreSQL(backupName);
      default:
        throw new Error(`Unsupported database type: ${this.dbConfig.type}`);
    }
  }

  async restoreSQLite(backupPath) {
    const dbPath = this.dbConfig.sqlite.path;
    
    if (!existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Create backup of current database if it exists
    if (existsSync(dbPath)) {
      const currentBackup = `${dbPath}.pre-restore.${Date.now()}`;
      copyFileSync(dbPath, currentBackup);
      console.log(`Current database backed up to: ${currentBackup}`);
    }

    // Restore from backup
    copyFileSync(backupPath, dbPath);
    console.log(`SQLite database restored from: ${backupPath}`);
  }

  async restorePostgreSQL(backupPath) {
    const pgConfig = this.dbConfig.postgresql;
    
    if (!existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Build psql command
    const env = {
      ...process.env,
      PGPASSWORD: pgConfig.password
    };

    const command = [
      'psql',
      `-h ${pgConfig.host}`,
      `-p ${pgConfig.port}`,
      `-U ${pgConfig.username}`,
      `-d ${pgConfig.database}`,
      '--no-password',
      '--verbose',
      `--file=${backupPath}`
    ].join(' ');

    try {
      execSync(command, { env, stdio: 'inherit' });
      console.log(`PostgreSQL database restored from: ${backupPath}`);
    } catch (error) {
      throw new Error(`PostgreSQL restore failed: ${error.message}`);
    }
  }

  async restore(backupPath) {
    console.log(`Restoring from backup: ${backupPath}`);

    // Try to load metadata to determine backup type
    const metadataPath = backupPath.replace(/\.(db|sql)$/, '.json');
    let backupType = this.dbConfig.type;

    if (existsSync(metadataPath)) {
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
      backupType = metadata.type;
      
      // Verify checksum if available
      if (metadata.checksum) {
        const currentChecksum = this.calculateChecksum(backupPath);
        if (currentChecksum !== metadata.checksum) {
          throw new Error('Backup file checksum mismatch - file may be corrupted');
        }
      }
    }

    switch (backupType) {
      case 'sqlite':
        await this.restoreSQLite(backupPath);
        break;
      case 'postgresql':
        await this.restorePostgreSQL(backupPath);
        break;
      default:
        throw new Error(`Unsupported backup type: ${backupType}`);
    }
  }

  listBackups() {
    const backups = readdirSync(this.backupDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const metadataPath = join(this.backupDir, file);
        const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
        return {
          name: file.replace('.json', ''),
          ...metadata
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log('\nAvailable Backups:');
    console.log('==================');
    
    if (backups.length === 0) {
      console.log('No backups found');
      return;
    }

    for (const backup of backups) {
      const size = (backup.size / 1024 / 1024).toFixed(2);
      console.log(`${backup.name} (${backup.type}) - ${backup.timestamp} - ${size}MB`);
    }
  }

  calculateChecksum(filePath) {
    const content = readFileSync(filePath);
    return createHash('sha256').update(content).digest('hex');
  }

  async cleanup(retentionDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const files = readdirSync(this.backupDir);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = join(this.backupDir, file);
      const stats = statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        unlinkSync(filePath);
        deletedCount++;
        console.log(`Deleted old backup: ${file}`);
      }
    }

    console.log(`Cleanup completed. Deleted ${deletedCount} old backup files.`);
  }
}

// CLI interface
async function main() {
  const backup = new DatabaseBackup();
  const command = process.argv[2];
  const target = process.argv[3];

  try {
    switch (command) {
      case 'create':
        await backup.backup(target);
        break;
      case 'restore':
        if (!target) {
          console.error('Restore requires a backup file path');
          process.exit(1);
        }
        await backup.restore(target);
        break;
      case 'list':
        backup.listBackups();
        break;
      case 'cleanup':
        const days = target ? parseInt(target) : 30;
        await backup.cleanup(days);
        break;
      default:
        console.log('Usage: node backup.js [create|restore|list|cleanup] [target]');
        console.log('  create [name] - Create a new backup');
        console.log('  restore <path> - Restore from backup file');
        console.log('  list - List available backups');
        console.log('  cleanup [days] - Remove backups older than N days (default: 30)');
        break;
    }
  } catch (error) {
    console.error('Backup operation failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DatabaseBackup };