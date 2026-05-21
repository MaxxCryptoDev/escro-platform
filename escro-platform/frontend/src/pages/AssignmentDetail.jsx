import React, { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { contractAPI } from '../services/api';
import ReviewModal from '../components/ReviewModal';
import ContractModal from '../components/ContractModal';
import ContractStep from '../components/ContractStep';
import ActionBanner from '../components/ActionBanner';
import { Icon, Avatar, StatusBadge, Spinner, EmptyState } from '../components/ui';
import { fmtRON, fmtDate, withAuthToken, serviceLabel } from '../utils/format';
import '../styles/AssignmentDetail.css';

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
  const [selectedContract, setSelectedContract] = useState(null);
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
      setSelectedContract(null);
      fetchContracts();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare acceptare contract.');
    }
  };

  const handleGenerateProjectContract = async () => {
    try {
      const res = await contractAPI.createProjectContract({ project_id: assignmentId });
      setSuccess(res.data?.pdf_warning ? `Contract generat. Atenție: ${res.data.pdf_warning}` : 'Contract de proiect generat!');
      fetchContracts();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la generarea contractului.');
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
  const heldAmount = Math.max(0, budget - totalReleased);
  const milestonesDone = milestones.filter(m => ['approved', 'released'].includes(m.status)).length;
  const fullyDisbursed = heldAmount <= 0 && totalReleased > 0;

  const prestatorName = assignment.expert_name || assignment.company_name_full || assignment.company_name;
  const prestatorId = assignment.expert_id || assignment.company_id;
  const parentTaskTitle = assignment.parent_task_title || assignment.task_title || 'Proiect părinte';
  const showProgress = !['pending_client_approval', 'pending_expert_approval'].includes(assignment.status);

  const tabs = [
    { id: 'details', label: 'Detalii', icon: 'folder' },
    ...(canChat ? [
      { id: 'chat', label: 'Chat', icon: 'message', count: messages.length || undefined },
      { id: 'contracts', label: 'Contracte', icon: 'file', count: contracts.length || undefined },
    ] : []),
  ];

  const openReviewModal = () => {
    const target = isBeneficiar
      ? { id: prestatorId, name: prestatorName }
      : { id: assignment.client_id, name: assignment.client_name };
    if (!target.id) return;
    setReviewableUser(target);
    setShowReviewModal(true);
  };

  return (
    <div className="escro-page fade-up">
      {/* Breadcrumb */}
      <nav className="ad-breadcrumb" aria-label="Breadcrumb">
        <button className="ad-crumb-link" onClick={() => navigate('/')}>
          <Icon name="home" size={11} /> Acasă
        </button>
        <span className="ad-crumb-sep">/</span>
        <button className="ad-crumb-link ad-crumb-parent" onClick={() => navigate(`/project/${taskId}`)}
          title="Înapoi la proiectul principal">
          <Icon name="layers" size={11} />
          <span className="ad-crumb-label">{parentTaskTitle}</span>
        </button>
        <span className="ad-crumb-sep">/</span>
        <span className="ad-crumb-current">
          <Icon name="flag" size={11} /> {assignment.title}
        </span>
      </nav>

      {/* Alerts */}
      {error && (
        <div className="ad-alert ad-alert--danger" role="alert">
          <Icon name="alert" size={14} />
          <span style={{ flex: 1 }}>{error}</span>
          <button className="ad-alert-close" onClick={() => setError('')} aria-label="Închide"><Icon name="x" size={12} /></button>
        </div>
      )}
      {success && (
        <div className="ad-alert ad-alert--success" role="status">
          <Icon name="check" size={14} />
          <span style={{ flex: 1 }}>{success}</span>
          <button className="ad-alert-close" onClick={() => setSuccess('')} aria-label="Închide"><Icon name="x" size={12} /></button>
        </div>
      )}

      {/* Action banners — above the hero so the user sees the action they must take first */}
      {isBeneficiar && assignment.status === 'pending_client_approval' && (
        <ActionBanner
          tone="warning"
          eyebrow="Acțiune necesară · tu"
          title="Acest sub-task așteaptă aprobarea ta"
          body="Adminul a configurat acest sub-task în proiectul tău. Verifică detaliile, milestone-urile și bugetul, apoi aprobă pentru a putea fi acceptat de prestator."
          primary={{ label: 'Aprobă sub-task', icon: 'check', onClick: handleApproveAssignment }}
          secondary={{ label: 'Respinge', icon: 'x', onClick: handleRejectAssignment }}
        />
      )}

      {isPrestator && assignment.status === 'pending_expert_approval' && (
        <ActionBanner
          tone="accent"
          eyebrow="Acțiune necesară · tu"
          title="Acceptă acest sub-task pentru a demara colaborarea"
          body="Clientul a aprobat sub-task-ul. Verifică detaliile, bugetul și milestone-urile, apoi acceptă pentru a debloca chat-ul și fluxul de contracte."
          primary={{ label: 'Acceptă sub-task', icon: 'check', onClick: handleExpertAccept }}
          secondary={{ label: 'Refuză', icon: 'x', onClick: handleExpertReject }}
        />
      )}

      {assignment.status === 'completed' && (isPrestator || isBeneficiar) && (
        <ActionBanner
          tone="success"
          eyebrow="Sub-task finalizat"
          title={isBeneficiar ? 'Lasă o recenzie prestatorului' : 'Lasă o recenzie clientului'}
          body="Recenziile construiesc reputația pe ESCRO și ajută colaborările viitoare. Durează doar 1 minut."
          primary={{ label: 'Lasă recenzie', icon: 'star', onClick: openReviewModal }}
        />
      )}

      {/* Hero header */}
      <section className="ad-hero">
        <div className="ad-hero-rail" aria-hidden="true" />
        <div className="ad-hero-inner">
          <div className="ad-hero-meta">
            <span className="ad-eyebrow">
              <Icon name="layers" size={10} /> SUB-ASIGNARE
            </span>
            <span className="ad-id-chip">
              <Icon name="hash" size={10} />
              {String(assignment.id || '').slice(0, 8)}
            </span>
            <span className="ad-meta-sep" />
            <span className="ad-meta-item">
              <Icon name="calendar" size={11} /> creat {fmtDate(assignment.created_at)}
            </span>
          </div>

          <h1 className="ad-title">{assignment.title}</h1>

          <div className="ad-hero-row">
            <StatusBadge status={assignment.status} />
            {assignment.service_type && (
              <span className="ad-pill">
                <Icon name="tag" size={11} /> {serviceLabel(assignment.service_type)}
              </span>
            )}
            {assignment.timeline_days && (
              <span className="ad-pill">
                <Icon name="clock" size={11} /> {assignment.timeline_days} zile
              </span>
            )}
            {budget > 0 && (
              <span className="ad-pill ad-pill--budget">
                <Icon name="wallet" size={11} /> {fmtRON(budget)}
              </span>
            )}
          </div>

          {showProgress && milestones.length > 0 && (
            <div className="ad-progress-strip">
              <div className="ad-progress-bar">
                <div className="ad-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="ad-progress-meta">
                <span><strong>{milestonesDone}</strong>/{milestones.length} milestones</span>
                <span>{progress}%</span>
                <span className="ad-progress-amt">{fmtRON(totalReleased)} / {fmtRON(budget)}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="ad-tabs-wrap">
        <div className="tabs-v3 ad-tabs">
          {tabs.map(t => (
            <div
              key={t.id}
              className={`tab-v3 ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <Icon name={t.icon} size={13} /> {t.label}
              {typeof t.count === 'number' && t.count > 0 && <span className="count">{t.count}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* DETAILS */}
      {activeTab === 'details' && (
        <div className="ad-details-grid">
          {/* Left column */}
          <div className="ad-col">
            {/* Parent task context card */}
            <button className="ad-parent-card" onClick={() => navigate(`/project/${taskId}`)} style={{ textAlign: 'left', width: '100%', border: '1px dashed var(--accent-border)', background: 'linear-gradient(135deg, var(--accent-bg), transparent 70%)' }}>
              <div className="ad-parent-card-eyebrow">
                <Icon name="layers" size={11} /> Parte din proiectul
              </div>
              <div className="ad-parent-card-title">
                {parentTaskTitle}
                <Icon name="arrow-up-right" size={13} />
              </div>
              <div className="ad-parent-card-meta">
                {assignment.client_name && (
                  <span><Icon name="user" size={10} /> {assignment.client_name}</span>
                )}
                {taskId && (
                  <span><Icon name="hash" size={10} /> {String(taskId).slice(0, 8)}</span>
                )}
              </div>
            </button>

            {/* Brief */}
            <div className="card">
              <div className="card-head">
                <div className="ad-card-title">Brief</div>
                <span className="badge no-dot"><Icon name="lock" size={10} /> Sigilat</span>
              </div>
              <div className="card-body">
                <p className="ad-quote">„{assignment.description || 'Fără descriere.'}"</p>
                <div className="ad-brief-grid">
                  <div className="ad-brief-cell">
                    <div className="h-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Serviciu</div>
                    <div className="ad-brief-val">{assignment.service_type ? serviceLabel(assignment.service_type) : '—'}</div>
                  </div>
                  <div className="ad-brief-cell">
                    <div className="h-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Termen</div>
                    <div className="ad-brief-val">{assignment.timeline_days ? `${assignment.timeline_days} zile` : '—'}</div>
                  </div>
                  <div className="ad-brief-cell">
                    <div className="h-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>Buget</div>
                    <div className="ad-brief-val" style={{ fontFamily: 'var(--f-mono)' }}>{fmtRON(budget)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Milestones — full list with action handlers (no separate tab) */}
            <div className="card">
              <div className="card-head">
                <div className="ad-card-title">Milestones · {milestonesDone}/{milestones.length} complete</div>
                <span className="section-meta">{fmtRON(totalReleased)} debursat · {fmtRON(heldAmount)} în custodie</span>
              </div>
              {!milestones.length ? (
                <EmptyState icon="flag" title="Niciun milestone" description="Acest sub-task nu are încă milestone-uri definite." />
              ) : (
                <div className="card-body">
                  <div className="tl">
                    {milestones.map((ms, i) => (
                      <MilestoneRow
                        key={ms.id}
                        ms={ms}
                        idx={i}
                        isPrestator={isPrestator}
                        isBeneficiar={isBeneficiar}
                        onDeliver={(file) => handleDeliverMilestone(ms.id, file)}
                        onApprove={() => handleApproveMilestone(ms.id)}
                        onDispute={() => handleDisputeMilestone(ms.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="ad-col ad-sidebar">
            {/* Escrow vault */}
            <div className="vault ad-vault">
              <div className="vault-content">
                <div className="h-eyebrow" style={{ marginBottom: 10 }}>
                  <Icon name={fullyDisbursed ? 'check' : 'lock'} size={11} />
                  {fullyDisbursed ? ' Debursat integral' : ' În custodie'}
                </div>
                <div className="ad-vault-num">
                  <em style={{ color: fullyDisbursed ? 'var(--success)' : 'var(--accent-hi)' }}>
                    {Math.round(heldAmount).toLocaleString('ro-RO')}
                  </em>
                </div>
                <div className="ad-vault-unit">
                  RON · {fullyDisbursed ? 'fonduri eliberate' : 'escrow activ'}
                </div>

                <div style={{ height: 1, background: 'var(--border-1)', margin: '1rem 0' }} />

                <div className="ad-vault-stats">
                  <div className="ad-vault-stat"><span>Total contract</span><span className="mono" style={{ fontFamily: 'var(--f-mono)' }}>{fmtRON(budget)}</span></div>
                  <div className="ad-vault-stat"><span>Debursat</span><span className="mono" style={{ fontFamily: 'var(--f-mono)', color: 'var(--success)' }}>{fmtRON(totalReleased)}</span></div>
                  <div className="ad-vault-stat"><span>Progres</span><span className="mono" style={{ fontFamily: 'var(--f-mono)' }}>{progress}%</span></div>
                </div>
                <div className="bar" style={{ marginTop: 14 }}>
                  <div className="bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            {/* Parties */}
            <div className="card">
              <div className="card-head">
                <div className="ad-card-title">Părți</div>
                <span className="badge badge-green no-dot"><Icon name="check" size={10} /> Verificate</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {assignment.client_name && (
                  <div className="ad-party">
                    <Avatar user={{ name: assignment.client_name, color: 'amber' }} size="md" />
                    <div className="ad-party-info">
                      <Link to={`/profile/${assignment.client_id}`} className="ad-party-name">
                        {assignment.client_name} <Icon name="arrow-up-right" size={10} />
                      </Link>
                      <div className="ad-party-role">Beneficiar · Owner proiect</div>
                    </div>
                  </div>
                )}
                {prestatorId && prestatorName ? (
                  <div className="ad-party">
                    <Avatar user={{ name: prestatorName, color: 'cyan' }} size="md" online />
                    <div className="ad-party-info">
                      <Link to={`/profile/${prestatorId}`} className="ad-party-name">
                        {prestatorName} <Icon name="arrow-up-right" size={10} />
                      </Link>
                      <div className="ad-party-role">Prestator · asignat pe sub-task</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="ad-party-empty">
                      <div className="ad-party-empty-icon"><Icon name="user" size={14} /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'var(--fg-1)', fontSize: 13 }}>În căutare prestator</div>
                        <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>Sub-task-ul nu este încă asignat.</div>
                      </div>
                    </div>
                    {isAdminUser && (() => {
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
                  </>
                )}
              </div>
            </div>

            {/* Quick actions */}
            {canChat && (
              <div className="card">
                <div className="card-head">
                  <div className="ad-card-title">Acțiuni rapide</div>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button className="ad-qa-btn" onClick={() => setActiveTab('chat')}>
                    <span className="ad-qa-left"><Icon name="message" size={13} /> Chat echipă</span>
                    <Icon name="chevron-right" size={13} />
                  </button>
                  <button className="ad-qa-btn" onClick={() => setActiveTab('contracts')}>
                    <span className="ad-qa-left"><Icon name="file" size={13} /> Contracte</span>
                    <Icon name="chevron-right" size={13} />
                  </button>
                  <button className="ad-qa-btn" onClick={() => navigate(`/project/${taskId}`)}>
                    <span className="ad-qa-left"><Icon name="layers" size={13} /> Înapoi la proiect</span>
                    <Icon name="chevron-right" size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHAT */}
      {activeTab === 'chat' && (
        <div className="card chat-wrap">
          <div className="card-head" style={{ padding: '.875rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar user={{ name: (isPrestator ? assignment.client_name : prestatorName) || '?', color: isPrestator ? 'amber' : 'cyan' }} size="sm" online />
              <div>
                <div className="ad-card-title">{(isPrestator ? assignment.client_name : prestatorName) || 'Chat echipă'}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                  <span className="pulse ok" style={{ verticalAlign: -1, marginRight: 4 }} /> sincronizat · context: {assignment.title?.slice(0, 36)}{assignment.title?.length > 36 ? '…' : ''}
                </div>
              </div>
            </div>
          </div>
          <div className="chat-msgs">
            {messages.length === 0 ? (
              <EmptyState icon="message" title="Niciun mesaj încă" description="Începe conversația — discutați briefing-ul sau întrebări specifice sub-task-ului." />
            ) : messages.map((msg, i) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={i} className={`chat-msg ${isMe ? 'me' : ''}`}>
                  {!isMe && <Avatar user={{ name: msg.sender_name || '?', color: 'cyan' }} size="sm" />}
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
            <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 0.75rem' }}>
              <Icon name="send" size={14} />
            </button>
          </form>
        </div>
      )}

      {/* CONTRACTS — step-based flow, identical to ProjectDetail */}
      {activeTab === 'contracts' && (() => {
        const isParty1 = isPrestator;
        const isParty2 = isBeneficiar;
        const pc = workflowStatus?.projectContract;
        const projectContractDone = pc?.status === 'accepted';

        return (
          <div className="col" style={{ gap: '1.5rem' }}>
            {/* ── PASUL 1: Contract de proiect ── */}
            <ContractStep
              stepNum={1}
              title="Contract de proiect"
              description="Ambele părți semnează contractul principal care definește termenii colaborării."
              status={!pc ? 'pending_action' : projectContractDone ? 'done' : 'in_progress'}
            >
              {!pc && (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: '1rem' }}>
                    Contractul principal nu a fost generat. Oricare dintre părți poate iniția procesul.
                  </p>
                  {(isParty1 || isParty2) && (
                    <button className="btn btn-primary" onClick={handleGenerateProjectContract}>
                      <Icon name="file" size={14} /> Generează contract de proiect
                    </button>
                  )}
                </div>
              )}
              {pc && pc.status !== 'accepted' && (() => {
                const myAccepted = isParty1 ? pc.party1_accepted : pc.party2_accepted;
                const otherAccepted = isParty1 ? pc.party2_accepted : pc.party1_accepted;
                return (
                  <div>
                    <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', fontSize: 13, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: pc.party1_accepted ? 'var(--success)' : 'var(--border-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {pc.party1_accepted ? <Icon name="check" size={10} style={{ color: '#fff' }} /> : null}
                        </span>
                        <span style={{ color: pc.party1_accepted ? 'var(--success)' : 'var(--fg-3)' }}>
                          Prestator {pc.party1_accepted ? 'a semnat' : 'nu a semnat'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: pc.party2_accepted ? 'var(--success)' : 'var(--border-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {pc.party2_accepted ? <Icon name="check" size={10} style={{ color: '#fff' }} /> : null}
                        </span>
                        <span style={{ color: pc.party2_accepted ? 'var(--success)' : 'var(--fg-3)' }}>
                          Beneficiar {pc.party2_accepted ? 'a semnat' : 'nu a semnat'}
                        </span>
                      </div>
                    </div>
                    {!myAccepted && (
                      <button className="btn btn-success" onClick={() => setSelectedContract(pc)}>
                        <Icon name="check" size={14} /> Semnează contractul
                      </button>
                    )}
                    {myAccepted && !otherAccepted && (
                      <div style={{ fontSize: 13, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon name="clock" size={13} /> Ai semnat — așteptăm semnătura celeilalte părți
                      </div>
                    )}
                  </div>
                );
              })()}
              {pc?.pdf_url && (
                <div style={{ marginTop: '0.75rem' }}>
                  <a href={withAuthToken(pc.pdf_url)} download="contract-proiect.pdf" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="file" size={13} /> Descarcă contract PDF
                  </a>
                </div>
              )}
              {projectContractDone && (
                <div style={{ fontSize: 13, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 8, marginTop: '0.5rem' }}>
                  <Icon name="check" size={13} /> Contractul a fost semnat de ambele părți · Nr. {pc.contract_number}
                </div>
              )}
            </ContractStep>

            {/* ── PASUL 2+: Contracte milestone ── */}
            {(workflowStatus?.milestoneContracts || []).map((mc, idx) => {
              const ms = milestones.find(m => String(m.id) === String(mc.milestone_id));
              const myAccepted = isParty1 ? mc.party1_accepted : mc.party2_accepted;
              const otherAccepted = isParty1 ? mc.party2_accepted : mc.party1_accepted;
              const accepted = mc.status === 'accepted';
              const locked = !projectContractDone;
              const status = locked ? 'locked' : accepted ? 'done' : 'in_progress';

              return (
                <ContractStep
                  key={mc.id}
                  stepNum={idx + 2}
                  title={`Contract milestone${ms ? `: ${ms.title}` : ` ${idx + 1}`}`}
                  description={ms?.amount_ron ? `${fmtRON(ms.amount_ron)} · status: ${ms.status}` : 'Anexă pe milestone'}
                  status={status}
                >
                  {locked && (
                    <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>
                      <Icon name="lock" size={12} /> Necesită semnarea contractului de proiect.
                    </div>
                  )}
                  {!locked && !accepted && (
                    <div>
                      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', fontSize: 13, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 18, height: 18, borderRadius: '50%', background: mc.party1_accepted ? 'var(--success)' : 'var(--border-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            {mc.party1_accepted ? <Icon name="check" size={10} style={{ color: '#fff' }} /> : null}
                          </span>
                          <span style={{ color: mc.party1_accepted ? 'var(--success)' : 'var(--fg-3)' }}>
                            Prestator {mc.party1_accepted ? 'a semnat' : 'nu a semnat'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 18, height: 18, borderRadius: '50%', background: mc.party2_accepted ? 'var(--success)' : 'var(--border-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            {mc.party2_accepted ? <Icon name="check" size={10} style={{ color: '#fff' }} /> : null}
                          </span>
                          <span style={{ color: mc.party2_accepted ? 'var(--success)' : 'var(--fg-3)' }}>
                            Beneficiar {mc.party2_accepted ? 'a semnat' : 'nu a semnat'}
                          </span>
                        </div>
                      </div>
                      {!myAccepted && (
                        <button className="btn btn-success" onClick={() => setSelectedContract(mc)}>
                          <Icon name="check" size={14} /> Semnează contractul
                        </button>
                      )}
                      {myAccepted && !otherAccepted && (
                        <div style={{ fontSize: 13, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Icon name="clock" size={13} /> Ai semnat — așteptăm semnătura celeilalte părți
                        </div>
                      )}
                    </div>
                  )}
                  {mc.pdf_url && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <a href={withAuthToken(mc.pdf_url)} download="contract-milestone.pdf" className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="file" size={13} /> Descarcă contract PDF
                      </a>
                    </div>
                  )}
                  {accepted && (
                    <div style={{ fontSize: 13, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 8, marginTop: '0.5rem' }}>
                      <Icon name="check" size={13} /> Contractul a fost semnat · Nr. {mc.contract_number}
                    </div>
                  )}
                </ContractStep>
              );
            })}

            {/* Fallback: when workflow has no contracts at all */}
            {!pc && (workflowStatus?.milestoneContracts || []).length === 0 && (
              <EmptyState
                icon="file"
                title="Niciun contract încă"
                description="Contractele apar aici după ce sub-task-ul este acceptat. Oricare dintre părți poate genera contractul de proiect."
              />
            )}
          </div>
        );
      })()}

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        reviewableUser={reviewableUser}
        projectTitle={assignment?.title}
        projectId={assignmentId}
        onReviewSubmitted={() => { setSuccess('Recenzie trimisă!'); setShowReviewModal(false); }}
      />

      {selectedContract && (
        <ContractModal
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
          onSign={(signature) => handleAcceptContract(selectedContract.id, signature)}
          user={user}
        />
      )}
    </div>
  );
}

function MilestoneRow({ ms, idx, isPrestator, isBeneficiar, onDeliver, onApprove, onDispute }) {
  const isDone = ['approved', 'released'].includes(ms.status);
  const isActive = ['in_progress', 'delivered', 'revision_requested'].includes(ms.status);
  const rowClass = isDone ? 'done' : isActive ? 'active' : 'pending';

  return (
    <div className={`tl-row ${rowClass}`}>
      <div className="tl-dot">{isDone ? <Icon name="check" size={11} /> : String(idx + 1).padStart(2, '0')}</div>
      <div className="ad-ms-content">
        <div className="ad-ms-main">
          <div className="ad-ms-title">{ms.title}</div>
          {ms.deliverable_description && (
            <div className="ad-ms-desc">{ms.deliverable_description}</div>
          )}
          <div className="ad-ms-meta">
            {ms.percentage_of_budget && (
              <span className="ad-ms-pct">{ms.percentage_of_budget}% din buget</span>
            )}
            <StatusBadge status={ms.status} />
            {ms.deliverable_file_url && (
              <a href={withAuthToken(ms.deliverable_file_url)} target="_blank" rel="noopener noreferrer" className="ad-ms-file">
                <Icon name="eye" size={11} /> Vezi livrabil
              </a>
            )}
          </div>
          {/* Actions — only on milestones tab (when handlers passed) */}
          {onDeliver && isPrestator && ['pending', 'in_progress', 'revision_requested'].includes(ms.status) && (
            <div className="ad-ms-actions">
              <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                <Icon name="upload" size={11} /> Livrează (selectează fișier)
                <input type="file" hidden onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onDeliver(file);
                }} />
              </label>
            </div>
          )}
          {onApprove && isBeneficiar && ms.status === 'delivered' && (
            <div className="ad-ms-actions">
              <button className="btn btn-success btn-sm" onClick={onApprove}>
                <Icon name="check" size={11} /> Aprobă & eliberează
              </button>
              <button className="btn btn-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}
                onClick={onDispute}>
                <Icon name="alert" size={11} /> Dispută
              </button>
            </div>
          )}
        </div>
        <div className="ad-ms-amt">{fmtRON(ms.amount_ron)}</div>
      </div>
    </div>
  );
}
