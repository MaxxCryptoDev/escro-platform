import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { contractAPI } from '../services/api';

export default function ContractModal({ contract, project, user, onClose, onSign, loading }) {
  const userIsParty1Early = String(user?.id) === String(contract?.party1_id);
  const userIsParty2Early = String(user?.id) === String(contract?.party2_id);
  const isPartyEarly = userIsParty1Early || userIsParty2Early;
  const hasSignedEarly = (userIsParty1Early && contract?.party1_accepted) || (userIsParty2Early && contract?.party2_accepted);
  const canSignEarly = isPartyEarly && !hasSignedEarly && contract?.status !== 'accepted';

  const [showSignaturePad, setShowSignaturePad] = useState(canSignEarly);
  const [hasSignature, setHasSignature] = useState(false);
  const [signingWithSignature, setSigningWithSignature] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(contract?.pdf_url || null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const sigCanvasRef = useRef(null);
  const drawingRef = useRef(false);

  // Only fetch blob for iframe preview when user needs to sign
  useEffect(() => {
    if (!pdfUrl || !canSignEarly) { setPdfBlobUrl(null); return; }
    let revokedUrl = null;
    let cancelled = false;
    setPdfLoading(true);
    setPdfError('');
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const r = await axios.get(pdfUrl, { responseType: 'blob', headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (cancelled) return;
        const blob = new Blob([r.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        revokedUrl = url;
        setPdfBlobUrl(url);
      } catch (e) {
        if (!cancelled) {
          const status = e.response?.status;
          setPdfError(status === 401 ? 'Nu ai permisiunea să vezi acest contract.' :
            status === 404 ? 'PDF-ul nu a fost găsit. Apasă „Regenerează".' :
              'Nu am putut încărca PDF-ul contractului.');
        }
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    })();
    return () => { cancelled = true; if (revokedUrl) URL.revokeObjectURL(revokedUrl); };
  }, [pdfUrl]);

  useEffect(() => {
    if (!showSignaturePad) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth || 600;
    canvas.height = 170;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [showSignaturePad]);

  const getPos = (e) => {
    const canvas = sigCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left,
      y: (e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top,
    };
  };
  const startDrawing = (e) => {
    const ctx = sigCanvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.beginPath(); ctx.moveTo(x, y);
    drawingRef.current = true;
  };
  const draw = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = sigCanvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.lineTo(x, y); ctx.stroke();
    setHasSignature(true);
  };
  const stopDrawing = () => { drawingRef.current = false; };
  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };
  const submitSignature = async () => {
    if (!hasSignature) return;
    const dataUrl = sigCanvasRef.current.toDataURL('image/png');
    setSigningWithSignature(true);
    try {
      await onSign(dataUrl);
      setShowSignaturePad(false);
      setHasSignature(false);
    } finally {
      setSigningWithSignature(false);
    }
  };

  const handleDownload = async () => {
    if (!pdfUrl) return;
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get(pdfUrl, { responseType: 'blob', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract-${contract.contract_number || contract.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      alert('Nu s-a putut descărca PDF-ul.');
    } finally {
      setDownloading(false);
    }
  };

  const handleRegeneratePdf = async () => {
    if (!window.confirm('Regenerezi PDF-ul contractului? Se va folosi conținutul curent.')) return;
    setRegenerating(true);
    try {
      const r = await contractAPI.regeneratePdf(contract.id);
      if (r.data?.pdf_url) {
        setPdfUrl(r.data.pdf_url + (r.data.pdf_url.includes('?') ? '&' : '?') + 'v=' + Date.now());
      } else {
        alert('PDF regenerat, dar nu s-a returnat URL.');
      }
    } catch (e) {
      alert(e.response?.data?.error || 'Eroare la regenerare PDF.');
    } finally {
      setRegenerating(false);
    }
  };

  if (!contract) return null;

  const isFinalContract = contract.contract_type === 'final';
  const userIsParty1 = String(user?.id) === String(contract.party1_id);
  const userIsParty2 = String(user?.id) === String(contract.party2_id);
  const isParty = userIsParty1 || userIsParty2;
  const hasSigned = (userIsParty1 && contract.party1_accepted) || (userIsParty2 && contract.party2_accepted);
  const bothSigned = contract.party1_accepted && contract.party2_accepted;
  const canSign = isParty && !hasSigned && contract.status !== 'accepted';

  const statusLabel = bothSigned || contract.status === 'accepted'
    ? { label: 'Semnat de ambele părți', tone: 'success' }
    : hasSigned
      ? { label: 'Ai semnat — așteptăm cealaltă parte', tone: 'warning' }
      : isParty
        ? { label: 'Nesemnat — semnătura ta lipsește', tone: 'warning' }
        : { label: 'În așteptare', tone: 'warning' };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1500,
        background: 'rgba(8, 12, 20, 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--r-lg)',
          width: '100%', maxWidth: canSign ? 1000 : 600,
          maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 32px 64px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '1rem', flexShrink: 0,
          background: 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-1) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', minWidth: 0 }}>
            <div className="escro-brand-mark" style={{ width: 32, height: 32, fontSize: 14, flexShrink: 0 }}>E</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                {isFinalContract ? 'Proces-Verbal Final' : 'Contract de Prestări Servicii'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-0)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {project?.title || contract.contract_number || 'Contract'}
                {contract.contract_number && (
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--fg-3)', marginLeft: 8, fontWeight: 400 }}>
                    #{contract.contract_number}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexShrink: 0 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 100, fontSize: 11.5, fontWeight: 600,
              background: statusLabel.tone === 'success' ? 'var(--success-bg)' : 'var(--warning-bg)',
              color: statusLabel.tone === 'success' ? 'var(--success)' : 'var(--warning)',
              border: `1px solid ${statusLabel.tone === 'success' ? 'var(--success-border)' : 'var(--warning-border)'}`,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusLabel.tone === 'success' ? 'var(--success)' : 'var(--warning)' }} />
              {statusLabel.label}
            </span>
            <button onClick={onClose} aria-label="Închide" style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'transparent', border: '1px solid var(--border-2)',
              color: 'var(--fg-2)', fontSize: 18, lineHeight: 1, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>

          {canSign ? (
            /* ── Signing mode: show PDF preview + signature pad ── */
            <>
              {pdfUrl ? (
                pdfLoading ? (
                  <div style={{
                    height: '55vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)',
                    color: 'var(--fg-3)', fontSize: 13,
                  }}>
                    Se încarcă PDF-ul contractului…
                  </div>
                ) : pdfError ? (
                  <div style={{
                    padding: '2rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
                    borderRadius: 'var(--r-md)', textAlign: 'center', color: 'var(--danger)',
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>⚠️ {pdfError}</div>
                  </div>
                ) : pdfBlobUrl ? (
                  <iframe
                    src={pdfBlobUrl + '#toolbar=0&view=FitH'}
                    title="Contract PDF"
                    style={{
                      width: '100%', height: 'calc(92vh - 340px)', minHeight: 380,
                      border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', background: '#fff',
                    }}
                  />
                ) : null
              ) : (
                <div style={{
                  padding: '2rem', background: 'var(--bg-1)', border: '1px dashed var(--border-2)',
                  borderRadius: 'var(--r-md)', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13.5,
                }}>
                  PDF-ul contractului nu a fost generat încă.
                </div>
              )}

              {/* Signature pad */}
              {showSignaturePad && (
                <div style={{
                  marginTop: '1.25rem', padding: '1.25rem',
                  background: 'var(--bg-1)', border: '1px solid var(--accent-border)',
                  borderRadius: 'var(--r-md)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem', gap: '.75rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg-0)' }}>Desenează semnătura ta</div>
                      <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 2 }}>
                        Folosește mouse-ul sau degetul. Semnătura va fi atașată contractului.
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10.5, fontFamily: 'var(--f-mono)', padding: '2px 8px',
                      background: 'var(--accent-bg)', color: 'var(--accent-hi)',
                      border: '1px solid var(--accent-border)', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '.05em',
                    }}>
                      {userIsParty1 ? 'Prestator' : 'Beneficiar'}
                    </span>
                  </div>
                  <div style={{ border: '1.5px dashed var(--border-2)', borderRadius: 'var(--r-sm)', overflow: 'hidden', background: '#fff' }}>
                    <canvas
                      ref={sigCanvasRef}
                      style={{ width: '100%', height: 170, cursor: 'crosshair', display: 'block', touchAction: 'none' }}
                      onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '.5rem', marginTop: '.875rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={clearSignature}>Șterge</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { clearSignature(); setShowSignaturePad(false); }}>Anulează</button>
                    <button
                      type="button" className="btn btn-primary btn-sm"
                      onClick={submitSignature}
                      disabled={!hasSignature || signingWithSignature || loading}
                    >
                      {signingWithSignature || loading ? 'Se semnează...' : 'Confirmă semnătura'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ── View mode: info card, no preview ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <InfoRow label="Nr. contract" value={contract.contract_number || '—'} />
                <InfoRow label="Data" value={contract.contract_date ? new Date(contract.contract_date).toLocaleDateString('ro-RO') : '—'} />
                <InfoRow label="Tip" value={isFinalContract ? 'Proces-Verbal Final' : 'Contract de Prestări Servicii'} />
                <InfoRow label="Status" value={contract.status === 'accepted' ? 'Semnat' : 'În așteptare'} />
              </div>
              <div style={{ padding: '1rem', background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.625rem' }}>Semnături</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                  <SigStatus label="Prestator" signed={!!contract.party1_accepted} />
                  <SigStatus label="Beneficiar" signed={!!contract.party2_accepted} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.875rem 1.5rem',
          borderTop: '1px solid var(--border-1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '.75rem', flexShrink: 0, flexWrap: 'wrap',
          background: 'var(--bg-1)',
        }}>
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {pdfUrl && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="btn btn-ghost btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {downloading ? 'Se descarcă...' : '↓ Descarcă PDF'}
              </button>
            )}
            {!bothSigned && (
              <button onClick={handleRegeneratePdf} disabled={regenerating} className="btn btn-ghost btn-sm">
                {regenerating ? 'Se regenerează...' : 'Regenerează PDF'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            {hasSigned && !bothSigned && (
              <span style={{ fontSize: 12.5, color: 'var(--fg-2)', padding: '0 .5rem' }}>
                Ai semnat. Așteptăm cealaltă parte.
              </span>
            )}
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Închide</button>
            {canSign && !showSignaturePad && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowSignaturePad(true)}>
                ✍️ Semnează contractul
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ padding: '.75rem 1rem', background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)' }}>
      <div style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg-0)' }}>{value}</div>
    </div>
  );
}

function SigStatus({ label, signed }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        background: signed ? 'var(--success)' : 'var(--border-2)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 10, fontWeight: 700,
      }}>
        {signed ? '✓' : ''}
      </span>
      <span style={{ color: signed ? 'var(--success)' : 'var(--fg-3)' }}>
        {label} {signed ? 'a semnat' : '— nesemnat'}
      </span>
    </div>
  );
}
