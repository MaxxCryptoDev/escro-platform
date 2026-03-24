import React, { useState } from 'react';
import axios from 'axios';
import SignatureModal from './SignatureModal';

export default function ContractModal({ contract, project, user, onClose, onSign, loading }) {
  const [activeTab, setActiveTab] = useState('preview');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signingWithSignature, setSigningWithSignature] = useState(false);
  
  if (!contract) return null;

  const isProjectContract = contract.contract_type === 'project';
  const isFinalContract = contract.contract_type === 'final';
  
  const userIsParty1 = user?.id === contract.party1_id;
  const userIsParty2 = user?.id === contract.party2_id;
  const isParty = userIsParty1 || userIsParty2;
  
  const hasSigned = (userIsParty1 && contract.party1_accepted) || (userIsParty2 && contract.party2_accepted);
  const bothSigned = contract.party1_accepted && contract.party2_accepted;
  const canSign = isParty && !hasSigned && contract.status !== 'accepted';
  
  const contractDate = contract.contract_date 
    ? new Date(contract.contract_date).toLocaleDateString('ro-RO')
    : new Date().toLocaleDateString('ro-RO');

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
      zIndex: 1000,
      padding: '1rem'
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '12px',
      maxWidth: '800px',
      width: '100%',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
    },
    header: {
      padding: '1.5rem 2rem',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexShrink: 0
    },
    title: {
      margin: 0,
      fontSize: '1.25rem',
      fontWeight: '700',
      color: '#1f2937',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    contractNumber: {
      fontSize: '0.85rem',
      color: '#6b7280',
      fontWeight: '400'
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer',
      color: '#9ca3af',
      padding: '0.25rem',
      lineHeight: 1
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.35rem 0.75rem',
      borderRadius: '20px',
      fontSize: '0.8rem',
      fontWeight: '600'
    },
    tabs: {
      display: 'flex',
      borderBottom: '1px solid #e5e7eb',
      padding: '0 2rem',
      flexShrink: 0
    },
    tab: {
      padding: '1rem 1.5rem',
      cursor: 'pointer',
      borderBottom: '2px solid transparent',
      fontSize: '0.9rem',
      fontWeight: '500',
      color: '#6b7280',
      transition: 'all 0.2s'
    },
    activeTab: {
      color: '#3b82f6',
      borderBottomColor: '#3b82f6'
    },
    content: {
      padding: '2rem',
      overflow: 'auto',
      flex: 1
    },
    docContainer: {
      backgroundColor: '#fafafa',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '2rem',
      fontFamily: "'Georgia', serif",
      fontSize: '0.95rem',
      lineHeight: '1.7',
      color: '#374151',
      whiteSpace: 'pre-wrap'
    },
    partiesSection: {
      marginBottom: '2rem',
      padding: '1.5rem',
      backgroundColor: '#f8fafc',
      borderRadius: '8px'
    },
    partyRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '1rem',
      backgroundColor: 'white',
      borderRadius: '6px',
      marginBottom: '0.75rem',
      border: '1px solid #e2e8f0'
    },
    partyLabel: {
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '0.25rem'
    },
    partyName: {
      color: '#475569',
      fontSize: '0.95rem'
    },
    signatureStatus: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.85rem',
      fontWeight: '500'
    },
    signed: {
      color: '#059669',
      backgroundColor: '#d1fae5',
      padding: '0.25rem 0.6rem',
      borderRadius: '12px'
    },
    pending: {
      color: '#d97706',
      backgroundColor: '#fef3c7',
      padding: '0.25rem 0.6rem',
      borderRadius: '12px'
    },
    footer: {
      padding: '1.5rem 2rem',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexShrink: 0,
      backgroundColor: '#f9fafb',
      borderRadius: '0 0 12px 12px'
    },
    pdfLink: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      color: '#3b82f6',
      textDecoration: 'none',
      fontSize: '0.9rem',
      fontWeight: '500'
    },
    buttonGroup: {
      display: 'flex',
      gap: '1rem'
    },
    button: {
      padding: '0.75rem 1.5rem',
      borderRadius: '8px',
      fontSize: '0.95rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: 'none'
    },
    signButton: {
      backgroundColor: '#10b981',
      color: 'white'
    },
    disabledButton: {
      backgroundColor: '#9ca3af',
      color: 'white',
      cursor: 'not-allowed'
    },
    secondaryButton: {
      backgroundColor: 'white',
      color: '#374151',
      border: '1px solid #d1d5db'
    }
  };

  const getStatusBadge = () => {
    if (bothSigned) {
      return { ...styles.statusBadge, backgroundColor: '#d1fae5', color: '#065f46' };
    }
    if (contract.status === 'accepted') {
      return { ...styles.statusBadge, backgroundColor: '#d1fae5', color: '#065f46' };
    }
    return { ...styles.statusBadge, backgroundColor: '#fef3c7', color: '#92400e' };
  };

  const getStatusText = () => {
    if (bothSigned) return '✓ Semnat de ambele părți';
    if (contract.status === 'accepted') return '✓ Activ';
    return '⏳ În așteptare';
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
              {isFinalContract ? '📋 Contract de Finalizare' : '📄 Contract de Prestări Servicii'}
              <span style={styles.contractNumber}>Nr. {contract.contract_number || 'N/A'}</span>
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={getStatusBadge()}>{getStatusText()}</div>
            <button style={styles.closeBtn} onClick={onClose}>×</button>
          </div>
        </div>

        <div style={styles.tabs}>
          <div 
            style={{ ...styles.tab, ...(activeTab === 'preview' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('preview')}
          >
            📋 Document
          </div>
          <div 
            style={{ ...styles.tab, ...(activeTab === 'signatures' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('signatures')}
          >
            ✍️ Semnături
          </div>
        </div>

        <div style={styles.content}>
          {activeTab === 'preview' ? (
            <div style={styles.docContainer}>
              {contract.terms || 'Contract text...'}
            </div>
          ) : (
            <div style={styles.partiesSection}>
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1f2937' }}>Semnături</h3>
              
              <div style={styles.partyRow}>
                <div>
                  <div style={styles.partyLabel}>👤 Prestator</div>
                  <div style={styles.partyName}>{contract.party1_company || contract.party1_name || 'N/A'}</div>
                </div>
                <div style={styles.signatureStatus}>
                  {contract.party1_accepted ? (
                    <span style={styles.signed}>✓ Semnat</span>
                  ) : (
                    <span style={styles.pending}>⏳ Nesemnat</span>
                  )}
                </div>
              </div>

              <div style={{ ...styles.partyRow, marginBottom: 0 }}>
                <div>
                  <div style={styles.partyLabel}>🏢 Beneficiar</div>
                  <div style={styles.partyName}>{contract.party2_company || contract.party2_name || 'N/A'}</div>
                </div>
                <div style={styles.signatureStatus}>
                  {contract.party2_accepted ? (
                    <span style={styles.signed}>✓ Semnat</span>
                  ) : (
                    <span style={styles.pending}>⏳ Nesemnat</span>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '6px', fontSize: '0.85rem', color: '#1e40af' }}>
                <strong>📅 Data contractului:</strong> {contractDate}
              </div>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <div>
            {contract.pdf_url && (
              <a 
                href={contract.pdf_url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={styles.pdfLink}
              >
                📥 Descarcă PDF
              </a>
            )}
          </div>
          <div style={styles.buttonGroup}>
            <button 
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={onClose}
            >
              Închide
            </button>
            {canSign && (
              <button 
                style={{ ...styles.button, ...styles.signButton }}
                onClick={() => setShowSignatureModal(true)}
                disabled={loading || signingWithSignature}
              >
                {loading || signingWithSignature ? 'Se semnează...' : '✍️ Semnează Contract'}
              </button>
            )}
            {hasSigned && !bothSigned && (
              <div style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.9rem' }}>
                ✓ Ai semnat. Așteaptă semnătura celeilalte părți.
              </div>
            )}
            {bothSigned && (
              <div style={{ padding: '0.75rem', color: '#059669', fontSize: '0.9rem', fontWeight: '600' }}>
                ✓ Contract semnat și activ!
              </div>
            )}
          </div>
        </div>
      </div>

      {showSignatureModal && (
        <SignatureModal
          initialSignature={userIsParty1 ? contract.party1_signature : contract.party2_signature}
          onSave={async (signature) => {
            setShowSignatureModal(false);
            setSigningWithSignature(true);
            try {
              await onSign(signature);
            } finally {
              setSigningWithSignature(false);
            }
          }}
          onCancel={() => setShowSignatureModal(false)}
        />
      )}
    </div>
  );
}
