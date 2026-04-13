import { useState, useEffect, useRef, useContext, useEffectEvent, useCallback } from 'react';
import api from '../services/api';
import { saveBillOffline } from '../services/offlineSync';
import { SocketContext } from '../context/SocketContextValue';
import { publicAppUrl } from '../services/config';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
const formatCurrency = (value) => `Rs ${Number(value || 0).toFixed(2)}`;
const SCANNER_CLIENT_KEY_STORAGE_KEY = 'phoneScannerClientKey';
const PLACEHOLDER_HOST_PATTERNS = ['your-ibms-domain.com', 'ibms-domain.com'];

const buildReceiptFileName = (billNumber) => `ibms-bill-${billNumber}.pdf`;

const sanitizePhoneNumber = (value) => value.replace(/[^\d]/g, '');
const normalizeUrl = (value) => `${value || ''}`.trim().replace(/\/$/, '');

const isSecureScannerUrl = (value) => {
  const normalizedValue = normalizeUrl(value);
  if (!normalizedValue) {
    return false;
  }

  try {
    const parsed = new URL(normalizedValue);
    const hostname = parsed.hostname.toLowerCase();
    if (PLACEHOLDER_HOST_PATTERNS.some((pattern) => hostname.includes(pattern))) {
      return false;
    }

    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isLocalNetworkScannerUrl = (value) => {
  const normalizedValue = normalizeUrl(value);
  if (!normalizedValue) {
    return false;
  }

  try {
    const parsed = new URL(normalizedValue);
    if (PLACEHOLDER_HOST_PATTERNS.some((pattern) => parsed.hostname.toLowerCase().includes(pattern))) {
      return false;
    }

    return /^(\d{1,3}\.){3}\d{1,3}$/.test(parsed.hostname);
  } catch {
    return false;
  }
};

const createPdfBlob = (receipt) => {
  const doc = new jsPDF();
  
  // Outer Border
  doc.setLineWidth(0.5);
  doc.rect(10, 10, 190, 277); // x, y, width, height for A4 with 10mm margin
  doc.rect(11, 11, 188, 275); // Double border effect
  
  // Header Background
  doc.setFillColor(32, 178, 154); // Theme accent color
  doc.rect(12, 12, 186, 35, 'F');
  
  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('IBMS', 20, 30);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('TAX INVOICE', 160, 30);
  
  doc.setTextColor(0, 0, 0); // Reset text color

  // Setup Date and formatters
  const createdAtLabel = new Date(receipt.createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  
  // Bill Information Box
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Details:', 15, 60);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${receipt.billNumber}`, 15, 68);
  doc.text(`Date & Time: ${createdAtLabel}`, 15, 74);
  doc.text(`Payment Method: ${receipt.paymentMethod}`, 15, 80);
  
  // Customer Information Box
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 120, 60);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${receipt.customerName || 'Walk-in Customer'}`, 120, 68);
  doc.text(`Phone: ${receipt.customerPhone || 'Not provided'}`, 120, 74);
  
  // Items Table
  const tableData = receipt.items.map((item, index) => [
    index + 1,
    item.name,
    item.quantity,
    `Rs ${Number(item.price).toFixed(2)}`,
    `Rs ${Number(item.lineTotal).toFixed(2)}`
  ]);
  
  autoTable(doc, {
    startY: 90,
    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [32, 178, 154],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'left', cellWidth: 80 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'right', cellWidth: 35 }
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    alternateRowStyles: {
      fillColor: [245, 250, 249]
    },
    margin: { left: 15, right: 15 }
  });
  
  const finalY = doc.lastAutoTable.finalY || 90;
  
  // Summary Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 140, finalY + 15);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Items:`, 140, finalY + 25);
  doc.text(`${receipt.itemCount}`, 190, finalY + 25, { align: 'right' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Total Amount:', 130, finalY + 35);
  doc.text(`Rs ${Number(receipt.totalAmount).toFixed(2)}`, 190, finalY + 35, { align: 'right' });
  
  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(15, finalY + 45, 195, finalY + 45);
  
  // Footer Notes
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for shopping with IBMS!', 105, finalY + 55, { align: 'center' });
  doc.text('Please retain this invoice for your records.', 105, finalY + 61, { align: 'center' });

  // Generate output Blob
  const pdfOutput = doc.output('arraybuffer');
  return new Blob([pdfOutput], { type: 'application/pdf' });
};

const Billing = () => {
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [lastAdded, setLastAdded] = useState(null);
  const [scannerSession, setScannerSession] = useState(null);
  const [scannerStatus, setScannerStatus] = useState('Disconnected');
  const [phoneBaseUrl, setPhoneBaseUrl] = useState(() => (
    isSecureScannerUrl(publicAppUrl) || isLocalNetworkScannerUrl(publicAppUrl) ? publicAppUrl : ''
  ));
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [receiptPhoneNumber, setReceiptPhoneNumber] = useState('');
  const [shareStatus, setShareStatus] = useState('');

  const inputRef = useRef(null);
  const socket = useContext(SocketContext);
  const processedScanIdsRef = useRef(new Set());
  const pollIntervalRef = useRef(null);
  const lastScanTimestampRef = useRef(0);
  const autoBootedRef = useRef(false);
  const scannerClientKeyRef = useRef('');

  if (typeof window !== 'undefined' && !scannerClientKeyRef.current) {
    const savedClientKey = localStorage.getItem(SCANNER_CLIENT_KEY_STORAGE_KEY);
    if (savedClientKey) {
      scannerClientKeyRef.current = savedClientKey;
    } else {
      scannerClientKeyRef.current = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(SCANNER_CLIENT_KEY_STORAGE_KEY, scannerClientKeyRef.current);
    }
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);
  const normalizedPhoneBaseUrl = normalizeUrl(phoneBaseUrl);
  const phoneUrlReady = isSecureScannerUrl(normalizedPhoneBaseUrl);
  const localPhoneUrlReady = isLocalNetworkScannerUrl(normalizedPhoneBaseUrl);
  const scannerUrlReady = phoneUrlReady || localPhoneUrlReady;

  const resolveScannerOrigin = useCallback(async () => {
    const bootstrapRes = await api.get('/scanner-sessions/bootstrap');
    const secureOrigin = normalizeUrl(bootstrapRes.data?.data?.frontendOrigin);
    const localOrigin = normalizeUrl(bootstrapRes.data?.data?.localFrontendOrigin);
    const resolvedOrigin = isSecureScannerUrl(secureOrigin)
      ? secureOrigin
      : localOrigin;

    if (resolvedOrigin && (isSecureScannerUrl(resolvedOrigin) || isLocalNetworkScannerUrl(resolvedOrigin))) {
      setPhoneBaseUrl(resolvedOrigin);
      return resolvedOrigin;
    }

    return '';
  }, []);

  useEffect(() => {
    resolveScannerOrigin()
      .catch((err) => {
        console.error('Failed to resolve phone scanner URL:', err);
      });
  }, [resolveScannerOrigin]);

  const pulseAdded = useCallback((name) => {
    setLastAdded(name);
    window.setTimeout(() => setLastAdded(null), 2000);
  }, []);

  const downloadReceiptPdf = (receipt) => {
    const blob = createPdfBlob(receipt);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = buildReceiptFileName(receipt.billNumber);
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    return new File([blob], buildReceiptFileName(receipt.billNumber), { type: 'application/pdf' });
  };

  const handleWhatsAppShare = async () => {
    if (!lastReceipt) {
      return;
    }

    const pdfFile = new File([createPdfBlob(lastReceipt)], buildReceiptFileName(lastReceipt.billNumber), {
      type: 'application/pdf',
    });

    const cleanedPhone = sanitizePhoneNumber(receiptPhoneNumber);
    const message = [
      `Hello${lastReceipt.customerName && lastReceipt.customerName !== 'Walk-in Customer' ? ` ${lastReceipt.customerName}` : ''},`,
      `Your IBMS bill ${lastReceipt.billNumber} for ${formatCurrency(lastReceipt.totalAmount)} is ready.`,
    ].join(' ');

    try {
      if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
        await navigator.share({
          title: `Bill ${lastReceipt.billNumber}`,
          text: message,
          files: [pdfFile],
        });
        setShareStatus('Bill handed to your share sheet. Choose WhatsApp to send it.');
        return;
      }
    } catch (error) {
      console.error('Native share failed:', error);
    }

    downloadReceiptPdf(lastReceipt);
    const whatsappUrl = cleanedPhone
      ? `https://web.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(message)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setShareStatus('WhatsApp opened. Attach the downloaded PDF from your Downloads folder and send it.');
  };

  const buildReceiptPayload = ({ savedBill, orderItems, resolvedCustomerName, resolvedCustomerPhone, orderTotal, method }) => ({
    billId: savedBill?._id || `offline-${Date.now()}`,
    billNumber: savedBill?._id?.slice(-6)?.toUpperCase() || `${Date.now()}`.slice(-6),
    customerName: resolvedCustomerName,
    customerPhone: resolvedCustomerPhone,
    paymentMethod: method,
    totalAmount: orderTotal,
    itemCount: orderItems.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: savedBill?.createdAt || new Date().toISOString(),
    items: orderItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      lineTotal: item.quantity * item.price,
    })),
  });

  const addResolvedProductToCart = useCallback((product) => {
    if (!product) {
      return false;
    }

    if (product.quantity <= 0) {
      alert('Product is out of stock.');
      return true;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item._id === product._id);

      if (existing) {
        if (existing.cartQuantity >= product.quantity) {
          alert('No more stock available for that item.');
          return prev;
        }

        return prev.map((item) => (
          item._id === product._id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
        ));
      }

      return [...prev, { ...product, cartQuantity: 1 }];
    });

    pulseAdded(product.name);
    return true;
  }, [pulseAdded]);

  const addByBarcode = useCallback(async (barcode) => {
    try {
      const res = await api.get(`/products/${barcode}`);
      const product = res.data.data;

      if (!addResolvedProductToCart(product)) {
        alert(`Product not found for barcode: ${barcode}`);
      }

      setBarcodeInput('');
      inputRef.current?.focus();
    } catch (err) {
      alert(err.response?.data?.error || `Product not found for barcode: ${barcode}`);
    }
  }, [addResolvedProductToCart]);

  const processIncomingScan = useCallback(async (scan) => {
    if (!scan?.barcode || !scan?.id || processedScanIdsRef.current.has(scan.id)) {
      return;
    }

    processedScanIdsRef.current.add(scan.id);
    lastScanTimestampRef.current = Math.max(lastScanTimestampRef.current, scan.createdAt || Date.now());
    setScannerStatus('Receiving live scans');

    if (scan.product && addResolvedProductToCart(scan.product)) {
      return;
    }

    await addByBarcode(scan.barcode);
  }, [addByBarcode, addResolvedProductToCart]);

  const clearPolling = () => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const stopScannerSession = async () => {
    clearPolling();

    if (scannerSession?.sessionId) {
      try {
        await api.delete(`/scanner-sessions/${scannerSession.sessionId}`);
      } catch (err) {
        console.error('Failed to close scanner session:', err);
      }
    }

    setScannerSession(null);
    setScannerStatus('Disconnected');
    processedScanIdsRef.current = new Set();
    lastScanTimestampRef.current = 0;
  };

  const ensureScannerSession = useCallback(async () => {
    let resolvedPhoneBaseUrl = '';

    try {
      resolvedPhoneBaseUrl = await resolveScannerOrigin();
    } catch (err) {
      console.error('Failed to resolve phone scanner URL:', err);
      resolvedPhoneBaseUrl = normalizedPhoneBaseUrl;
    }

    if (!resolvedPhoneBaseUrl || (!isSecureScannerUrl(resolvedPhoneBaseUrl) && !isLocalNetworkScannerUrl(resolvedPhoneBaseUrl))) {
      setScannerStatus('No scanner URL available yet. Add your HTTPS URL or use the detected Wi-Fi address.');
      return null;
    }

    try {
      const res = await api.post('/scanner-sessions', {
        frontendOrigin: resolvedPhoneBaseUrl,
        clientKey: scannerClientKeyRef.current,
      });

      const session = res.data.data;
      setScannerSession(session);
      setScannerStatus(isSecureScannerUrl(resolvedPhoneBaseUrl) ? 'Waiting for phone connection' : 'Phone can connect now. Camera may still need HTTPS.');
      processedScanIdsRef.current = new Set();
      lastScanTimestampRef.current = 0;

      if (socket) {
        socket.emit('join_session', { sessionId: session.sessionId, role: 'desktop' });
      }

      const syncSessionScans = async () => {
        const scanRes = await api.get(`/scanner-sessions/${session.sessionId}`, {
          params: { since: lastScanTimestampRef.current || undefined },
        });

        const scans = scanRes.data?.data?.scans || [];
        for (const scan of scans) {
          await processIncomingScan(scan);
        }
      };

      clearPolling();
      await syncSessionScans();
      pollIntervalRef.current = window.setInterval(() => {
        syncSessionScans().catch((err) => {
          console.error('Failed to refresh scanner session:', err);
        });
      }, 500);

      return session;
    } catch (err) {
      const message = err.response?.data?.error || 'Could not start mobile scanner session';
      setScannerStatus(message);
      throw err;
    }
  }, [normalizedPhoneBaseUrl, processIncomingScan, resolveScannerOrigin, socket]);

  const toggleMobileScanner = async () => {
    if (scannerSession?.sessionId) {
      await stopScannerSession();
      return;
    }

    try {
      const session = await ensureScannerSession();
      if (!session) {
        alert('Phone access URL is still being prepared. Wait a moment and try again.');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Could not start mobile scanner session');
    }
  };

  const handleBarcodSubmit = (event) => {
    event.preventDefault();
    if (barcodeInput.trim()) {
      addByBarcode(barcodeInput.trim());
    }
  };

  const adjust = (id, delta) => {
    setCart((prev) => prev.map((item) => {
      if (item._id !== id) {
        return item;
      }

      const nextQuantity = item.cartQuantity + delta;
      if (nextQuantity < 1 || nextQuantity > item.quantity) {
        return item;
      }

      return { ...item, cartQuantity: nextQuantity };
    }));
  };

  const removeItem = (id) => setCart((prev) => prev.filter((item) => item._id !== id));
  const handleSocketScan = useEffectEvent((scan) => processIncomingScan(scan));

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleScan = (scan) => handleSocketScan(scan);
    const handlePresence = (presence) => {
      if (presence?.sessionId && presence.sessionId === scannerSession?.sessionId && presence.role === 'mobile') {
        setScannerStatus('Phone connected');
      }
    };

    socket.on('scanner_session_updated', handleScan);
    socket.on('scanned_barcode', handleScan);
    socket.on('scanner_presence', handlePresence);
    return () => {
      socket.off('scanner_session_updated', handleScan);
      socket.off('scanned_barcode', handleScan);
      socket.off('scanner_presence', handlePresence);
    };
  }, [scannerSession?.sessionId, socket]);

  useEffect(() => {
    if (autoBootedRef.current) {
      return;
    }

    autoBootedRef.current = true;
    if (typeof window === 'undefined' || !localStorage.getItem('token')) {
      return;
    }

    ensureScannerSession().catch((err) => {
      console.error('Failed to auto-start scanner session:', err);
    });
  }, [ensureScannerSession]);

  useEffect(() => () => clearPolling(), []);

  const handleCheckout = async () => {
    if (!cart.length || checkoutLoading) {
      return;
    }

    const resolvedCustomerName = customerName.trim() || 'Walk-in Customer';
    const resolvedCustomerPhone = customerPhone.trim();
    const orderItems = cart.map((item) => ({
      product: item._id,
      quantity: item.cartQuantity,
      price: item.price,
      name: item.name,
    }));

    const order = {
      customerName: resolvedCustomerName,
      customerPhone: resolvedCustomerPhone,
      paymentMethod,
      totalAmount: total,
      items: orderItems.map(({ product, quantity, price }) => ({ product, quantity, price })),
    };

    setCheckoutLoading(true);
    setShareStatus('');

    try {
      const res = await api.post('/bills', order);
      const receipt = buildReceiptPayload({
        savedBill: res.data.data,
        orderItems,
        resolvedCustomerName,
        resolvedCustomerPhone,
        orderTotal: total,
        method: paymentMethod,
      });

      setLastReceipt(receipt);
      setReceiptModalOpen(true);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
    } catch (err) {
      if (!navigator.onLine || err.message === 'Network Error') {
        await saveBillOffline(order);
        const receipt = buildReceiptPayload({
          savedBill: null,
          orderItems,
          resolvedCustomerName,
          resolvedCustomerPhone,
          orderTotal: total,
          method: paymentMethod,
        });

        setLastReceipt(receipt);
        setReceiptModalOpen(true);
        setShareStatus('Bill saved offline. You can still download the PDF now.');
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
      } else {
        alert(err.response?.data?.error || err.message);
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <>
      <section className="hero-card">
        <div className="page-header">
          <div>
            <div className="eyebrow">Checkout flow</div>
            <h1 className="page-title" style={{ marginTop: 8 }}>Fast billing, clean handoff, calmer scanner workflow.</h1>
            <p className="page-subtitle">Keep desktop checkout steady while a phone joins the session as a remote scanner. Every scan lands directly in the cart with less waiting.</p>
          </div>
        </div>
      </section>

      <section className="billing-grid">
        <div style={{ display: 'grid', gap: 20 }}>
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">Add items by barcode</div>
                <div className="panel-copy">Use a USB scanner, manual code entry, or the remote phone scanner below.</div>
              </div>
            </div>

            <form onSubmit={handleBarcodSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                ref={inputRef}
                type="text"
                className="input-field"
                placeholder="Enter a barcode and press Enter"
                value={barcodeInput}
                onChange={(event) => setBarcodeInput(event.target.value)}
                autoFocus
                style={{ flex: 1, minWidth: 240 }}
              />
              <button type="submit" className="btn btn-primary">Add item</button>
            </form>

            {lastAdded && (
              <div style={{
                marginTop: 14,
                padding: '12px 14px',
                borderRadius: 16,
                background: 'rgba(32, 178, 154, 0.14)',
                border: '1px solid rgba(32, 178, 154, 0.22)',
                color: '#8deedc',
                fontWeight: 700,
              }}
              >
                Added to bill: {lastAdded}
              </div>
            )}
          </div>

          <div className="panel scanner-card" style={{ padding: 22 }}>
            <div className="panel-header">
              <div>
                <div className="panel-title">Phone scanner session</div>
                <div className="panel-copy">Connect the phone and scan items into this bill.</div>
              </div>
              <button
                type="button"
                className={`btn ${scannerSession?.sessionId ? 'btn-danger' : 'btn-primary'}`}
                onClick={toggleMobileScanner}
              >
                {scannerSession?.sessionId ? 'Disconnect' : 'Connect phone'}
              </button>
            </div>

            {scannerSession?.sessionUrl ? (
              <div style={{ textAlign: 'center', display: 'grid', gap: 14 }}>
                <div style={{ display: 'inline-block', margin: '0 auto', padding: 12, background: '#fff', borderRadius: 20 }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(scannerSession.sessionUrl)}`}
                    alt="Phone scanner QR"
                    style={{ display: 'block', borderRadius: 12 }}
                  />
                </div>
                <div style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Scan this code on the phone, open the scanner page, and tap <strong>Start Camera</strong>.
                </div>
                <div className="badge badge-success" style={{ margin: '0 auto' }}>{scannerStatus}</div>
              </div>
            ) : (
              <div className="empty-state" style={{ minHeight: 180 }}>
                <div className="empty-state-icon">QR</div>
                <div>{scannerUrlReady ? 'Start a session to generate a phone scanner QR code.' : 'Preparing phone scanner connection...'}</div>
              </div>
            )}
          </div>
        </div>

        <div className="panel checkout-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Current bill</div>
              <div className="panel-copy">{itemCount} item{itemCount === 1 ? '' : 's'} currently in checkout.</div>
            </div>
            {cart.length > 0 && (
              <button type="button" className="btn btn-ghost" onClick={() => setCart([])}>Clear</button>
            )}
          </div>

          <div style={{ display: 'grid', gap: 12, maxHeight: 390, overflow: 'auto' }}>
            {cart.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-state-icon">Ct</div>
                <div>Scan or enter a barcode to begin the bill.</div>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item._id} className="cart-item">
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--text-faint)' }}>Rs {item.price.toFixed(2)} each</div>
                  </div>
                  <div className="quantity-controls">
                    <button type="button" className="quantity-button" onClick={() => adjust(item._id, -1)}>-</button>
                    <div className="quantity-value">{item.cartQuantity}</div>
                    <button type="button" className="quantity-button" onClick={() => adjust(item._id, 1)}>+</button>
                  </div>
                  <div style={{ fontWeight: 800, minWidth: 84, textAlign: 'right' }}>Rs {(item.price * item.cartQuantity).toFixed(2)}</div>
                  <button type="button" className="btn-icon danger" onClick={() => removeItem(item._id)}>x</button>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
              <div className="field-grid">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Customer name (optional)"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Phone number (optional)"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                {['Cash', 'Card', 'UPI'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    className={`btn ${paymentMethod === method ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setPaymentMethod(method)}
                  >
                    {method}
                  </button>
                ))}
              </div>

              <div className="cart-total">
                <div>
                  <div className="metric-label">Total payable</div>
                  <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: '0.84rem' }}>{itemCount} item{itemCount === 1 ? '' : 's'} in this bill</div>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.04em' }}>Rs {total.toFixed(2)}</div>
              </div>

              <button className="btn btn-accent" style={{ width: '100%' }} onClick={handleCheckout} disabled={checkoutLoading}>
                {checkoutLoading ? 'Generating bill...' : 'Complete payment'}
              </button>
            </div>
          )}
        </div>
      </section>

      {receiptModalOpen && lastReceipt && (
        <div className="modal-overlay" onClick={() => setReceiptModalOpen(false)}>
          <div className="modal-box" onClick={(event) => event.stopPropagation()} style={{ width: 'min(100%, 680px)' }}>
            <div className="panel-header" style={{ marginBottom: 22 }}>
              <div>
                <div className="eyebrow">Bill ready</div>
                <div className="panel-title" style={{ marginTop: 8, fontSize: '1.4rem' }}>Receipt generated for {formatCurrency(lastReceipt.totalAmount)}</div>
                <div className="panel-copy">Choose whether you want to download the PDF or hand it off through WhatsApp.</div>
              </div>
              <button type="button" className="btn-icon" onClick={() => setReceiptModalOpen(false)}>x</button>
            </div>

            <div className="field-grid" style={{ marginBottom: 18 }}>
              <div className="helper-card">
                <div className="metric-label">Bill number</div>
                <div style={{ marginTop: 8, fontSize: '1.2rem', fontWeight: 800 }}>{lastReceipt.billNumber}</div>
              </div>
              <div className="helper-card">
                <div className="metric-label">Payment method</div>
                <div style={{ marginTop: 8, fontSize: '1.2rem', fontWeight: 800 }}>{lastReceipt.paymentMethod}</div>
              </div>
            </div>

            <div className="field-grid" style={{ marginBottom: 18 }}>
              <div className="helper-card">
                <div className="metric-label">Customer</div>
                <div style={{ marginTop: 8, fontSize: '1.05rem', fontWeight: 800 }}>{lastReceipt.customerName || 'Walk-in Customer'}</div>
              </div>
              <div className="helper-card">
                <div className="metric-label">Phone</div>
                <div style={{ marginTop: 8, fontSize: '1.05rem', fontWeight: 800 }}>{lastReceipt.customerPhone || 'Not provided'}</div>
              </div>
            </div>

            <div className="helper-card" style={{ marginBottom: 18 }}>
              <div className="panel-title" style={{ fontSize: '1rem', marginBottom: 12 }}>Receipt summary</div>
              <div style={{ display: 'grid', gap: 10, maxHeight: 220, overflow: 'auto' }}>
                {lastReceipt.items.map((item) => (
                  <div key={`${item.name}-${item.quantity}-${item.price}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--text-secondary)' }}>
                    <div>{item.name} x {item.quantity}</div>
                    <div style={{ fontWeight: 700 }}>{formatCurrency(item.lineTotal)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Customer WhatsApp number</label>
              <input
                type="text"
                className="input-field"
                placeholder="Optional: 91XXXXXXXXXX"
                value={receiptPhoneNumber}
                onChange={(event) => setReceiptPhoneNumber(event.target.value)}
              />
              <div className="panel-copy" style={{ marginTop: 8 }}>
                If your browser supports file sharing, IBMS will hand the PDF to the share sheet. Otherwise it will download the PDF and open WhatsApp Web so you can attach it quickly.
              </div>
            </div>

            {shareStatus ? (
              <div className="helper-card" style={{ marginTop: 18, color: '#8deedc' }}>{shareStatus}</div>
            ) : null}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 22 }}>
              <button type="button" className="btn btn-primary" onClick={() => downloadReceiptPdf(lastReceipt)}>
                Download PDF
              </button>
              <button type="button" className="btn btn-accent" onClick={handleWhatsAppShare}>
                Send via WhatsApp
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setReceiptModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Billing;
