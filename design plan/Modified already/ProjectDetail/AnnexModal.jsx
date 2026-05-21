import React, { useState } from 'react';

export default function AnnexModal({ milestone, project, party1Name, party2Name, party1Company, party2Company, onClose, onSign, loading, userHasSigned, otherHasSigned, isParty, isPrestator }) {
  const [activeTab, setActiveTab] = useState('preview');
  const [pdfUrl] = useState(null);
  
  if (!milestone) return null;

  const canSign = isParty && !userHasSigned;
  const bothSigned = userHasSigned && otherHasSigned;
  
  const contractNumber = 'ESC-2026-0001';
  const contractDate = new Date().toISOString().split('T')[0];

  const annexText = `ANEXA Nr. 1

la Contractul de Prestări Servicii Nr. ${contractNumber} din ${contractDate}


Privind Etapa / Milestone: ${milestone.title}


1. Părțile contractante


Prezenta anexă se încheie între:

Prestator:
${party1Company || party1Name || 'N/A'}
CUI/ID: ${project.company_cui || project.expert_cui || 'NECOMPLETAT'}
Reprezentant: ${party1Company || party1Name || 'N/A'}


și


Beneficiar:
${party2Company || party2Name || 'NECOMPLETAT'}
CUI/ID: ${project.client_cui || 'NECOMPLETAT'}
Reprezentant: ${party2Company || party2Name || 'NECOMPLETAT'}


Această anexă face parte integrantă din Contractul menționat mai sus și se supune integral prevederilor acestuia.


2. Obiectul Etapei


Etapa ${milestone.title} are ca obiect următoarele livrabile:


${milestone.deliverable_description || milestone.description || 'N/A'}


Specificații tehnice / criterii clare de livrare:


${milestone.deliverable_description || 'Vezi descriere'}


Orice modificare a acestor livrabile necesită acord scris al ambelor părți.


3. Durata Etapei


Data începerii: ${new Date().toISOString().split('T')[0]}
Data finalizării: ${milestone.deadline || 'Conform planificării'}


Termenul poate fi prelungit doar prin acord scris, în condițiile Contractului principal.


4. Valoarea Etapei și Modalitate de Plată


Valoarea aferentă acestei etape este de:
${milestone.amount_ron} RON


Plata se va efectua conform milestone-ului.


Data: ____________`;

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
    subtitle: {
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
    signatureImg: {
      maxHeight: '40px',
      maxWidth: '150px'
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
    secondaryButton: {
      backgroundColor: 'white',
      color: '#374151',
      border: '1px solid #d1d5db'
    }
  };

  const getStatusBadge = () => {
    if (userHasSigned && otherHasSigned) {
      return { ...styles.statusBadge, backgroundColor: '#d1fae5', color: '#065f46' };
    }
    return { ...styles.statusBadge, backgroundColor: '#fef3c7', color: '#92400e' };
  };

  const getStatusText = () => {
    if (userHasSigned && otherHasSigned) return '✓ Anexă semnată de ambele părți';
    if (userHasSigned) return '⏳ Așteaptă semnătura celeilalte părți';
    return '⏳ În așteptare';
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
              📋 Anexă Milestone: {milestone.title}
              <span style={styles.subtitle}>Nr. {contractNumber}</span>
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
              {annexText}
            </div>
          ) : (
            <div style={styles.partiesSection}>
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1f2937' }}>Semnături</h3>
              
              <div style={styles.partyRow}>
                <div>
                  <div style={styles.partyLabel}>👤 Prestator</div>
                  <div style={styles.partyName}>{party1Company || party1Name || 'N/A'}</div>
                </div>
                <div style={styles.signatureStatus}>
                  {isPrestator ? (
                    userHasSigned ? (
                      <span style={styles.signed}>✓ Semnat</span>
                    ) : (
                      <span style={styles.pending}>⏳ Nesemnat</span>
                    )
                  ) : (
                    otherHasSigned ? (
                      <span style={styles.signed}>✓ Semnat</span>
                    ) : (
                      <span style={styles.pending}>⏳ Nesemnat</span>
                    )
                  )}
                </div>
              </div>

              <div style={{ ...styles.partyRow, marginBottom: 0 }}>
                <div>
                  <div style={styles.partyLabel}>🏢 Beneficiar</div>
                  <div style={styles.partyName}>{party2Company || party2Name || 'N/A'}</div>
                </div>
                <div style={styles.signatureStatus}>
                  {!isPrestator ? (
                    userHasSigned ? (
                      <span style={styles.signed}>✓ Semnat</span>
                    ) : (
                      <span style={styles.pending}>⏳ Nesemnat</span>
                    )
                  ) : (
                    otherHasSigned ? (
                      <span style={styles.signed}>✓ Semnat</span>
                    ) : (
                      <span style={styles.pending}>⏳ Nesemnat</span>
                    )
                  )}
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '6px', fontSize: '0.85rem', color: '#1e40af' }}>
                <strong>📅 Data:</strong> {contractDate}
              </div>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <div>
            <button 
              style={{ ...styles.button, backgroundColor: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              onClick={() => {
                const content = encodeURIComponent(annexText);
                const link = document.createElement('a');
                link.href = `data:text/plain;charset=utf-8,${content}`;
                link.download = `Anexa-Milestone-${milestone.title.replace(/[^a-z0-9]/gi, '-')}.txt`;
                link.click();
              }}
            >
              📥 Descarcă PDF
            </button>
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
                onClick={onSign}
                disabled={loading}
              >
                {loading ? 'Se semnează...' : '✍️ Semnează Anexă'}
              </button>
            )}
            {userHasSigned && !otherHasSigned && (
              <div style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.9rem' }}>
                ✓ Ai semnat. Așteaptă semnătura celeilalte părți.
              </div>
            )}
            {userHasSigned && otherHasSigned && (
              <div style={{ padding: '0.75rem', color: '#059669', fontSize: '0.9rem', fontWeight: '600' }}>
                ✓ Anexă semnată și activă!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
