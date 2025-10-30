import { randomUUID } from 'node:crypto';
import { getSession, getSessionEnhanced } from '../state/sessionStore.js';
import { validateSessionData } from '../state/validateSession.js';

let WebSocketServer = null;
let websocketModulePromise = null;

const loadWebSocketServer = () => {
  if (!websocketModulePromise) {
    websocketModulePromise = import('ws')
      .then((module) => {
        const exported = module?.WebSocketServer ?? module?.default ?? null;
        if (!exported) {
          console.warn('WebSocket session monitor disabled: ws package has no WebSocketServer export');
        }
        return exported;
      })
      .catch((error) => {
        if (error?.code === 'ERR_MODULE_NOT_FOUND' || error?.code === 'MODULE_NOT_FOUND') {
          console.log('WebSocket session monitor not available');
        } else {
          console.error('Failed to load ws package for session monitor', error);
        }
        return null;
      });
  }

  return websocketModulePromise;
};

class SessionMonitor {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // clientId -> { ws, subscriptions, metadata }
    this.sessionSubscriptions = new Map(); // sessionId -> Set of clientIds
    this.alertRules = new Map(); // ruleId -> alertRule
    this.activeAlerts = new Map(); // alertId -> alert
    
    this.setupDefaultAlertRules();
  }

  async initialize(server) {
    if (this.wss) {
      return;
    }

    if (!WebSocketServer) {
      WebSocketServer = await loadWebSocketServer();
    }

    if (!WebSocketServer) {
      return;
    }

    this.wss = new WebSocketServer({
      server,
      path: '/ws/sessions'
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    console.log('WebSocket session monitor initialized');
  }

  handleConnection(ws, req) {
    const clientId = randomUUID();
    const clientInfo = {
      ws,
      subscriptions: new Set(),
      metadata: {
        connectedAt: new Date().toISOString(),
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      }
    };

    this.clients.set(clientId, clientInfo);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(clientId, message);
      } catch (error) {
        this.sendError(clientId, 'Invalid JSON message');
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    });

    // Send welcome message
    this.sendMessage(clientId, {
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString()
    });
  }

  handleMessage(clientId, message) {
    const { type, payload } = message;

    switch (type) {
      case 'subscribe_session':
        this.subscribeToSession(clientId, payload.sessionId);
        break;
      
      case 'unsubscribe_session':
        this.unsubscribeFromSession(clientId, payload.sessionId);
        break;
      
      case 'subscribe_all_sessions':
        this.subscribeToAllSessions(clientId);
        break;
      
      case 'get_session_status':
        this.sendSessionStatus(clientId, payload.sessionId);
        break;
      
      case 'get_active_alerts':
        this.sendActiveAlerts(clientId);
        break;
      
      case 'acknowledge_alert':
        this.acknowledgeAlert(clientId, payload.alertId);
        break;
      
      case 'ping':
        this.sendMessage(clientId, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      
      default:
        this.sendError(clientId, `Unknown message type: ${type}`);
    }
  }

  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all session subscriptions
    client.subscriptions.forEach(sessionId => {
      const subscribers = this.sessionSubscriptions.get(sessionId);
      if (subscribers) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          this.sessionSubscriptions.delete(sessionId);
        }
      }
    });

    this.clients.delete(clientId);
    console.log(`Client ${clientId} disconnected`);
  }

  subscribeToSession(clientId, sessionId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.add(sessionId);
    
    if (!this.sessionSubscriptions.has(sessionId)) {
      this.sessionSubscriptions.set(sessionId, new Set());
    }
    this.sessionSubscriptions.get(sessionId).add(clientId);

    this.sendMessage(clientId, {
      type: 'subscription_confirmed',
      sessionId,
      timestamp: new Date().toISOString()
    });

    // Send current session status
    this.sendSessionStatus(clientId, sessionId);
  }

  unsubscribeFromSession(clientId, sessionId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(sessionId);
    
    const subscribers = this.sessionSubscriptions.get(sessionId);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.sessionSubscriptions.delete(sessionId);
      }
    }

    this.sendMessage(clientId, {
      type: 'unsubscription_confirmed',
      sessionId,
      timestamp: new Date().toISOString()
    });
  }

  subscribeToAllSessions(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.add('*'); // Special subscription for all sessions

    this.sendMessage(clientId, {
      type: 'global_subscription_confirmed',
      timestamp: new Date().toISOString()
    });
  }

  sendSessionStatus(clientId, sessionId) {
    try {
      const session = getSession(sessionId);
      if (!session) {
        this.sendError(clientId, `Session ${sessionId} not found`);
        return;
      }

      const enhanced = getSessionEnhanced(sessionId);
      const status = this.buildSessionStatus(session, enhanced);

      this.sendMessage(clientId, {
        type: 'session_status',
        sessionId,
        status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.sendError(clientId, `Failed to get session status: ${error.message}`);
    }
  }

  sendActiveAlerts(clientId) {
    const alerts = Array.from(this.activeAlerts.values())
      .filter(alert => !alert.acknowledged)
      .sort((a, b) => {
        // Sort by priority (high -> medium -> low) then by timestamp
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 0;
        const bPriority = priorityOrder[b.priority] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

    this.sendMessage(clientId, {
      type: 'active_alerts',
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString()
    });
  }

  acknowledgeAlert(clientId, alertId) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      this.sendError(clientId, `Alert ${alertId} not found`);
      return;
    }

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = clientId;

    // Broadcast alert acknowledgment to all relevant subscribers
    this.broadcastToSessionSubscribers(alert.sessionId, {
      type: 'alert_acknowledged',
      alertId,
      sessionId: alert.sessionId,
      acknowledgedBy: clientId,
      timestamp: alert.acknowledgedAt
    });
  }

  // Public methods for triggering updates from other parts of the system

  notifySessionUpdate(sessionId, updateType, data = {}) {
    try {
      const session = getSession(sessionId);
      if (!session) return;

      const enhanced = getSessionEnhanced(sessionId);
      const status = this.buildSessionStatus(session, enhanced);

      // Check for alert conditions
      this.checkAlertConditions(session, enhanced, updateType);

      // Broadcast to subscribers
      this.broadcastToSessionSubscribers(sessionId, {
        type: 'session_updated',
        sessionId,
        updateType,
        status,
        data,
        timestamp: new Date().toISOString()
      });

      // Also broadcast to global subscribers
      this.broadcastToGlobalSubscribers({
        type: 'session_updated',
        sessionId,
        updateType,
        status,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to notify session update:', error);
    }
  }

  notifySessionCreated(sessionId) {
    this.notifySessionUpdate(sessionId, 'created');
  }

  notifySessionStageChange(sessionId, newStage, oldStage) {
    this.notifySessionUpdate(sessionId, 'stage_change', { newStage, oldStage });
  }

  notifyComplianceIssue(sessionId, issueType, details) {
    this.notifySessionUpdate(sessionId, 'compliance_issue', { issueType, details });
    
    // Create high-priority alert for compliance issues
    this.createAlert({
      sessionId,
      type: 'compliance_violation',
      priority: 'high',
      title: `Compliance Issue: ${issueType}`,
      message: details.message || 'A compliance issue has been detected',
      data: details
    });
  }

  notifyGuardrailTrigger(sessionId, guardrailType, details) {
    this.notifySessionUpdate(sessionId, 'guardrail_trigger', { guardrailType, details });
    
    // Create medium-priority alert for guardrail triggers
    this.createAlert({
      sessionId,
      type: 'guardrail_trigger',
      priority: 'medium',
      title: `Guardrail Triggered: ${guardrailType}`,
      message: details.message || 'A guardrail condition has been triggered',
      data: details
    });
  }

  // Private helper methods

  buildSessionStatus(session, enhanced) {
    return {
      id: session.id,
      stage: session.stage,
      status: this.getSessionStatus(session),
      progress: this.getSessionProgress(session),
      validation: enhanced?.validation || null,
      lastActivity: this.getLastActivity(session),
      complianceStatus: {
        valid: enhanced?.validation?.valid || false,
        cobs9aCompliant: enhanced?.validation?.cobs9aCompliant || false,
        issueCount: enhanced?.validation?.issues?.length || 0,
        warningCount: enhanced?.validation?.warnings?.length || 0
      },
      metrics: {
        eventsCount: session.events?.length || 0,
        timeSpent: this.calculateTimeSpent(session),
        completionPercentage: this.calculateCompletionPercentage(session)
      }
    };
  }

  getSessionStatus(session) {
    if (session.data?.archived) return 'archived';
    if (session.data?.timestamps?.session_closed_at) return 'completed';
    return 'active';
  }

  getSessionProgress(session) {
    const stages = [
      'SEGMENT_A_EXPLANATION',
      'SEGMENT_B_ONBOARDING', 
      'SEGMENT_C_CONSENT',
      'SEGMENT_D_EDUCATION',
      'SEGMENT_E_OPTIONS',
      'SEGMENT_F_CONFIRMATION',
      'SEGMENT_G_REPORT',
      'SEGMENT_H_DELIVERY'
    ];
    
    const currentIndex = stages.indexOf(session.stage);
    return {
      currentStage: session.stage,
      stageIndex: currentIndex,
      totalStages: stages.length,
      percentage: currentIndex >= 0 ? Math.round(((currentIndex + 1) / stages.length) * 100) : 0
    };
  }

  getLastActivity(session) {
    if (!session.events || session.events.length === 0) {
      return {
        timestamp: session.updatedAt,
        type: 'session_created',
        author: 'system'
      };
    }
    
    const lastEvent = session.events[session.events.length - 1];
    return {
      timestamp: lastEvent.createdAt,
      type: lastEvent.type,
      author: lastEvent.author
    };
  }

  calculateTimeSpent(session) {
    const start = new Date(session.createdAt);
    const end = session.data?.timestamps?.session_closed_at ? 
      new Date(session.data.timestamps.session_closed_at) : 
      new Date();
    
    return Math.round((end - start) / 1000 / 60); // minutes
  }

  calculateCompletionPercentage(session) {
    const progress = this.getSessionProgress(session);
    return progress.percentage;
  }

  checkAlertConditions(session, enhanced, updateType) {
    this.alertRules.forEach((rule, ruleId) => {
      if (rule.condition(session, enhanced, updateType)) {
        this.createAlert({
          sessionId: session.id,
          type: rule.type,
          priority: rule.priority,
          title: rule.title,
          message: rule.getMessage(session, enhanced),
          data: rule.getData ? rule.getData(session, enhanced) : {}
        });
      }
    });
  }

  createAlert(alertData) {
    const alertId = randomUUID();
    const alert = {
      id: alertId,
      sessionId: alertData.sessionId,
      type: alertData.type,
      priority: alertData.priority,
      title: alertData.title,
      message: alertData.message,
      data: alertData.data || {},
      timestamp: new Date().toISOString(),
      acknowledged: false
    };

    this.activeAlerts.set(alertId, alert);

    // Broadcast alert to relevant subscribers
    this.broadcastToSessionSubscribers(alertData.sessionId, {
      type: 'alert_created',
      alert,
      timestamp: alert.timestamp
    });

    // Also broadcast to global subscribers
    this.broadcastToGlobalSubscribers({
      type: 'alert_created',
      alert,
      timestamp: alert.timestamp
    });

    return alertId;
  }

  setupDefaultAlertRules() {
    // Risk-capacity mismatch alert
    this.alertRules.set('risk_capacity_mismatch', {
      type: 'risk_capacity_mismatch',
      priority: 'high',
      title: 'Risk-Capacity Mismatch Detected',
      condition: (session, enhanced, updateType) => {
        const profile = session.data?.client_profile;
        if (!profile?.risk_tolerance || !profile?.capacity_for_loss) return false;
        
        const riskNum = parseInt(profile.risk_tolerance);
        const capacity = profile.capacity_for_loss;
        
        return (riskNum >= 6 && capacity === 'low') || 
               (riskNum >= 5 && capacity === 'low' && updateType === 'data_update');
      },
      getMessage: (session, enhanced) => {
        const profile = session.data?.client_profile;
        return `Client has high risk tolerance (${profile.risk_tolerance}) but low capacity for loss`;
      }
    });

    // Validation failure alert
    this.alertRules.set('validation_failure', {
      type: 'validation_failure',
      priority: 'high',
      title: 'Session Validation Failed',
      condition: (session, enhanced, updateType) => {
        return enhanced?.validation && !enhanced.validation.valid;
      },
      getMessage: (session, enhanced) => {
        const issues = enhanced.validation.issues || [];
        return `Session has ${issues.length} validation issue(s): ${issues.slice(0, 2).join(', ')}`;
      },
      getData: (session, enhanced) => ({
        issues: enhanced.validation.issues,
        warnings: enhanced.validation.warnings
      })
    });

    // COBS 9A compliance alert
    this.alertRules.set('cobs9a_non_compliance', {
      type: 'cobs9a_non_compliance',
      priority: 'high',
      title: 'COBS 9A Non-Compliance',
      condition: (session, enhanced, updateType) => {
        return enhanced?.validation && !enhanced.validation.cobs9aCompliant;
      },
      getMessage: (session, enhanced) => {
        return 'Session does not meet COBS 9A suitability requirements';
      }
    });

    // Session stuck alert (no activity for extended period)
    this.alertRules.set('session_stuck', {
      type: 'session_stuck',
      priority: 'medium',
      title: 'Session Inactive',
      condition: (session, enhanced, updateType) => {
        const lastActivity = new Date(session.updatedAt);
        const now = new Date();
        const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);
        
        return hoursSinceActivity > 2 && session.stage !== 'SEGMENT_H_DELIVERY';
      },
      getMessage: (session, enhanced) => {
        const lastActivity = new Date(session.updatedAt);
        const hoursSinceActivity = Math.round((new Date() - lastActivity) / (1000 * 60 * 60));
        return `Session has been inactive for ${hoursSinceActivity} hours`;
      }
    });

    // Educational request alert
    this.alertRules.set('educational_request', {
      type: 'educational_request',
      priority: 'low',
      title: 'Educational Request',
      condition: (session, enhanced, updateType) => {
        return updateType === 'educational_request';
      },
      getMessage: (session, enhanced) => {
        const requests = session.data?.educational_requests || [];
        const latest = requests[requests.length - 1];
        return `Client requested education on: ${latest?.topic || 'unknown topic'}`;
      }
    });
  }

  broadcastToSessionSubscribers(sessionId, message) {
    const subscribers = this.sessionSubscriptions.get(sessionId);
    if (!subscribers) return;

    subscribers.forEach(clientId => {
      this.sendMessage(clientId, message);
    });
  }

  broadcastToGlobalSubscribers(message) {
    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has('*')) {
        this.sendMessage(clientId, message);
      }
    });
  }

  sendMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== client.ws.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Failed to send message to client ${clientId}:`, error);
      this.handleDisconnection(clientId);
      return false;
    }
  }

  sendError(clientId, error) {
    this.sendMessage(clientId, {
      type: 'error',
      error,
      timestamp: new Date().toISOString()
    });
  }

  // Public API for getting connection stats
  getConnectionStats() {
    return {
      totalConnections: this.clients.size,
      sessionSubscriptions: this.sessionSubscriptions.size,
      activeAlerts: Array.from(this.activeAlerts.values()).filter(a => !a.acknowledged).length,
      totalAlerts: this.activeAlerts.size
    };
  }

  // Cleanup old alerts
  cleanupOldAlerts(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    const cutoff = new Date(Date.now() - maxAge);
    
    this.activeAlerts.forEach((alert, alertId) => {
      if (new Date(alert.timestamp) < cutoff && alert.acknowledged) {
        this.activeAlerts.delete(alertId);
      }
    });
  }
}

// Export singleton instance
export const sessionMonitor = new SessionMonitor();
