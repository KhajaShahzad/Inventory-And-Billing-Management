const {
  createSession,
  getSession,
  addScan,
  closeSession,
  getPreferredFrontendOrigin,
  getLocalFrontendOrigin,
} = require('../store/scannerSessionStore');
const Product = require('../models/Product');
const { ensureScannerTunnel, getScannerTunnelUrl } = require('../services/scannerTunnelService');

const getIo = (req) => req.app.get('io');

exports.createScannerSession = async (req, res) => {
  const frontendOrigin = `${req.body?.frontendOrigin || ''}`.trim() || req.headers.origin;
  const clientKey = `${req.body?.clientKey || ''}`.trim();
  const session = createSession(frontendOrigin, clientKey, req.user.id);
  const io = getIo(req);

  io?.emit('scanner_session_created', {
    sessionId: session.sessionId,
  });

  res.status(201).json({
    success: true,
    data: session,
  });
};

exports.getScannerBootstrap = async (req, res) => {
  let frontendOrigin = getPreferredFrontendOrigin();

  if (!frontendOrigin) {
    try {
      frontendOrigin = await ensureScannerTunnel();
    } catch (error) {
      console.error('Failed to start secure scanner tunnel:', error.message);
      frontendOrigin = getScannerTunnelUrl();
    }
  }

  res.status(200).json({
    success: true,
    data: {
      frontendOrigin,
      localFrontendOrigin: getLocalFrontendOrigin(),
    },
  });
};

exports.getScannerSession = async (req, res) => {
  const session = getSession(req.params.sessionId);

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Scanner session not found',
    });
  }

  const since = Number(req.query.since || 0);
  const scans = Number.isFinite(since) && since > 0
    ? session.scans.filter((scan) => scan.createdAt > since)
    : session.scans;

  res.status(200).json({
    success: true,
    data: {
      ...session,
      scans,
    },
  });
};

exports.addScannerSessionScan = async (req, res) => {
  const barcode = `${req.body?.barcode || ''}`.trim();

  if (!barcode) {
    return res.status(400).json({
      success: false,
      error: 'Barcode is required',
    });
  }

  const result = addScan(req.params.sessionId, barcode);

  if (!result) {
    return res.status(404).json({
      success: false,
      error: 'Scanner session not found or inactive',
    });
  }

  const ownerUserId = result.session.ownerUserId;
  const product = ownerUserId
    ? await Product.findOne({ barcode, user: ownerUserId }).select('_id name barcode price quantity minStockThreshold')
    : null;
  const scanPayload = {
    ...result.scan,
    product: product || null,
  };

  const io = getIo(req);
  io?.to(`scanner_${req.params.sessionId}`).emit('scanner_session_updated', scanPayload);

  res.status(201).json({
    success: true,
    data: scanPayload,
  });
};

exports.closeScannerSession = async (req, res) => {
  const session = closeSession(req.params.sessionId);

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Scanner session not found',
    });
  }

  res.status(200).json({
    success: true,
    data: session,
  });
};
