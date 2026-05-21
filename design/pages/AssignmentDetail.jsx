import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { contractAPI } from '../services/api';
import ReviewModal from '../components/ReviewModal';
import SignatureModal from '../components/SignatureModal';
import { Icon, Avatar, StatusBadge, Spinner, EmptyState } from '../components/ui';
import { fmtRON, fmtDate, withAuthToken } from '../utils/format';

const fmtMsgDate = (s) => {
  const d = new Date(s);
  const now = new Date();
  const time = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return time;
  if (new Date(now - 86400000).toDateString() === d.toDateString()) return `Ieri ${time}`;
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' }) + ' ' + time;
};

export default function AssignmentDetail() {
  const { taskId: taskIdParam, projectId: projectIdParam, assignmentId } = useParams();
  const taskId = taskIdParam || projectIdParam;
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [assignment, setAssignment] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingSignContract, setPendingSignContract] = useState(null);
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(authUser);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewableUser, setReviewableUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!authUser) {
      axios.get('/api/auth/me', { headers }).then(r => setUser(r.data.user)).catch(() => {});
    } else {
      setUser(authUser);
    }
  }, [authUser]);

  const fetchAssignmentDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/tasks/${taskId}/assignments/${assignmentId}`, { headers });
      setAssignment(res.data.assignment);
      setMilestones(res.data.milestones || []);
    } catch {
      setError('Nu s-au putut încărca detaliile asignării.');
    } finally {
      setLoading(false);
    }
  }, [taskId, assignmentId]);

  const fetchAllUsers = useCallback(async () => {
    if (allUsers.length > 0) return;
    try {
      const res = await axios.get('/api/users/', { headers });
      setAllUsers(res.data.users || []);
    } catch { /* silent */ }
  }, [allUsers.length]);

  // Eagerly load potential prestators when an unassigned assignment is opened
  useEffect(() => {
    if (assignment && !assignment.expert_id && !assignment.company_id) {
      fetchAllUsers();
    }
  }, [assignment, fetchAllUsers]);

  const handleAssignUser = async () => {
    if (!assignUserId) return;
    const sel = allUsers.find(u => String(u.id) === assignUserId);
    if (!sel) return;
    setAssignLoading(true);
    try {
      await axios.put(
        `/api/tasks/${taskId}/assignments/${assignmentId}/assign`,
        sel.role === 'company' ? { company_id: assignUserId } : { expert_id: assignUserId },
        { headers }
      );
      setSuccess('Prestator asignat cu succes!');
      setAssignUserId('');
      fetchAssignmentDetails();
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Eroare la asignare.');
    } finally {
      setAssignLoading(false);
    }
  };

  const fetchMessages = useCallback(async () => {
    try {
      const res = await axios.get(`/api/projects/${taskId}/messages`, { headers });
      setMessages(res.data.messages || res.data || []);
    } catch { /* silent */ }
  }, [assignmentId]);

  const fetchContracts = useCallback(async () => {
    try {
      const [cRes, wRes] = await Promise.all([
        contractAPI.getProjectContracts(assignmentId),
        contractAPI.getWorkflowStatus(assignmentId),
      ]);
      setContracts(cRes.data.contracts || []);
      setWorkflowStatus(wRes.data.workflow);
    } catch { /* silent */ }
  }, [assignmentId]);

  useEffect(() => { fetchAssignmentDetails(); fetchContracts(); }, [fetchAssignmentDetails, fetchContracts]);
  useEffect(() => { if (activeTab === 'chat') fetchMessages(); }, [activeTab]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleApproveAssignment = async () => {
    try {
      await axios.put(`/api/tasks/${taskId}/assignments/${assignmentId}/client-approve`, {}, { headers });
      setSuccess('Task aprobat! Poate începe acum.');
      fetchAssignmentDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la aprobare.');
    }
  };

  const handleRejectAssignment = async () => {
    if (!window.confirm('Ești sigur că vrei să respingi acest task?')) return;
    try {
      await axios.put(`/api/tasks/${taskId}/assignments/${assignmentId}/client-reject`, {}, { headers });
      setSuccess('Task respins.');
      fetchAssignmentDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la respingere.');
    }
  };

  const handleExpertAccept = async () => {
    try {
      await axios.put(`/api/tasks/${taskId}/assignments/${assignmentId}/expert-accept`, {}, { headers });
      setSuccess('Task acceptat! Puteți demara acum colaborarea.');
      fetchAssignmentDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la acceptare.');
    }
  };

  const handleExpertReject = async () => {
    if (!window.confirm('Ești sigur că vrei să refuzi acest task? Va fi returnat spre reasignare.')) return;
    try {
      await axios.put(`/api/tasks/${taskId}/assignments/${assignmentId}/expert-reject`, {}, { headers });
      setSuccess('Task refuzat. A fost returnat spre reasignare.');
      fetchAssignmentDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la refuz.');
    }
  };

  const handleAcceptContract = async (contractId, signature) => {
    try {
      await contractAPI.acceptContract(contractId, signature ? { signature } : {});
      setSuccess('Ai acceptat contractul!');
      fetchContracts();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare acceptare contract.');
    }
  };

  const handleDeliverMilestone = async (milestoneId, file) => {
    if (!file) { setError('Selectează un fișier pentru livrare.'); return; }
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', assignmentId);
      await axios.post(`/api/milestones/${milestoneId}/deliverable`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Livrabil înregistrat! Beneficiarul va fi notificat.');
      fetchAssignmentDetails();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Eroare la livrare milestone.');
    }
  };

  const handleApproveMilestone = async (milestoneId) => {
    if (!window.confirm('Confirmi aprobarea acestui milestone? Plata va fi eliberată automat.')) return;
    try {
      const res = await axios.put(`/api/milestones/${milestoneId}/approve`, { project_id: assignmentId }, { headers });
      const m = res.data?.milestone;
      const commissionPct = parseFloat(assignment?.commission_percent) || 10;
      const gross = parseFloat(m?.amount_ron) || 0;
      const commission = Math.round(gross * commissionPct) / 100;
      const net = Math.round(gross - commission);
      const msg = gross > 0
        ? `Milestone aprobat! ${fmtRON(net)} eliberați prestatorului (comision platformă: ${fmtRON(commission)}).`
        : 'Milestone aprobat! Plata a fost eliberată.';
      setSuccess(msg);
      fetchAssignmentDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la aprobare milestone.');
    }
  };

  const handleDisputeMilestone = async (milestoneId) => {
    const reason = window.prompt('Descrie motivul disputei:');
    if (!reason?.trim()) return;
    try {
      await axios.post(`/api/milestones/${milestoneId}/dispute`, { project_id: assignmentId, reason: reason.trim() }, { headers });
      setSuccess('Dispută deschisă. Adminul va arbitra.');
      fetchAssignmentDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la deschidere dispută.');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !assignment) return;
    const recipientId = assignment.expert_id || assignment.company_id || assignment.client_id;
    if (!recipientId) { setError('Nu există destinatar.'); return; }
    try {
      await axios.post('/api/messages', { project_id: assignmentId, content: newMessage, recipient_id: recipientId }, { headers });
      setNewMessage('');
      fetchMessages();
    } catch { setError('Eroare la trimiterea mesajului.'); }
  };

  if (loading) return (
    <div className="escro-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <Spinner />
    </div>
  );

  if (!assignment) return (
    <div className="escro-page" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <EmptyState icon="folder" title="Asignare negăsită" description="Asignarea nu a putut fi găsită." />
      <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => navigate(-1)}>← Înapoi</button>
    </div>
  );

  const isPrestator = user?.id === assignment.expert_id || user?.id === assignment.company_id;
  const isBeneficiar = user?.id === assignment.client_id || user?.id === assignment.task_client_id;
  const isAssigned = !!(assignment.expert_id || assignment.company_id);
  const isAdminUser = user?.role === 'admin';
  const canChat = isAdminUser || (isAssigned && (isPrestator || isBeneficiar) && assignment.status !== 'completed');
  const budget = parseFloat(assignment.budget_ron) || 0;
  const totalReleased = milestones.filter(m => ['released', 'approved'].includes(m.status)).reduce((s, m) => s + (parseFloat(m.amount_ron) || 0), 0);
  const progress = budget > 0 ? Math.round((totalReleased / budget) * 100) : 0;

  const tabs = [
    { id: 'details', label: 'Detalii', icon: 'folder' },
    ...(canChat ? [{ id: 'chat', label: 'Chat', icon: 'message' }, { id: 'contracts', label: 'Contracte', icon: 'file' }] : []),
  ];

  const msStatusColor = {
    pending: 'var(--fg-4)', in_progress: 'var(--accent)', delivered: 'var(--success)',
    approved: 'var(--success)', released: 'var(--violet)', disputed: 'var(--danger)',
  };

  const prestatorName = assignment.expert_name || assignment.company_name_full || assignment.company_name;
  const prestatorId = assignment.expert_id || assignment.company_id;

  return (
    <div className="escro-page fade-up">
      {/* Back */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/project/${taskId}`)}>
          <Icon name="arrow-left" size={12} /> Înapoi la Proiect
        </button>
      </div>

      {/* Header */}
      <div className="page-head" style={{ alignItems: 'flex-start', borderBottom: '1px solid var(--border-1)', paddingBottom: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ flex: 1 }}>
          <div className="h-eyebrow">
            <Icon name="hash" size={11} /> {assignment.id?.slice(0, 8)} · creat {fmtDate(assignment.created_at)}
          </div>
          <h1 className="h-title" style={{ fontSize: 34 }}>{assignment.title}</h1>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusBadge status={assignment.status} />
            {assignment.service_type && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-2)' }}>
                <Icon name="tag" size={11} /> {assignment.service_type}
              </span>
            )}
            {assignment.timeline_days && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-2)' }}>
                <Icon name="clock" size={11} /> {assignment.timeline_days} zile
              </span>
            )}
            {prestatorName && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-2)' }}>
                <Icon name="user" size={11} /> {prestatorName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ padding: '.75rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 16 }} onClick={() => setError('')}>✕</button>
        </div>
      )}
      {success && (
        <div style={{ padding: '.75rem 1rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--r-sm)', color: 'var(--success)', fontSize: 13, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {success}
          <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--success)', fontSize: 16 }} onClick={() => setSuccess('')}>✕</button>
        </div>
      )}

      {/* Approval banner — prominent, above tabs */}
      {isBeneficiar && assignment.status === 'pending_client_approval' && (
        <div className="card" style={{ borderColor: 'var(--warning-border)', background: 'var(--warning-bg)', marginBottom: '1.5rem', borderWidth: 2 }}>
          <div className="card-head">
            <div className="row" style={{ gap: '.5rem' }}>
              <Icon name="flag" size={14} style={{ color: 'var(--warning)' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Acțiune necesară</span>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg-0)', marginBottom: 6 }}>Taskul necesită aprobarea ta</div>
                <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6, marginBottom: '1rem' }}>
                  Adminul a creat acest task în proiectul tău. Verifică detaliile, milestones-urile și bugetul, apoi aprobă sau respinge.
                </div>
                <div style={{ display: 'flex', gap: '.625rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-success" style={{ fontWeight: 700 }} onClick={handleApproveAssignment}>
                    <Icon name="check" size={13} /> Aprobă task
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}
                    onClick={handleRejectAssignment}
                  >
                    ✕ Respinge
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expert acceptance banner */}
      {isPrestator && assignment.status === 'pending_expert_approval' && (
        <div className="card" style={{ borderColor: 'var(--accent)', background: 'var(--accent-lo)', marginBottom: '1.5rem', borderWidth: 2 }}>
          <div className="card-head">
            <div className="row" style={{ gap: '.5rem' }}>
              <Icon name="flag" size={14} style={{ color: 'var(--accent-hi)' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-hi)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Acțiune necesară</span>
            </div>
          </div>
          <div className="card-body">
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg-0)', marginBottom: 6 }}>Clientul a aprobat acest task — acceptă pentru a demara colaborarea</div>
            <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6, marginBottom: '1rem' }}>
              Verifică detaliile, bugetul și milestones-urile, apoi acceptă pentru a debloca chat-ul și fluxul de contracte.
            </div>
            <div style={{ display: 'flex', gap: '.625rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" style={{ fontWeight: 700 }} onClick={handleExpertAccept}>
                <Icon name="check" size={13} /> Acceptă task
              </button>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}
                onClick={handleExpertReject}
              >
                ✕ Refuză
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-v3" style={{ marginBottom: '1.5rem' }}>
        {tabs.map(t => (
          <div key={t.id} className={`tab-v3 ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            <Icon name={t.icon} size={13} /> {t.label}
          </div>
        ))}
      </div>

      {/* ——— DETAILS ——— */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Brief */}
            <div className="card">
              <div className="card-head">
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, color: 'var(--fg-0)' }}>Brief task</div>
                <span className="badge no-dot">Sigilat</span>
              </div>
              <div className="card-body">
                <p style={{ fontFamily: 'var(--f-display)', fontSize: 18, lineHeight: 1.5, color: 'var(--fg-0)', letterSpacing: '-0.01em', marginBottom: '1rem' }}>
                  „{assignment.description || 'Fără descriere.'}"
                </p>
                <div className="grid-3" style={{ marginTop: '1rem' }}>
                  <div>
                    <div className="h-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Serviciu</div>
                    <div style={{ fontSize: 13, color: 'var(--fg-0)' }}>{assignment.service_type || '—'}</div>
                  </div>
                  <div>
                    <div className="h-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Termen</div>
                    <div style={{ fontSize: 13, color: 'var(--fg-0)' }}>{assignment.timeline_days ? `${assignment.timeline_days} zile` : '—'}</div>
                  </div>
                  <div>
                    <div className="h-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Buget</div>
                    <div style={{ fontSize: 13, color: 'var(--fg-0)', fontFamily: 'var(--f-mono)' }}>{fmtRON(budget)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Milestones timeline */}
            <div className="card">
              <div className="card-head">
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, color: 'var(--fg-0)' }}>Milestones</div>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
                  {milestones.filter(m => ['approved', 'released'].includes(m.status)).length}/{milestones.length} complete
                  {totalReleased > 0 && ` · ${fmtRON(totalReleased)} debursat`}
                </span>
              </div>
              {!milestones.length ? (
                <EmptyState icon="flag" title="Niciun milestone" description="Nu sunt milestones definite pentru acest task." />
              ) : (
                <div className="card-body">
                  <div className="tl">
                    {milestones.map((ms, i) => {
                      const isDone = ['approved', 'released'].includes(ms.status);
                      const isActive = ['in_progress', 'delivered'].includes(ms.status);
                      const rowClass = isDone ? 'done' : isActive ? 'active' : 'pending';
                      return (
                        <div key={ms.id} className={`tl-row ${rowClass}`}>
                          <div className="tl-dot">
                            {isDone ? <Icon name="check" size={11} /> : i + 1}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flex: 1 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-0)', marginBottom: 4 }}>{ms.title}</div>
                              {ms.deliverable_description && (
                                <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5 }}>{ms.deliverable_description}</div>
                              )}
                              <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                {ms.percentage_of_budget && (
                                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)' }}>{ms.percentage_of_budget}% din buget</span>
                                )}
                                {(isDone || isActive) && <StatusBadge status={ms.status} />}
                                {ms.deliverable_file_url && (
                                  <a href={withAuthToken(ms.deliverable_file_url)} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: 11, color: 'var(--accent-hi)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Icon name="eye" size={11} /> Livrabil
                                  </a>
                                )}
                              </div>
                              {/* Milestone actions */}
                              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                {isPrestator && ['pending', 'in_progress', 'revision_requested'].includes(ms.status) && (
                                  <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                                    <Icon name="send" size={11} /> Livrează (selectează fișier)
                                    <input type="file" hidden onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleDeliverMilestone(ms.id, file);
                                    }} />
                                  </label>
                                )}
                                {isBeneficiar && ms.status === 'delivered' && (
                                  <>
                                    <button className="btn btn-success btn-sm" onClick={() => handleApproveMilestone(ms.id)}>
                                      <Icon name="check" size={11} /> Aprobă
                                    </button>
                                    <button className="btn btn-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}
                                      onClick={() => handleDisputeMilestone(ms.id)}>
                                      Dispută
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontFamily: 'var(--f-display)', fontSize: 16, color: 'var(--fg-0)', fontVariantNumeric: 'tabular-nums' }}>
                                {fmtRON(ms.amount_ron)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Escrow vault */}
            <div className="vault" style={{ padding: '1.5rem' }}>
              <div className="vault-content">
                {(() => {
                  const heldAmount = Math.max(0, (parseFloat(budget) || 0) - (parseFloat(totalReleased) || 0));
                  const fullyDisbursed = heldAmount <= 0 && totalReleased > 0;
                  return (
                    <>
                      <div className="h-eyebrow" style={{ marginBottom: '0.625rem' }}>
                        <Icon name={fullyDisbursed ? 'check' : 'lock'} size={11} />
                        {fullyDisbursed ? ' Debursat integral' : ' În custodie'}
                      </div>
                      <div style={{ fontFamily: 'var(--f-display)', fontSize: 48, lineHeight: 0.95, letterSpacing: '-0.04em', color: 'var(--fg-0)', fontVariantNumeric: 'tabular-nums' }}>
                        <em style={{ color: fullyDisbursed ? 'var(--success)' : 'var(--accent-hi)', fontStyle: 'italic' }}>
                          {Math.round(heldAmount).toLocaleString('ro-RO')}
                        </em>
                      </div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                        RON · {fullyDisbursed ? 'fonduri eliberate' : 'escrow activ'}
                      </div>
                    </>
                  );
                })()}
                <div style={{ height: 1, background: 'var(--border-1)', margin: '1rem 0' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--fg-3)' }}>Total contract</span>
                    <span style={{ fontFamily: 'var(--f-mono)' }}>{fmtRON(budget)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--fg-3)' }}>Debursat</span>
                    <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--success)' }}>{fmtRON(totalReleased)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--fg-3)' }}>Progres</span>
                    <span style={{ fontFamily: 'var(--f-mono)' }}>{progress}%</span>
                  </div>
                </div>
                <div className="bar" style={{ marginTop: '0.875rem' }}>
                  <div className="bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            {/* Parties */}
            <div className="card">
              <div className="card-head">
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, color: 'var(--fg-0)' }}>Părți</div>
                <span className="badge badge-green no-dot"><Icon name="check" size={10} /> Verificate</span>
              </div>
              <div className="card-body col" style={{ gap: '1rem' }}>
                {assignment.client_name && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                    <Avatar user={{ name: assignment.client_name, color: 'blue' }} size="md" />
                    <div style={{ flex: 1 }}>
                      <Link to={`/profile/${assignment.client_id}`} style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent-hi)', textDecoration: 'none' }}>
                        {assignment.client_name} →
                      </Link>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)', marginTop: 2 }}>Beneficiar</div>
                    </div>
                  </div>
                )}
                {prestatorId && prestatorName ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                    <Avatar user={{ name: prestatorName, color: 'cyan' }} size="md" online />
                    <div style={{ flex: 1 }}>
                      <Link to={`/profile/${prestatorId}`} style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent-hi)', textDecoration: 'none' }}>
                        {prestatorName} →
                      </Link>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)', marginTop: 2 }}>Prestator</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    <div style={{ padding: '.625rem .875rem', background: 'var(--warning-bg)', borderRadius: 'var(--r-sm)', fontSize: 12.5, color: 'var(--warning)' }}>
                      În căutare de prestator...
                    </div>
                    {isBeneficiar && (() => {
                      const eligibleUsers = allUsers.filter(u => String(u.id) !== String(user?.id));
                      return (
                      <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                        <select
                          className="input"
                          style={{ flex: 1, fontSize: 13, height: 34 }}
                          value={assignUserId}
                          onFocus={fetchAllUsers}
                          onChange={e => setAssignUserId(e.target.value)}
                        >
                          <option value="">
                            {allUsers.length === 0
                              ? '… se încarcă lista de prestatori'
                              : eligibleUsers.length === 0
                                ? 'Niciun prestator disponibil'
                                : '— Selectează prestator —'}
                          </option>
                          {eligibleUsers.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.name}{u.company ? ` (${u.company})` : ''} · {u.role === 'company' ? 'Companie' : 'Expert'}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={!assignUserId || assignLoading}
                          onClick={handleAssignUser}
                        >
                          {assignLoading ? '…' : 'Asignează'}
                        </button>
                      </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions */}
            {canChat && (
              <div className="card">
                <div className="card-head">
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, color: 'var(--fg-0)' }}>Acțiuni rapide</div>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button className="btn btn-secondary" style={{ justifyContent: 'space-between', width: '100%' }} onClick={() => setActiveTab('chat')}>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Icon name="message" size={13} /> Chat echipă
                    </span>
                    <Icon name="chevron-right" size={13} />
                  </button>
                  <button className="btn btn-secondary" style={{ justifyContent: 'space-between', width: '100%' }} onClick={() => setActiveTab('contracts')}>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Icon name="file" size={13} /> Contracte
                    </span>
                    <Icon name="chevron-right" size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ——— CHAT ——— */}
      {activeTab === 'chat' && (
        <div className="card chat-wrap">
          <div className="card-head">
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, color: 'var(--fg-0)' }}>Chat echipă</div>
            <span className="pulse ok" style={{ verticalAlign: '-1px' }} />
          </div>
          <div className="chat-msgs">
            {messages.length === 0 ? (
              <EmptyState icon="message" title="Niciun mesaj" description="Începe conversația!" />
            ) : messages.map((msg, i) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={i} className={`chat-msg ${isMe ? 'me' : ''}`}>
                  {!isMe && <Avatar user={{ name: msg.sender_name || '?', color: 'blue' }} size="sm" />}
                  <div>
                    <div className="chat-bubble">{msg.content}</div>
                    <div className="chat-meta">{msg.sender_name || 'Utilizator'} · {fmtMsgDate(msg.created_at)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="chat-input-row">
            <input
              className="input"
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Scrie un mesaj…"
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem' }}>
              <Icon name="send" size={14} />
            </button>
          </form>
        </div>
      )}

      {/* ——— CONTRACTS ——— */}
      {activeTab === 'contracts' && (
        <div className="col" style={{ gap: '1.5rem' }}>
          {workflowStatus && (
            <div className="card">
              <div className="card-head"><div className="card-title">Progres contract</div></div>
              <div className="card-body row" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Contract proiect', key: 'projectContract' },
                  { label: 'Contract milestone', key: 'milestoneContract' },
                  { label: 'Livrabile', key: 'deliverables' },
                ].map(step => {
                  const s = workflowStatus[step.key];
                  const done = s?.status === 'accepted' || s?.status === 'signed';
                  return (
                    <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: 13 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 99, background: done ? 'var(--success)' : 'var(--border-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        {done ? <Icon name="check" size={11} style={{ color: '#fff' }} /> : <span style={{ fontSize: 9, color: 'var(--fg-3)' }}>—</span>}
                      </span>
                      <span style={{ color: done ? 'var(--fg-0)' : 'var(--fg-3)', fontWeight: done ? 600 : 400 }}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-head"><div className="card-title">Contracte ({contracts.length})</div></div>
            {contracts.length === 0 ? (
              <EmptyState icon="file" title="Niciun contract" description="Contractele vor apărea după semnare." />
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>Tip</th><th>Status</th><th>Data</th><th>Acțiuni</th></tr>
                </thead>
                <tbody>
                  {contracts.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.contract_type || c.type || 'Contract'}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td className="muted-2" style={{ fontSize: 12 }}>{fmtDate(c.created_at)}</td>
                      <td>
                        <div className="row" style={{ gap: '.5rem' }}>
                          {c.status === 'pending' && isPrestator && (
                            <button className="btn btn-success btn-sm" onClick={() => setPendingSignContract(c)}>
                              <Icon name="check" size={11} /> Semnează
                            </button>
                          )}
                          {c.file_url && (
                            <a href={withAuthToken(c.file_url)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                              <Icon name="eye" size={12} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        reviewableUser={reviewableUser}
        projectTitle={assignment?.title}
        projectId={assignmentId}
        onReviewSubmitted={() => { setSuccess('Recenzie trimisă!'); }}
      />

      {pendingSignContract && (
        <SignatureModal
          title="✍️ Semnează contractul"
          subtitle="Desenează semnătura ta pentru a confirma acceptul contractului."
          onSave={(sig) => {
            const c = pendingSignContract;
            setPendingSignContract(null);
            handleAcceptContract(c.id, sig);
          }}
          onCancel={() => setPendingSignContract(null)}
        />
      )}
    </div>
  );
}
