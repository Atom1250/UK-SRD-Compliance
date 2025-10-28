import { createHash, randomBytes } from "node:crypto";
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.join(__dirname, "../data/reports");
const ACCESS_LOG_FILE = path.join(__dirname, "../data/access.log");

// Ensure storage directory exists
if (!existsSync(STORAGE_DIR)) {
  mkdirSync(STORAGE_DIR, { recursive: true });
}

// In-memory storage for quick access (with secure metadata)
const reportMetadata = new Map();
const accessTokens = new Map();
const downloadTracking = new Map();

// Secure file storage with versioning and audit trail
export const storeReportArtifacts = (sessionId, buffer, metadata = {}) => {
  try {
    const timestamp = new Date().toISOString();
    const version = getNextVersion(sessionId);
    const filename = `${sessionId}_v${version}_${Date.now()}.pdf`;
    const filepath = path.join(STORAGE_DIR, filename);
    
    // Generate secure access token
    const accessToken = generateAccessToken();
    
    // Create document record with security metadata
    const documentRecord = {
      sessionId,
      version,
      filename,
      filepath,
      hash: createHash("sha256").update(buffer).digest("hex"),
      size: buffer.length,
      createdAt: timestamp,
      accessToken,
      downloadCount: 0,
      lastAccessed: null,
      metadata: {
        ...metadata,
        encrypted: false, // Future enhancement
        compressionLevel: 0
      },
      auditTrail: [{
        action: "created",
        timestamp,
        details: "Document stored with secure access token"
      }]
    };
    
    // Write file to secure storage
    writeFileSync(filepath, buffer, { mode: 0o600 }); // Restricted permissions
    
    // Store metadata
    reportMetadata.set(sessionId, documentRecord);
    accessTokens.set(accessToken, sessionId);
    
    // Log storage event
    logAccess(sessionId, "STORE", { version, filename, hash: documentRecord.hash });
    
    return {
      success: true,
      version,
      accessToken,
      hash: documentRecord.hash,
      filename
    };
    
  } catch (error) {
    logAccess(sessionId, "STORE_ERROR", { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
};

// Secure document retrieval with access control
export const getReportArtifact = (sessionId, accessToken = null) => {
  try {
    const record = reportMetadata.get(sessionId);
    if (!record) {
      logAccess(sessionId, "ACCESS_DENIED", { reason: "Document not found" });
      return null;
    }
    
    // Verify access token if provided
    if (accessToken && record.accessToken !== accessToken) {
      logAccess(sessionId, "ACCESS_DENIED", { reason: "Invalid access token" });
      return null;
    }
    
    // Check file exists
    if (!existsSync(record.filepath)) {
      logAccess(sessionId, "ACCESS_ERROR", { reason: "File not found on disk" });
      return null;
    }
    
    // Read and return file
    const buffer = readFileSync(record.filepath);
    
    // Update access tracking
    record.downloadCount++;
    record.lastAccessed = new Date().toISOString();
    record.auditTrail.push({
      action: "accessed",
      timestamp: record.lastAccessed,
      details: `Download #${record.downloadCount}`
    });
    
    // Track download
    trackDownload(sessionId, accessToken);
    
    // Log access
    logAccess(sessionId, "ACCESS_SUCCESS", { 
      downloadCount: record.downloadCount,
      fileSize: buffer.length 
    });
    
    return {
      buffer,
      metadata: record.metadata,
      version: record.version,
      hash: record.hash,
      downloadCount: record.downloadCount
    };
    
  } catch (error) {
    logAccess(sessionId, "ACCESS_ERROR", { error: error.message });
    return null;
  }
};

// Get document versions and history
export const getDocumentVersions = (sessionId) => {
  const record = reportMetadata.get(sessionId);
  if (!record) return [];
  
  // In a full implementation, this would scan for all versions
  return [{
    version: record.version,
    createdAt: record.createdAt,
    hash: record.hash,
    size: record.size,
    downloadCount: record.downloadCount,
    lastAccessed: record.lastAccessed
  }];
};

// Generate secure access token
const generateAccessToken = () => {
  return randomBytes(32).toString('hex');
};

// Get next version number for a session
const getNextVersion = (sessionId) => {
  const existing = reportMetadata.get(sessionId);
  return existing ? existing.version + 1 : 1;
};

// Track download activity
const trackDownload = (sessionId, accessToken) => {
  const key = `${sessionId}:${accessToken}`;
  const existing = downloadTracking.get(key) || { count: 0, timestamps: [] };
  existing.count++;
  existing.timestamps.push(new Date().toISOString());
  
  // Keep only last 10 download timestamps
  if (existing.timestamps.length > 10) {
    existing.timestamps = existing.timestamps.slice(-10);
  }
  
  downloadTracking.set(key, existing);
};

// Comprehensive access logging
const logAccess = (sessionId, action, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    sessionId,
    action,
    details,
    ip: "127.0.0.1", // Would be populated from request in real implementation
    userAgent: "ESG-Bot/1.0"
  };
  
  try {
    const logLine = JSON.stringify(logEntry) + '\n';
    writeFileSync(ACCESS_LOG_FILE, logLine, { flag: 'a' });
  } catch (error) {
    console.error('Failed to write access log:', error);
  }
};

// Administrative functions for document management
export const getStorageStats = () => {
  try {
    const files = readdirSync(STORAGE_DIR);
    let totalSize = 0;
    let totalFiles = files.length;
    
    files.forEach(file => {
      const filepath = path.join(STORAGE_DIR, file);
      const stats = statSync(filepath);
      totalSize += stats.size;
    });
    
    return {
      totalFiles,
      totalSize,
      totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
      activeDocuments: reportMetadata.size,
      accessTokens: accessTokens.size
    };
  } catch (error) {
    return { error: error.message };
  }
};

// Clean up old documents (administrative function)
export const cleanupOldDocuments = (daysOld = 90) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  let cleanedCount = 0;
  
  for (const [sessionId, record] of reportMetadata.entries()) {
    const createdDate = new Date(record.createdAt);
    if (createdDate < cutoffDate) {
      try {
        // Remove file
        if (existsSync(record.filepath)) {
          // In production, would move to archive instead of delete
          // unlinkSync(record.filepath);
        }
        
        // Remove from memory
        reportMetadata.delete(sessionId);
        accessTokens.delete(record.accessToken);
        
        cleanedCount++;
        logAccess(sessionId, "CLEANUP", { reason: "Document expired", daysOld });
      } catch (error) {
        logAccess(sessionId, "CLEANUP_ERROR", { error: error.message });
      }
    }
  }
  
  return { cleanedCount };
};

// Validate document integrity
export const validateDocumentIntegrity = (sessionId) => {
  const record = reportMetadata.get(sessionId);
  if (!record) return { valid: false, reason: "Document not found" };
  
  try {
    if (!existsSync(record.filepath)) {
      return { valid: false, reason: "File missing from storage" };
    }
    
    const buffer = readFileSync(record.filepath);
    const currentHash = createHash("sha256").update(buffer).digest("hex");
    
    if (currentHash !== record.hash) {
      logAccess(sessionId, "INTEGRITY_VIOLATION", { 
        expectedHash: record.hash, 
        actualHash: currentHash 
      });
      return { valid: false, reason: "Hash mismatch - file may be corrupted" };
    }
    
    return { 
      valid: true, 
      hash: currentHash,
      size: buffer.length,
      lastVerified: new Date().toISOString()
    };
    
  } catch (error) {
    return { valid: false, reason: error.message };
  }
};
