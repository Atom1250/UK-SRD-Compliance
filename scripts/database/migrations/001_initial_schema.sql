-- UP
-- Initial database schema for ESG Client Interview Bot

-- Sessions table to store conversation sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    stage TEXT NOT NULL DEFAULT 'explanation',
    client_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    data TEXT, -- JSON data
    context TEXT, -- JSON context
    audit TEXT -- JSON audit trail
);

-- Create index on created_at for performance
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);

-- Create index on stage for filtering
CREATE INDEX IF NOT EXISTS idx_sessions_stage ON sessions(stage);

-- Reports table to store generated reports
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'suitability',
    status TEXT NOT NULL DEFAULT 'pending',
    file_path TEXT,
    file_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Create index on session_id for lookups
CREATE INDEX IF NOT EXISTS idx_reports_session_id ON reports(session_id);

-- Audit log table for compliance tracking
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    event_type TEXT NOT NULL,
    event_data TEXT, -- JSON data
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address TEXT
);

-- Create index on session_id and timestamp
CREATE INDEX IF NOT EXISTS idx_audit_session_timestamp ON audit_log(session_id, timestamp);

-- Create index on event_type for filtering
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log(event_type);

-- DOWN
-- Rollback initial schema

DROP INDEX IF EXISTS idx_audit_event_type;
DROP INDEX IF EXISTS idx_audit_session_timestamp;
DROP TABLE IF EXISTS audit_log;

DROP INDEX IF EXISTS idx_reports_session_id;
DROP TABLE IF EXISTS reports;

DROP INDEX IF EXISTS idx_sessions_stage;
DROP INDEX IF EXISTS idx_sessions_created_at;
DROP TABLE IF EXISTS sessions;