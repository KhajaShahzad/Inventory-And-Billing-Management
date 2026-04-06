import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SocketContext } from '../context/SocketContextValue';
import api from '../services/api';

const SUPPORTED_FORMATS = ['code_128', 'ean_13', 'qr_code'];

const MobileScanner = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') || searchParams.get('session');
  const socket = useContext(SocketContext);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const animationFrameRef = useRef(null);
  const scanLockRef = useRef(false);

  const [status, setStatus] = useState(sessionId ? 'Tap "Start Camera" to begin scanning.' : 'No session ID found in the QR code.');
  const [lastScanned, setLastScanned] = useState(null);
  const [startingCamera, setStartingCamera] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  const isSecureMobileContext = typeof window !== 'undefined' && (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  useEffect(() => {
    if (!sessionId || !socket) {
      return;
    }

    socket.emit('join_session', { sessionId, role: 'mobile' });
    setStatus('Phone connected. Tap "Start Camera" to begin scanning.');
  }, [sessionId, socket]);

  const stopDetectionLoop = useCallback(() => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(async () => {
    stopDetectionLoop();
    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    scanLockRef.current = false;
    setCameraStarted(false);
    setStatus('Camera stopped. Tap "Start Camera" to resume.');
  }, [stopDetectionLoop]);

  useEffect(() => () => {
    stopCamera().catch(() => {});
  }, [stopCamera]);

  const sendScan = async (decodedText) => {
    setLastScanned(decodedText);
    setStatus('Sending scan to desktop...');

    try {
      await api.post(`/scanner-sessions/${sessionId}/scans`, { barcode: decodedText });
      setStatus('Scan delivered. Continue scanning.');
    } catch (error) {
      console.error('Failed to send mobile scan:', error);
      setStatus(error.response?.data?.error || 'Failed to send scan. Please try again.');
    } finally {
      if (typeof window !== 'undefined' && window.navigator?.vibrate) {
        window.navigator.vibrate(180);
      }

      window.setTimeout(() => {
        setLastScanned(null);
      }, 1500);
    }
  };

  const startDetectionLoop = () => {
    const detector = detectorRef.current;
    const video = videoRef.current;
    if (!detector || !video) {
      return;
    }

    const tick = async () => {
      if (!videoRef.current || !detectorRef.current || scanLockRef.current) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      if (video.readyState >= 2) {
        try {
          const barcodes = await detector.detect(video);
          const first = barcodes?.[0]?.rawValue;
          if (first) {
            scanLockRef.current = true;
            await sendScan(first);
            window.setTimeout(() => {
              scanLockRef.current = false;
            }, 850);
          }
        } catch (error) {
          console.error('Barcode detection failed:', error);
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);
  };

  const startCamera = async () => {
    if (cameraStarted || startingCamera) {
      return;
    }

    setStartingCamera(true);
    setStatus('Requesting camera access...');

    try {
      if (!isSecureMobileContext) {
        throw new Error('INSECURE_CONTEXT');
      }
      if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
        throw new Error('BARCODE_DETECTOR_UNAVAILABLE');
      }

      detectorRef.current = new window.BarcodeDetector({ formats: SUPPORTED_FORMATS });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      });

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        throw new Error('VIDEO_ELEMENT_MISSING');
      }

      video.srcObject = stream;
      await video.play();

      setCameraStarted(true);
      setStatus('Camera started. Point it at a barcode.');
      startDetectionLoop();
    } catch (error) {
      console.error('Camera start failed:', error);
      if (error?.message === 'INSECURE_CONTEXT') {
        setStatus('Camera needs HTTPS. Open this page from the secure tunnel URL.');
      } else if (error?.message === 'BARCODE_DETECTOR_UNAVAILABLE') {
        setStatus('This browser cannot detect barcodes live here. Use Chrome on Android or send codes manually below.');
      } else {
        setStatus('Camera access failed. Allow camera permission and try again.');
      }
      await stopCamera().catch(() => {});
    } finally {
      setStartingCamera(false);
    }
  };

  const handleManualSubmit = async (event) => {
    event.preventDefault();
    const value = manualBarcode.trim();
    if (!value) {
      return;
    }
    await sendScan(value);
    setManualBarcode('');
  };

  if (!sessionId) {
    return (
      <div className="mobile-shell" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="helper-card" style={{ maxWidth: 420 }}>
          <div className="panel-title">Invalid session</div>
          <div className="panel-copy">Open the scanner from the billing screen QR code so the phone can attach to the active desktop session.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-shell">
      <div className="mobile-header">
        <div className="brand-block" style={{ padding: 0 }}>
          <div className="brand-mark" style={{ width: 38, height: 38 }}>S</div>
          <div className="brand-copy">
            <div className="brand-title">Mobile Scanner</div>
            <div className="brand-subtitle">Live checkout session</div>
          </div>
        </div>
      </div>

      <div className="mobile-container">
        <div className="status-banner">{status}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button type="button" className="btn btn-primary" onClick={startCamera} disabled={startingCamera || cameraStarted}>
            {startingCamera ? 'Starting...' : cameraStarted ? 'Camera Active' : 'Start Camera'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={stopCamera} disabled={!cameraStarted}>
            Stop Camera
          </button>
        </div>

        <form onSubmit={handleManualSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
          <input
            type="text"
            className="input-field"
            placeholder="Enter barcode manually"
            value={manualBarcode}
            onChange={(event) => setManualBarcode(event.target.value)}
          />
          <button type="submit" className="btn btn-accent">Send</button>
        </form>

        <div className="video-shell">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{
              width: '100%',
              minHeight: 360,
              objectFit: 'cover',
              display: cameraStarted ? 'block' : 'none',
              background: '#0b1020',
            }}
          />
          {!cameraStarted && (
            <div className="helper-card" style={{ margin: 18, textAlign: 'center' }}>
              Tap <strong>Start Camera</strong> to activate the live scanner.
            </div>
          )}
        </div>

        <div className="helper-card">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Reliable fallback</div>
          <div>If lighting is poor or the browser blocks live barcode detection, use manual barcode send above. The session remains active either way.</div>
        </div>

        <div style={{ minHeight: 72, display: 'grid', placeItems: 'center' }}>
          {lastScanned ? (
            <div style={{
              padding: '14px 18px',
              borderRadius: 18,
              background: 'linear-gradient(145deg, rgba(207, 139, 45, 0.2), rgba(32, 178, 154, 0.16))',
              border: '1px solid rgba(207, 139, 45, 0.2)',
              textAlign: 'center',
              width: '100%',
            }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Last transmitted</div>
              <div style={{ marginTop: 6, fontWeight: 800, fontSize: '1.1rem' }}>{lastScanned}</div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-faint)', textAlign: 'center' }}>Scanned items will appear here as they are delivered to billing.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileScanner;
