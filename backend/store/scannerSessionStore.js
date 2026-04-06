const crypto = require('crypto');
const os = require('os');
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const MAX_SCANS_PER_SESSION = 100;
const sessions = new Map();
const sessionsByClientKey = new Map();

const normalizeOrigin = (value) => `${value || ''}`.trim().replace(/\/$/, '');

const buildSessionUrl = (baseOrigin, sessionId) => `${baseOrigin}/mobile-scanner?sessionId=${sessionId}`;

const getDefaultFrontendOrigin = () => {
  const configuredOrigin = normalizeOrigin(process.env.PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL);
  if (configuredOrigin && /^https:\/\//i.test(configuredOrigin)) {
    return configuredOrigin;
  }

  return '';
};

const getLocalFrontendOrigin = () => {
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        return `http://${entry.address}:5173`;
      }
    }
  }

  return '';
};

const getPreferredFrontendOrigin = () => getDefaultFrontendOrigin();

const cleanupExpiredSessions = () => {
  const now = Date.now();

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      if (session.clientKey) {
        sessionsByClientKey.delete(session.clientKey);
      }
      sessions.delete(sessionId);
    }
  }
};

const sanitizeSession = (session) => ({
  sessionId: session.sessionId,
  ownerUserId: session.ownerUserId,
  status: session.status,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
  expiresAt: session.updatedAt + SESSION_TTL_MS,
  sessionUrl: session.sessionUrl,
  frontendOrigin: session.frontendOrigin,
  scans: session.scans,
});

const createSession = (frontendOrigin, clientKey, ownerUserId) => {
  cleanupExpiredSessions();

  const now = Date.now();
  const baseOrigin = normalizeOrigin(frontendOrigin) || getDefaultFrontendOrigin();
  const normalizedClientKey = `${clientKey || ''}`.trim();
  const normalizedOwnerUserId = `${ownerUserId || ''}`.trim();

  if (normalizedClientKey) {
    const existingSessionId = sessionsByClientKey.get(normalizedClientKey);
    const existingSession = existingSessionId ? sessions.get(existingSessionId) : null;

    if (
      existingSession
      && existingSession.status === 'active'
      && existingSession.ownerUserId === normalizedOwnerUserId
    ) {
      existingSession.frontendOrigin = baseOrigin;
      existingSession.sessionUrl = buildSessionUrl(baseOrigin, existingSession.sessionId);
      existingSession.updatedAt = now;
      return sanitizeSession(existingSession);
    }

    sessionsByClientKey.delete(normalizedClientKey);
  }

  const sessionId = crypto.randomBytes(8).toString('hex');
  const sessionUrl = buildSessionUrl(baseOrigin, sessionId);

  const session = {
    sessionId,
    clientKey: normalizedClientKey || null,
    ownerUserId: normalizedOwnerUserId || null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    frontendOrigin: baseOrigin,
    sessionUrl,
    scans: [],
  };

  sessions.set(sessionId, session);
  if (session.clientKey) {
    sessionsByClientKey.set(session.clientKey, sessionId);
  }

  return sanitizeSession(session);
};

const getSession = (sessionId) => {
  cleanupExpiredSessions();
  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  return sanitizeSession(session);
};

const addScan = (sessionId, barcode) => {
  cleanupExpiredSessions();
  const session = sessions.get(sessionId);

  if (!session || session.status !== 'active') {
    return null;
  }

  const scan = {
    id: crypto.randomUUID(),
    barcode,
    createdAt: Date.now(),
  };

  session.scans.push(scan);
  session.updatedAt = scan.createdAt;

  if (session.scans.length > MAX_SCANS_PER_SESSION) {
    session.scans = session.scans.slice(-MAX_SCANS_PER_SESSION);
  }

  return {
    session: sanitizeSession(session),
    scan,
  };
};

const closeSession = (sessionId) => {
  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  session.status = 'closed';
  session.updatedAt = Date.now();
  if (session.clientKey) {
    sessionsByClientKey.delete(session.clientKey);
  }

  return sanitizeSession(session);
};

module.exports = {
  createSession,
  getSession,
  addScan,
  closeSession,
  getPreferredFrontendOrigin,
  getLocalFrontendOrigin,
};
