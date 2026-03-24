import React, { useRef, useState, useEffect } from 'react';

export default function SignatureModal({ onSave, onCancel, initialSignature }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = initialSignature;
    }
  }, [initialSignature]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
  };

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '1rem'
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '16px',
      maxWidth: '500px',
      width: '100%',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
    },
    header: {
      padding: '1.5rem',
      borderBottom: '1px solid #e5e7eb',
      textAlign: 'center'
    },
    title: {
      margin: 0,
      fontSize: '1.25rem',
      fontWeight: '700',
      color: '#1f2937'
    },
    subtitle: {
      margin: '0.5rem 0 0 0',
      fontSize: '0.9rem',
      color: '#6b7280'
    },
    content: {
      padding: '1.5rem'
    },
    canvasContainer: {
      border: '2px dashed #d1d5db',
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: '#fafafa'
    },
    canvas: {
      width: '100%',
      height: '200px',
      cursor: 'crosshair',
      display: 'block'
    },
    hint: {
      textAlign: 'center',
      fontSize: '0.85rem',
      color: '#9ca3af',
      marginTop: '0.75rem'
    },
    footer: {
      padding: '1.5rem',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      gap: '1rem'
    },
    button: {
      padding: '0.75rem 1.5rem',
      borderRadius: '10px',
      fontSize: '0.95rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: 'none',
      flex: 1
    },
    clearBtn: {
      backgroundColor: '#f3f4f6',
      color: '#374151'
    },
    cancelBtn: {
      backgroundColor: 'white',
      color: '#6b7280',
      border: '1px solid #d1d5db'
    },
    saveBtn: {
      backgroundColor: '#10b981',
      color: 'white'
    }
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>✍️ Semnează Contract</h2>
          <p style={styles.subtitle}>Desenează semnătura ta în casuța de mai jos</p>
        </div>
        
        <div style={styles.content}>
          <div style={styles.canvasContainer}>
            <canvas
              ref={canvasRef}
              style={styles.canvas}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <p style={styles.hint}>Folosește mouse-ul sau degetul pentru a semna</p>
        </div>

        <div style={styles.footer}>
          <button 
            style={{...styles.button, ...styles.clearBtn}} 
            onClick={clearSignature}
          >
            🗑️ Șterge
          </button>
          <button 
            style={{...styles.button, ...styles.cancelBtn}} 
            onClick={onCancel}
          >
            Anulează
          </button>
          <button 
            style={{...styles.button, ...styles.saveBtn}} 
            onClick={saveSignature}
            disabled={!hasSignature}
          >
            ✓ Semnează
          </button>
        </div>
      </div>
    </div>
  );
}
