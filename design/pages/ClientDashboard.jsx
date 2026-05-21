import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon, Avatar, StatusBadge, EmptyState, Spinner } from '../components/ui';
import { fmtRON, fmtDate, avatarColor } from '../utils/format';
import PostTaskModal from '../components/PostTaskModal';
import axios from 'axios';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [projects, setProjects] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPropuneTask, setShowPropuneTask] = useState(false);
  const [trustProfile, setTrustProfile] = useState(null);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [pendingReviews, setPendingReviews] = useState([]);

  useEffect(() => {
    setActiveTab(searchParams.get('tab') || 'overview');
  }, [searchParams]);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchProjects = useCallback(async () => {
    try {
      const requests = [
        axios.get('/api/projects', { headers }),
        axios.get('/api/activity', { headers }).catch(() => ({ data: { activity: [] } })),
      ];
      // Trust + Stripe status loaded for all non-admin roles so badges + banners work.
      if (user?.role && user.role !== 'admin') {
        requests.push(axios.get('/api/trust-profiles/my-trust-profile', { headers }).catch(() => ({ data: null })));
        requests.push(axios.get('/api/stripe/status', { headers }).catch(() => ({ data: null })));
      }
      const [projRes, actRes, trustRes, stripeRes] = await Promise.all(requests);
      setProjects(projRes.data.projects || projRes.data || []);
      setActivity(actRes.data.activity || []);
      if (trustRes) setTrustProfile(trustRes.data?.trust_profile || trustRes.data || null);
      if (stripeRes) setStripeStatus(stripeRes.data?.stripe || null);
    } catch {
      setError('Nu s-au putut încărca proiectele.');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    axios.get('/api/reviews/pending', { headers })
      .then(r => setPendingReviews(r.data.pending_reviews || []))
      .catch(() => {});
  }, []);

  // Marketplace listings: admin-approved, unassigned tasks waiting for a prestator
  const marketplaceTasks = projects.filter(p => p.is_marketplace);

  const allPmProjects = projects.filter(p =>
    !p.is_marketplace &&
    (p.is_pm_task || p.service_type === 'project_management') &&
    p.assignment_type !== 'task_assignment'
  );
  const pendingApprovals = projects.filter(p => !p.is_marketplace && p.status === 'pending_client_approval');
  const allTasks = projects.filter(p =>
    !p.is_marketplace &&
    !p.is_pm_task &&
    (p.service_type === 'direct' || p.service_type === 'matching') &&
    ['assigned', 'active', 'in_progress', 'review', 'completed'].includes(p.status)
  );
  const myProjects = projects.filter(p =>
    !p.is_marketplace &&
    (p.client_id === user?.id ||
    p.company_id === user?.id ||
    p.posted_by === user?.id ||
    p.expert_id === user?.id ||
    p.posted_by_client === user?.id) &&
    (p.assignment_type !== 'task_assignment' ||
     p.company_id === user?.id ||
     p.expert_id === user?.id ||
     p.client_id === user?.id)
  );

  const totalEscrow = myProjects.reduce((s, p) => s + (p.escrow_amount || 0), 0);
  const totalReleased = myProjects.reduce((s, p) => s + (p.released_amount || 0), 0);
  const activeCount = myProjects.filter(p => ['active', 'in_progress', 'assigned', 'review'].includes(p.status)).length;
  const reviewCount = myProjects.filter(p => p.status === 'review').length;
  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'utilizator';
  const trustLevel = trustProfile?.trust_level || 1;
  const trustScore = trustProfile?.trust_score || trustProfile?.score || 0;
  const accountVerified = !!user?.verification_date;
  const kycVerified = user?.kyc_status === 'verified';

  const tabs = [
    { id: 'overview', label: 'Acasă',              icon: 'home' },
    { id: 'lucrari',  label: 'Proiecte & Taskuri', icon: 'folder', count: projects.length || undefined },
    ...(pendingApprovals.length > 0 ? [{ id: 'approvals', label: 'De aprobat', icon: 'flag', count: pendingApprovals.length, urgent: true }] : []),
  ];

  return (
    <div className="escro-page fade-up">
      {/* URGENT BANNER — above everything, impossible to miss */}
      {pendingApprovals.length > 0 && (
        <div
          onClick={() => setActiveTab('approvals')}
          style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            background: 'linear-gradient(135deg, var(--warning-bg) 0%, var(--accent-bg) 100%)',
            border: '2px solid var(--warning)',
            borderRadius: 'var(--r-md)',
            cursor: 'pointer',
            transition: 'all .15s',
            boxShadow: '0 4px 16px rgba(245, 158, 11, .25)',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span className="pulse-dot" style={{
            width: 12, height: 12, borderRadius: '50%',
            background: 'var(--warning)',
            boxShadow: '0 0 0 0 rgba(245, 158, 11, .6)',
            animation: 'urgent-pulse 1.6s infinite',
            flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg-0)', marginBottom: 2 }}>
              {pendingApprovals.length === 1
                ? 'Un task așteaptă decizia ta urgent'
                : `${pendingApprovals.length} taskuri așteaptă decizia ta urgent`}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pendingApprovals.map(p => p.title).join(' · ')}
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); setActiveTab('approvals'); }}>
            Aprobă sau respinge →
          </button>
        </div>
      )}
      <style>{`
        @keyframes urgent-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(245, 158, 11, .65); }
          70%  { box-shadow: 0 0 0 14px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
      `}</style>

      {/* Page header */}
      <div className="page-head" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="h-eyebrow">
            <Icon name="building" size={11} /> Dashboard · Companie
          </div>
          <h1 className="h-title">
            {pendingApprovals.length > 0
              ? <>{pendingApprovals.length} {pendingApprovals.length === 1 ? 'task așteaptă' : 'taskuri așteaptă'} <em>decizia ta</em>.</>
              : reviewCount > 0
                ? <>{reviewCount} livrabile așteaptă <em>decizia ta</em>.</>
                : <>Bună, <em>{firstName}</em>.</>
            }
          </h1>
          <p className="h-sub">
            {totalEscrow > 0
              ? `${fmtRON(totalEscrow + totalReleased)} total în escrow · ${activeCount} proiecte active.`
              : `${activeCount} proiecte active în platforma ta Escro.`
            }
          </p>
        </div>
        <div className="page-actions">
          <span className={`badge ${accountVerified ? 'badge-green' : 'badge-amber'} no-dot`}>
            <Icon name={accountVerified ? 'check' : 'clock'} size={10} />
            {accountVerified ? 'Cont verificat' : 'Cont neverificat'}
          </span>
          {user?.role !== 'individual' && (
            <span className={`badge ${kycVerified ? 'badge-green' : 'badge-amber'} no-dot`}>
              <Icon name={kycVerified ? 'check' : 'alert-triangle'} size={10} />
              {kycVerified ? 'KYC verificat' : 'KYC neverificat'}
            </span>
          )}
          <button className="btn btn-secondary" onClick={() => navigate('/directory')}>
            <Icon name="users" size={14} /> Experți
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/create-project')}>
            <Icon name="plus" size={14} /> Proiect nou
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--border-1)', marginBottom: '1.5rem' }}>
        <div className="row" style={{ gap: 0 }}>
          {tabs.map(t => (
            <div
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '0.625rem 1rem', fontSize: 13, fontWeight: 500,
                color: activeTab === t.id ? 'var(--fg-0)' : 'var(--fg-2)',
                borderBottom: `2px solid ${activeTab === t.id ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                marginBottom: -1, transition: 'all .15s',
              }}
            >
              <Icon name={t.icon} size={13} />
              {t.label}
              {t.count != null && (
                <span style={{
                  fontSize: 10.5,
                  color: t.urgent ? '#fff' : 'var(--fg-3)',
                  background: t.urgent ? 'var(--warning)' : 'var(--border-1)',
                  fontWeight: t.urgent ? 700 : 500,
                  padding: '1px 6px',
                  borderRadius: t.urgent ? 9 : 3,
                  minWidth: t.urgent ? 16 : undefined,
                  textAlign: 'center',
                }}>
                  {t.count}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {loading && <Spinner />}
      {error && <div style={{ color: 'var(--danger)', padding: '1rem', textAlign: 'center' }}>{error}</div>}

      {/* ——— OVERVIEW TAB ——— */}
      {!loading && activeTab === 'overview' && (
        <>
          {/* Pending reviews banner */}
          {pendingReviews.length > 0 && (
            <div className="card" style={{ borderColor: 'var(--accent)', borderWidth: 2, marginBottom: '1.25rem', background: 'var(--accent-bg, #eff6ff)' }}>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: 22 }}>★</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--fg-0)' }}>
                        {pendingReviews.length === 1
                          ? 'Ai o recenzie de lăsat'
                          : `Ai ${pendingReviews.length} recenzii de lăsat`}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>
                        {pendingReviews.slice(0, 2).map(r => r.reviewable_user?.name).filter(Boolean).join(', ')}
                        {pendingReviews.length > 2 ? ` și încă ${pendingReviews.length - 2}` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/project/${pendingReviews[0].project_id}?tab=contracts`)}
                  >
                    Lasă recenzie →
                  </button>
                </div>
              </div>
            </div>
          )}

          <OverviewTab
            myProjects={myProjects}
            totalEscrow={totalEscrow}
            totalReleased={totalReleased}
            activeCount={activeCount}
            reviewCount={reviewCount}
            activity={activity}
            user={user}
            navigate={navigate}
            trustLevel={trustLevel}
            trustScore={trustScore}
            trustProfile={trustProfile}
            stripeStatus={stripeStatus}
            onTabChange={setActiveTab}
            onStartKyc={async () => {
              try {
                const res = await axios.post('/api/stripe/onboarding', {}, { headers });
                if (res.data.onboarding_url && !res.data.mock) {
                  window.location.assign(res.data.onboarding_url);
                  return;
                }
                navigate('/wallet');
              } catch {
                navigate('/wallet');
              }
            }}
          />
        </>
      )}

      {/* ——— LUCRARI TAB ——— */}
      {!loading && activeTab === 'lucrari' && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Proiecte & Task-uri ({projects.length})</div>
            <div className="row" style={{ gap: '.5rem' }}>
              {user?.role === 'company' && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowPropuneTask(true)}>
                  <Icon name="plus" size={12} /> Propune Task
                </button>
              )}
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/create-project')}>
                <Icon name="plus" size={12} /> Proiect nou
              </button>
            </div>
          </div>
          {projects.length === 0 ? (
            <EmptyState icon="folder" title="Niciun proiect" description="Creează primul tău proiect sau acceptă o asignare." />
          ) : (
            <table className="tbl tbl-stack">
              <thead><tr><th>Proiect / Task</th><th>Partener</th><th>Status</th><th>Buget</th><th>Progres</th><th>Deadline</th></tr></thead>
              <tbody>
                <GroupedProjectRows projects={projects} userId={user?.id} navigate={navigate} />
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ——— APPROVALS TAB ——— */}
      {!loading && activeTab === 'approvals' && (
        <div className="col" style={{ gap: '1rem' }}>
          <div className="card-head" style={{ marginBottom: '.5rem' }}>
            <div className="card-title">Taskuri de aprobat ({pendingApprovals.length})</div>
          </div>
          {pendingApprovals.length === 0 ? (
            <EmptyState icon="check" title="Totul aprobat" description="Nu există taskuri în așteptarea aprobării tale." />
          ) : (
            pendingApprovals.map(p => (
              <PendingApprovalCard
                key={p.id}
                assignment={p}
                onApprove={async () => {
                  await axios.put(`/api/tasks/${p.task_id}/assignments/${p.id}/client-approve`, {}, { headers });
                  fetchProjects();
                }}
                onReject={async () => {
                  if (!window.confirm('Respingi acest task?')) return;
                  await axios.put(`/api/tasks/${p.task_id}/assignments/${p.id}/client-reject`, {}, { headers });
                  fetchProjects();
                }}
                onOpen={() => navigate(`/project/${p.task_id}/assignment/${p.id}`)}
              />
            ))
          )}
        </div>
      )}

      {showPropuneTask && (
        <PostTaskModal
          userType={user?.role === 'company' ? 'client' : 'expert'}
          onClose={() => setShowPropuneTask(false)}
          onSubmit={() => setShowPropuneTask(false)}
        />
      )}
    </div>
  );
}

function PendingApprovalCard({ assignment, onApprove, onReject, onOpen }) {
  const [busy, setBusy] = useState(false);
  const act = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  return (
    <div className="card" style={{ borderColor: 'var(--warning-border)', borderWidth: 2 }}>
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontFamily: 'var(--f-mono)', background: 'var(--warning-bg)', color: 'var(--warning)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--warning-border)' }}>
                de aprobat
              </span>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg-0)' }}>{assignment.title}</span>
            </div>
            {assignment.description && (
              <p style={{ margin: '0 0 .75rem', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
                {assignment.description.length > 160 ? assignment.description.slice(0, 160) + '…' : assignment.description}
              </p>
            )}
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: 12, color: 'var(--fg-3)' }}>
              {assignment.budget_ron && <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 600, color: 'var(--success)' }}>{parseInt(assignment.budget_ron).toLocaleString()} RON</span>}
              {assignment.timeline_days && <span>{assignment.timeline_days} zile</span>}
              {assignment.service_type && <span>{assignment.service_type}</span>}
              {(assignment.expert_name || assignment.company_name) && (
                <span>Expert: {assignment.expert_name || assignment.company_name}</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', flexDirection: 'column', minWidth: 140 }}>
            <button
              className="btn btn-success btn-sm"
              disabled={busy}
              onClick={() => act(onApprove)}
              style={{ fontWeight: 700 }}
            >
              ✓ Aprobă
            </button>
            <button
              className="btn btn-sm"
              disabled={busy}
              onClick={() => act(onReject)}
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}
            >
              ✕ Respinge
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onOpen}>
              Detalii →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ——— Overview Tab ———
function OverviewTab({ myProjects, totalEscrow, totalReleased, activeCount, reviewCount, activity, user, navigate, trustLevel, trustScore, trustProfile, stripeStatus, onTabChange, onStartKyc }) {
  const activeProjects = myProjects.filter(p => ['active', 'in_progress', 'assigned', 'review'].includes(p.status));
  const completedCount = myProjects.filter(p => p.status === 'completed').length;
  const pendingProjects = myProjects.filter(p => p.status === 'pending_admin_approval');
  const waitingProjects = myProjects.filter(p => p.status === 'open');
  const contractSignProjects = myProjects.filter(p => parseInt(p.pending_contracts_for_me) > 0);
  // Prestator banners: user is expert_id or company_id on the project AND has milestones to deliver
  const pendingDeliveryProjects = myProjects.filter(p =>
    parseInt(p.pending_deliveries) > 0
    && (String(p.expert_id) === String(user?.id) || String(p.company_id) === String(user?.id))
  );
  // Client banners: user is client_id AND has milestones delivered awaiting approval
  const pendingApprovalProjects = myProjects.filter(p =>
    parseInt(p.pending_approvals) > 0
    && String(p.client_id) === String(user?.id)
  );
  const escrowTotal = totalEscrow + totalReleased;

  // KYC / Stripe banner — only for prestator-capable roles (expert/company).
  // Individuals are beneficiari-only, pay with card via Checkout; no Stripe Connect onboarding.
  const hasVerificationCall = !!trustProfile?.has_verification_call;
  const stripeConnected = !!stripeStatus?.onboarding_complete;
  const stripePending = stripeStatus?.account_id === 'pending_stripe_integration';
  const isIndividual = user?.role === 'individual';
  const showKycBanner = !isIndividual && user?.role && user.role !== 'admin' && !stripeConnected;
  const showIndividualWaitingAdmin = isIndividual && !user?.verification_date;

  return (
    <>
      {/* ── Individual: așteaptă aprobarea adminului ── */}
      {showIndividualWaitingAdmin && (
        <div style={{
          marginBottom: '1.25rem', padding: '1rem 1.25rem',
          background: 'var(--bg-1)', border: '1px solid var(--border-1)',
          borderRadius: 'var(--r-md)',
          display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'var(--border-2)', border: '1px solid var(--border-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="phone" size={16} style={{ color: 'var(--fg-3)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg-0)', marginBottom: 2 }}>
              Așteaptă apelul de verificare cu administratorul
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>
              După confirmarea identității, contul tău devine complet activ. Plățile se fac direct cu cardul la fiecare depunere — fără Stripe onboarding suplimentar.
            </div>
          </div>
        </div>
      )}

      {/* ── KYC banner ── */}
      {showKycBanner && (() => {
        const waitingForCall = !hasVerificationCall;
        const bg = waitingForCall || stripePending ? 'var(--bg-1)' : 'var(--warning-bg)';
        const borderColor = waitingForCall || stripePending ? 'var(--border-1)' : 'var(--warning-border)';
        const iconName = waitingForCall ? 'phone' : (stripePending ? 'clock' : 'alert-triangle');
        const iconColor = waitingForCall || stripePending ? 'var(--fg-3)' : 'var(--warning)';
        const title = waitingForCall
          ? 'Așteaptă apelul de verificare cu administratorul'
          : (stripePending ? 'Verificare KYC — în curs' : 'Verifică-ți identitatea (KYC)');
        const isPrestator = user?.role === 'company' || user?.role === 'expert';
        const description = waitingForCall
          ? 'După apelul de verificare cu adminul, poți începe verificarea KYC: identitate, document, IBAN.'
          : (stripePending
            ? 'Verificarea ta este în procesare la Stripe. Vei fi notificat când e completă.'
            : (isPrestator
              ? 'Pornește verificarea KYC prin Stripe (identitate + IBAN) pentru a fi asignat și a primi plăți.'
              : 'Pornește verificarea KYC prin Stripe (identitate + IBAN) pentru a posta task-uri și plăți.'));
        return (
          <div style={{
            marginBottom: '1.25rem', padding: '1rem 1.25rem',
            background: bg, border: `1px solid ${borderColor}`,
            borderRadius: 'var(--r-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: waitingForCall || stripePending ? 'var(--border-2)' : '#f59e0b22',
                border: `1px solid ${borderColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={iconName} size={16} style={{ color: iconColor }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg-0)', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>{description}</div>
              </div>
            </div>
            {hasVerificationCall && !stripePending && (
              <button
                className="btn btn-sm"
                style={{ whiteSpace: 'nowrap', gap: 6, background: 'var(--warning)', color: '#fff', border: 'none', flexShrink: 0 }}
                onClick={onStartKyc}
              >
                <Icon name="shield" size={13} /> Începe verificarea KYC
              </button>
            )}
          </div>
        );
      })()}

      {/* ── Alert: livrabile de trimis (prestator) ── */}
      {pendingDeliveryProjects.length > 0 && (
        <div style={{
          marginBottom: '1rem', padding: '0.875rem 1rem',
          background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
          borderRadius: 'var(--r-md)', display: 'flex', gap: '0.875rem', alignItems: 'flex-start',
        }}>
          <Icon name="upload" size={16} style={{ color: 'var(--accent-hi)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-hi)', marginBottom: '0.375rem' }}>
              {pendingDeliveryProjects.length === 1
                ? 'Ai un milestone de livrat'
                : `Ai milestone-uri de livrat în ${pendingDeliveryProjects.length} proiecte`}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {pendingDeliveryProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/project/${p.id}?tab=milestones`)}
                  style={{
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: 'var(--accent-hi)', color: '#fff',
                    border: 'none', borderRadius: 'var(--r-sm)', padding: '3px 10px',
                  }}
                >
                  {p.title} →
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Alert: aprobări de făcut (beneficiar) ── */}
      {pendingApprovalProjects.length > 0 && (
        <div style={{
          marginBottom: '1rem', padding: '0.875rem 1rem',
          background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
          borderRadius: 'var(--r-md)', display: 'flex', gap: '0.875rem', alignItems: 'flex-start',
        }}>
          <Icon name="check" size={16} style={{ color: 'var(--accent-hi)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-hi)', marginBottom: '0.375rem' }}>
              {pendingApprovalProjects.length === 1
                ? 'Ai un livrabil de aprobat'
                : `Ai livrabile de aprobat în ${pendingApprovalProjects.length} proiecte`}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {pendingApprovalProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/project/${p.id}?tab=milestones`)}
                  style={{
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: 'var(--accent-hi)', color: '#fff',
                    border: 'none', borderRadius: 'var(--r-sm)', padding: '3px 10px',
                  }}
                >
                  {p.title} →
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Alert: contracte de semnat ── */}
      {contractSignProjects.length > 0 && (
        <div style={{
          marginBottom: '1.25rem', padding: '0.875rem 1rem',
          background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
          borderRadius: 'var(--r-md)', display: 'flex', gap: '0.875rem', alignItems: 'flex-start',
        }}>
          <Icon name="alert-triangle" size={16} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--warning)', marginBottom: '0.375rem' }}>
              {contractSignProjects.length === 1
                ? 'Ai un contract de semnat'
                : `Ai ${contractSignProjects.length} contracte de semnat`}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {contractSignProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/project/${p.id}?tab=contracts`)}
                  style={{
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: 'var(--warning)', color: '#fff',
                    border: 'none', borderRadius: 'var(--r-sm)', padding: '3px 10px',
                  }}
                >
                  {p.title} →
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Vault hero */}
      <div className="vault" style={{ marginBottom: '2rem' }}>
        <div className="vault-content" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem', alignItems: 'center' }}>
          <div>
            <div className="h-eyebrow" style={{ marginBottom: '1rem' }}>
              <Icon name="lock" size={11} /> Escrow vault · În custodie
            </div>
            <div className="vault-num">
              <em>{Math.round(escrowTotal).toLocaleString('ro-RO')}</em>
              <span className="vault-cur">RON</span>
            </div>
            <p style={{ marginTop: '1rem', maxWidth: '46ch', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55 }}>
              Fonduri blocate în escrow și debursate exclusiv la confirmarea milestone-urilor.
            </p>
            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <div className="h-eyebrow" style={{ marginBottom: '.25rem', fontSize: 9 }}>În escrow</div>
                <div style={{ fontSize: 16, color: 'var(--fg-0)', fontFamily: 'var(--f-mono)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtRON(totalEscrow)}
                </div>
              </div>
              <div className="v-divider" />
              <div>
                <div className="h-eyebrow" style={{ marginBottom: '.25rem', fontSize: 9 }}>Debursat</div>
                <div style={{ fontSize: 16, color: 'var(--success)', fontFamily: 'var(--f-mono)', fontVariantNumeric: 'tabular-nums' }}>
                  + {fmtRON(totalReleased)}
                </div>
              </div>
              <div className="v-divider" />
              <div>
                <div className="h-eyebrow" style={{ marginBottom: '.25rem', fontSize: 9 }}>Disputat</div>
                <div style={{ fontSize: 16, color: 'var(--fg-1)', fontFamily: 'var(--f-mono)' }}>
                  0 RON
                </div>
              </div>
            </div>
            {user?.role === 'company' && (
              <div style={{ marginTop: '1.25rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/wallet')} style={{ gap: 6 }}>
                  <Icon name="credit-card" size={12} /> Portofel & retrageri
                </button>
              </div>
            )}
          </div>
          <div>
            <div className="h-eyebrow" style={{ marginBottom: '.75rem' }}>Distribuție pe stadiu</div>
            <div className="bar-stack" style={{ marginBottom: '0.875rem' }}>
              {activeCount > 0 && (
                <div style={{ flex: activeCount, background: 'var(--accent)' }} />
              )}
              {reviewCount > 0 && (
                <div style={{ flex: reviewCount, background: 'var(--warning)' }} />
              )}
              {completedCount > 0 && (
                <div style={{ flex: completedCount, background: 'var(--success)' }} />
              )}
              {(activeCount + reviewCount + completedCount) === 0 && (
                <div style={{ flex: 1, background: 'var(--border-2)' }} />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, color: 'var(--fg-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: 2, flexShrink: 0 }} />
                  În progres
                </span>
                <span style={{ fontFamily: 'var(--f-mono)', fontVariantNumeric: 'tabular-nums' }}>{activeCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, background: 'var(--warning)', borderRadius: 2, flexShrink: 0 }} />
                  Review
                </span>
                <span style={{ fontFamily: 'var(--f-mono)', fontVariantNumeric: 'tabular-nums' }}>{reviewCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, background: 'var(--success)', borderRadius: 2, flexShrink: 0 }} />
                  Finalizate
                </span>
                <span style={{ fontFamily: 'var(--f-mono)', fontVariantNumeric: 'tabular-nums' }}>{completedCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid-4 */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <StatCard label="Proiecte active" value={activeCount} icon="folder" delta={null} sublabel="workspace" />
        <StatCard label="Livrabile review" value={reviewCount} icon="paper" sublabel="acțiune necesară" delta={reviewCount > 0 ? 'Urgent' : null} deltaDir="down" />
        <StatCard label="Total proiecte" value={myProjects.length} icon="briefcase" sublabel="toate stadiile" />
        {user?.role === 'company' && trustLevel != null
          ? <StatCard label="Trust Level" value={`L${trustLevel}`} icon="shield" sublabel={`${trustScore} pts`} isText />
          : <StatCard label="Eliberat experților" value={fmtRON(totalReleased)} icon="trending-up" sublabel="din escrow" isText />
        }
      </div>

      {/* 2-col: projects + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left col */}
        <div>
          <div className="section-h">
            <h2 className="s-title">Proiecte <em>recente</em></h2>
            <span className="section-meta">{activeProjects.length} active</span>
          </div>

          {pendingProjects.length > 0 && (
            <PipelineStrip
              icon="clock"
              color="var(--fg-3)"
              borderColor="var(--border-1)"
              label="Fără task configurat"
              description="Proiectele se află la admin pentru configurarea taskului și comisionului."
              projects={pendingProjects}
              navigate={navigate}
            />
          )}

          {waitingProjects.length > 0 && (
            <PipelineStrip
              icon="user-plus"
              color="var(--warning)"
              borderColor="var(--warning-border)"
              label="Așteptare prestator"
              description="Taskul a fost configurat. Așteptăm asignarea unui expert sau companii."
              projects={waitingProjects}
              navigate={navigate}
            />
          )}

          {activeProjects.length === 0 ? (
            <EmptyState icon="folder" title="Niciun proiect activ" description="Creează primul tău proiect pentru a începe." />
          ) : (
            <div className="grid-2">
              {activeProjects.slice(0, 4).map(p => (
                <ProjectCard key={p.id} p={p} userId={user?.id} onClick={() => navigate(`/project/${p.id}`)} />
              ))}
            </div>
          )}

          {activeProjects.length > 4 && (
            <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => onTabChange('lucrari')}>
                Vezi toate {activeProjects.length} proiecte <Icon name="arrow-right" size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Right col — activity */}
        <div>
          <div className="section-h">
            <h2 className="s-title">Activitate <em>live</em></h2>
            <span className="section-meta">
              <span className="pulse ok" style={{ verticalAlign: '-1px', marginRight: 6 }} />
              sincronizat
            </span>
          </div>
          <ActivityPanel activity={activity} navigate={navigate} />

          {/* Tip card */}
          {reviewCount > 0 && (
            <div className="card" style={{ marginTop: '1rem', padding: '1.25rem', background: 'linear-gradient(180deg, var(--bg-2), var(--bg-1))' }}>
              <div className="h-eyebrow"><Icon name="flag" size={11} /> Acțiune necesară</div>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, lineHeight: 1.3, color: 'var(--fg-0)', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
                Ai <em style={{ color: 'var(--warning)', fontStyle: 'italic' }}>{reviewCount}</em> livrabil{reviewCount > 1 ? 'e' : ''} de aprobat.
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--fg-2)', marginBottom: '0.875rem' }}>
                Revizuiește și aprobă livrabilele pentru a debloca plata către expert.
              </p>
              <button className="btn btn-secondary btn-sm" onClick={() => onTabChange('approvals')}>
                Verifică livrabilele <Icon name="arrow-right" size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ——— Stat Card (new design) ———
function StatCard({ label, value, icon, delta, deltaDir, sublabel, isText }) {
  return (
    <div className="stat">
      <div className="stat-h">
        <div className="stat-l">{label}</div>
        <div className="stat-i"><Icon name={icon} size={13} /></div>
      </div>
      {isText ? (
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 18, fontVariantNumeric: 'tabular-nums', color: 'var(--fg-0)', margin: '0.25rem 0 0.5rem' }}>
          {value}
        </div>
      ) : (
        <div className="stat-v"><em>{value}</em></div>
      )}
      <div className="stat-f">
        {delta && (
          <span className={`stat-delta ${deltaDir === 'down' ? 'down' : ''}`}>
            <Icon name={deltaDir === 'down' ? 'arrow-down' : 'arrow-up'} size={10} /> {delta}
          </span>
        )}
        {sublabel && <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{sublabel}</span>}
      </div>
    </div>
  );
}

// ——— Project Card (new .proj design) ———
function ProjectCard({ p, userId, onClick }) {
  const budget = p.budget_ron || p.budget || 0;
  const progress = p.progress || 0;
  const isCreator = String(p.client_id) === String(userId) || String(p.company_id) === String(userId);
  const partnerName = isCreator
    ? (p.expert_name || p.company_name || p.assigned_expert_name || null)
    : (p.client_name || null);

  const needsSign = parseInt(p.pending_contracts_for_me) > 0;
  const needsApprove = parseInt(p.pending_approvals) > 0;

  return (
    <div className="proj" onClick={onClick} style={{ position: 'relative' }}>
      {(needsSign || needsApprove) && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {needsSign && (
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
              background: 'var(--warning-bg)', color: 'var(--warning)',
              border: '1px solid var(--warning-border)', letterSpacing: '.02em',
            }}>✍ Semnează contract</span>
          )}
          {needsApprove && (
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
              background: 'var(--success-bg)', color: 'var(--success)',
              border: '1px solid var(--success-border)', letterSpacing: '.02em',
            }}>✓ Aprobă milestone</span>
          )}
        </div>
      )}
      <div className="proj-h">
        <div>
          <div className="proj-id">{p.id ? `ESC-${String(p.id).padStart(4,'0')}` : '—'}</div>
          <div className="proj-t">{p.title}</div>
        </div>
        <StatusBadge status={p.status} />
      </div>
      <div className="proj-d">{p.description || p.brief || 'Proiect în desfășurare.'}</div>
      {p.service_type && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: '0.875rem' }}>
          <span className="tag">{p.service_type}</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--fg-2)' }}>
          {partnerName ? (
            <>
              <Avatar user={{ name: partnerName, color: avatarColor('expert') }} size="sm" />
              <span>{partnerName}</span>
            </>
          ) : (
            <span style={{ color: 'var(--fg-3)' }}>
              <Icon name="search" size={12} style={{ verticalAlign: '-2px' }} /> Fără partener
            </span>
          )}
        </div>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)' }}>{progress}%</span>
      </div>
      <div className="bar"><div className="bar-fill" style={{ width: `${progress}%` }} /></div>
      <div className="proj-foot">
        <div>
          <div className="proj-amt">
            <em>{Math.round(budget).toLocaleString('ro-RO')}</em>
            <span className="proj-cur">RON</span>
          </div>
        </div>
        {p.milestones_done != null && p.milestones_total != null && (
          <span style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)' }}>
            {p.milestones_done}/{p.milestones_total} ms
          </span>
        )}
      </div>
    </div>
  );
}

// ——— Activity Panel ———
const EVENT_META = {
  milestone_delivered: { icon: 'upload',        color: 'var(--accent)',  bg: 'var(--accent-bg)',  label: 'a livrat milestone-ul' },
  milestone_approved:  { icon: 'check',          color: 'var(--success)', bg: 'var(--success-bg)', label: 'a aprobat milestone-ul' },
  funds_released:      { icon: 'trending-up',    color: 'var(--success)', bg: 'var(--success-bg)', label: 'a eliberat fondurile' },
  escrow_deposit:      { icon: 'lock',           color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'a depus fonduri în escrow' },
  project_completed:   { icon: 'flag',           color: 'var(--accent)',  bg: 'var(--accent-bg)',  label: 'a finalizat proiectul' },
  message_sent:        { icon: 'message-circle', color: 'var(--fg-2)',    bg: 'var(--border-1)',   label: 'a trimis un mesaj pe' },
  project_created:     { icon: 'plus',           color: 'var(--fg-2)',    bg: 'var(--border-1)',   label: 'Proiect nou creat:' },
  expert_assigned:     { icon: 'user-check',     color: 'var(--accent)',  bg: 'var(--accent-bg)',  label: 'te-a asignat pe' },
  company_assigned:    { icon: 'building',       color: 'var(--accent)',  bg: 'var(--accent-bg)',  label: 'a asignat compania pe' },
  task_assigned:       { icon: 'kanban',         color: 'var(--accent)',  bg: 'var(--accent-bg)',  label: 'a asignat pe' },
  project_approved:    { icon: 'check',          color: 'var(--success)', bg: 'var(--success-bg)', label: 'a aprobat proiectul' },
  project_rejected:    { icon: 'x',             color: 'var(--danger)',  bg: 'var(--danger-bg)',  label: 'a respins proiectul' },
  account_approved:    { icon: 'shield',         color: 'var(--success)', bg: 'var(--success-bg)', label: 'a aprobat contul tău' },
  account_rejected:    { icon: 'x',             color: 'var(--danger)',  bg: 'var(--danger-bg)',  label: 'a respins contul tău' },
  admin_edit:              { icon: 'edit',           color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'a modificat proiectul' },
  expert_accepted:         { icon: 'check',          color: 'var(--success)', bg: 'var(--success-bg)', label: 'a acceptat task-ul' },
  milestone_disputed:      { icon: 'alert-triangle', color: 'var(--danger)',  bg: 'var(--danger-bg)',  label: 'a deschis o dispută pe' },
  project_ready_for_final: { icon: 'flag',           color: 'var(--success)', bg: 'var(--success-bg)', label: 'Proiect finalizat:' },
  task_acceptance_required:{ icon: 'briefcase',      color: 'var(--accent)',  bg: 'var(--accent-bg)',  label: 'te-a invitat pe' },
  task_accepted:           { icon: 'check-circle',   color: 'var(--success)', bg: 'var(--success-bg)', label: 'a acceptat task-ul' },
  task_rejected_by_expert: { icon: 'x',              color: 'var(--danger)',  bg: 'var(--danger-bg)',  label: 'a refuzat task-ul' },
  task_rejected_by_client: { icon: 'x',              color: 'var(--danger)',  bg: 'var(--danger-bg)',  label: 'a respins task-ul' },
  task_approval_required:  { icon: 'flag',           color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'Task de aprobat pe' },
  contract_ready:          { icon: 'file-text',      color: 'var(--accent)',  bg: 'var(--accent-bg)',  label: 'Contract de semnat pe' },
  contract_awaiting_signature: { icon: 'edit',       color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'Așteptare semnătură pe' },
  contract_signed:         { icon: 'check-circle',   color: 'var(--success)', bg: 'var(--success-bg)', label: 'Contract semnat pe' },
  dispute_resolved:        { icon: 'shield',         color: 'var(--success)', bg: 'var(--success-bg)', label: 'Dispută rezolvată pe' },
  modification_proposed:   { icon: 'edit',           color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'a propus modificări pe' },
  modification_approved:   { icon: 'check-circle',   color: 'var(--success)', bg: 'var(--success-bg)', label: 'Modificare acceptată pe' },
  modification_rejected:   { icon: 'x',              color: 'var(--danger)',  bg: 'var(--danger-bg)',  label: 'Modificare respinsă pe' },
  escrow_funded:           { icon: 'lock',           color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'a depus fonduri în escrow pentru' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'ieri';
  if (days < 7) return `${days}z`;
  return new Date(dateStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
}

function ActivityPanel({ activity, navigate }) {
  return (
    <div className="card">
      <div style={{ padding: '0.5rem 0' }}>
        {activity.length === 0 ? (
          <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: 'var(--fg-3)', fontSize: 13 }}>
            Nicio activitate recentă
          </div>
        ) : activity.slice(0, 10).map((ev, i) => {
          const meta = EVENT_META[ev.event_type] || EVENT_META.message_sent;
          const isLast = i === Math.min(activity.length, 10) - 1;
          return (
            <div
              key={i}
              onClick={() => {
                if (!ev.project_id) return;
                if (ev.task_id) navigate(`/project/${ev.task_id}/assignment/${ev.project_id}`);
                else navigate(`/project/${ev.project_id}`);
              }}
              className="activity-row"
              style={{
                borderBottom: isLast ? 'none' : undefined,
                cursor: ev.project_id ? 'pointer' : 'default',
              }}
              onMouseEnter={e => { if (ev.project_id) e.currentTarget.style.background = 'var(--bg-2)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
                background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={meta.icon} size={14} style={{ color: meta.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'var(--fg-1)', lineHeight: 1.4 }}>
                  {ev.actor_name
                    ? <><b style={{ fontWeight: 600 }}>{ev.actor_name}</b>{' '}<span style={{ color: 'var(--fg-2)' }}>{meta.label}</span></>
                    : <span style={{ color: 'var(--fg-2)' }}>{meta.label}</span>
                  }
                </div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ev.milestone_title ? `${ev.milestone_title} · ` : ''}{ev.project_title}
                  {ev.amount ? ` · ${parseFloat(ev.amount).toLocaleString('ro-RO')} RON` : ''}
                </div>
              </div>
              <div style={{ flexShrink: 0, fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--fg-4)' }}>
                {timeAgo(ev.event_time)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="card-foot">
        <span style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>Ultimele 24 ore</span>
        <button className="btn btn-ghost btn-sm">
          Vezi tot <Icon name="arrow-right" size={12} />
        </button>
      </div>
    </div>
  );
}

// ——— Pipeline Strip ———
function PipelineStrip({ icon, color, borderColor, label, description, projects, navigate }) {
  return (
    <div className="card" style={{ borderColor, marginBottom: '1rem' }}>
      <div className="card-head" style={{ paddingBottom: '.5rem' }}>
        <div className="row" style={{ gap: '.5rem' }}>
          <Icon name={icon} size={14} style={{ color }} />
          <span style={{ fontSize: 13, fontWeight: 600, color }}>{label}</span>
          <span style={{ fontSize: 11, background: 'var(--border-1)', color: 'var(--fg-3)', padding: '1px 6px', borderRadius: 3 }}>
            {projects.length}
          </span>
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{description}</span>
      </div>
      <div style={{ borderTop: `1px solid ${borderColor}` }}>
        {projects.map((p, idx) => (
          <div
            key={p.id}
            onClick={() => navigate(`/project/${p.id}`)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '.625rem 1rem', cursor: 'pointer', gap: '1rem',
              borderBottom: idx < projects.length - 1 ? '1px solid var(--border-1)' : 'none',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.title}
              </div>
              {p.service_type && <span className="tag" style={{ fontSize: 10.5, marginTop: 2 }}>{p.service_type}</span>}
            </div>
            <div className="row" style={{ gap: '.75rem', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--fg-1)' }}>
                {fmtRON(p.budget_ron || p.budget || 0)}
              </span>
              <Icon name="arrow-right" size={12} style={{ color: 'var(--fg-3)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ——— Grouped project rows ———
function GroupedProjectRows({ projects, userId, navigate }) {
  const pmProjects = projects.filter(p => p.is_pm_task);
  const pmIds = new Set(pmProjects.map(p => p.id));
  const subtasks = projects.filter(p => p.task_id && !p.is_pm_task);
  const standalone = projects.filter(p => !p.task_id && !p.is_pm_task);

  const groups = {};
  subtasks.forEach(p => {
    if (!groups[p.task_id]) groups[p.task_id] = { title: p.task_title || 'Proiect parent', children: [] };
    groups[p.task_id].children.push(p);
  });

  const pmStandalone = pmProjects.filter(p => !groups[p.id]);
  const groupsWithPmRow = Object.entries(groups).filter(([id]) => pmIds.has(id));
  const groupsWithoutPmRow = Object.entries(groups).filter(([id]) => !pmIds.has(id));

  return (
    <>
      {standalone.map(p => <ProjectRow key={p.id} p={p} userId={userId} onClick={() => navigate(`/project/${p.id}`)} />)}
      {pmStandalone.map(p => <ProjectRow key={p.id} p={p} userId={userId} onClick={() => navigate(`/project/${p.id}`)} />)}
      {groupsWithPmRow.map(([taskId, group]) => {
        const pmRow = pmProjects.find(p => p.id === taskId);
        return (
          <React.Fragment key={taskId}>
            <ProjectRow p={pmRow} userId={userId} onClick={() => navigate(`/project/${pmRow.id}`)} isParent />
            {group.children.map(p => <ProjectRow key={p.id} p={p} userId={userId} onClick={() => navigate(`/project/${p.id}`)} isSubtask />)}
          </React.Fragment>
        );
      })}
      {groupsWithoutPmRow.map(([taskId, group]) => (
        <React.Fragment key={taskId}>
          <tr data-group style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--border-1)' }}>
            <td colSpan={6} style={{ padding: '0.5rem 1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="folder" size={13} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg-0)' }}>{group.title}</span>
                <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>{group.children.length} task{group.children.length !== 1 ? 'uri' : ''}</span>
              </div>
            </td>
          </tr>
          {group.children.map(p => <ProjectRow key={p.id} p={p} userId={userId} onClick={() => navigate(`/project/${p.id}`)} isSubtask />)}
        </React.Fragment>
      ))}
    </>
  );
}

// ——— Project Row (for table tabs) ———
function ProjectRow({ p, userId, onClick, isSubtask, isParent }) {
  const budget = p.budget_ron || p.budget || 0;
  const progress = p.progress || 0;
  const isCreator = String(p.client_id) === String(userId) || String(p.company_id) === String(userId);
  const expertName = isCreator
    ? (p.expert_name || p.company_name || p.assigned_expert_name || '—')
    : (p.client_name || '—');

  return (
    <tr onClick={onClick} style={isSubtask ? { background: 'var(--bg-0)' } : isParent ? { background: 'var(--bg-1)' } : {}}>
      <td data-primary>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingLeft: isSubtask ? '1.5rem' : 0 }}>
          {isSubtask && <span style={{ color: 'var(--fg-3)', fontSize: 13, lineHeight: '20px', flexShrink: 0 }}>↳</span>}
          <div>
            <div style={{ fontWeight: isParent ? 700 : 600, color: 'var(--fg-0)', marginBottom: 2 }}>{p.title}</div>
            <div className="row" style={{ gap: '.5rem' }}>
              {p.service_type && <span className="tag" style={isSubtask ? { fontSize: 10 } : {}}>{p.service_type}</span>}
              <span style={{ fontSize: 11, color: 'var(--fg-4)', fontFamily: 'var(--f-mono)' }}>#{p.id.slice(0,8)}</span>
            </div>
          </div>
        </div>
      </td>
      <td data-label="Partener">
        {expertName !== '—' && (
          <div className="row" style={{ gap: '.5rem' }}>
            <Avatar user={{ name: expertName, color: 'cyan' }} size="sm" />
            <span style={{ fontSize: 12.5 }}>{expertName}</span>
          </div>
        )}
      </td>
      <td data-label="Status">
        <div className="row" style={{ gap: '.375rem', flexWrap: 'wrap' }}>
          <StatusBadge status={p.status} />
          {parseInt(p.pending_contracts_for_me) > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--warning)', color: '#fff', borderRadius: 4, padding: '2px 6px', letterSpacing: '.04em' }}>
              DE SEMNAT
            </span>
          )}
        </div>
      </td>
      <td data-label="Buget" style={{ fontFamily: 'var(--f-mono)', fontWeight: 600 }}>{fmtRON(budget)}</td>
      <td data-label="Progres">
        <div style={{ width: 100 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-2)' }}>{progress}%</span>
          </div>
          <div className="bar"><div className="bar-fill" style={{ width: `${progress}%` }} /></div>
        </div>
      </td>
      <td data-label="Deadline" style={{ fontSize: 12, color: 'var(--fg-3)' }}>{fmtDate(p.deadline || p.created_at)}</td>
    </tr>
  );
}
