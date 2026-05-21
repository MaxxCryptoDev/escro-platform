import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon, Avatar, StatusBadge, EmptyState, Spinner } from '../components/ui';
import { fmtRON, fmtDate, avatarColor } from '../utils/format';
import axios from 'axios';

export default function ExpertDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [projects, setProjects] = useState([]);
  const [trustProfile, setTrustProfile] = useState(null);
  const [activity, setActivity] = useState([]);
  const [walletBalance, setWalletBalance] = useState(null);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingMsg, setOnboardingMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingReviews, setPendingReviews] = useState([]);

  useEffect(() => {
    setActiveTab(searchParams.get('tab') || 'overview');
  }, [searchParams]);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const [projRes, trustRes, actRes, walletRes] = await Promise.allSettled([
        axios.get('/api/projects', { headers }),
        axios.get('/api/trust-profiles/my-trust-profile', { headers }),
        axios.get('/api/activity', { headers }),
        axios.get('/api/wallet/balance', { headers }),
      ]);
      if (projRes.status === 'fulfilled') {
        const data = projRes.value.data;
        setProjects(data.projects || data || []);
      }
      if (trustRes.status === 'fulfilled') setTrustProfile(trustRes.value.data);
      if (actRes.status === 'fulfilled') setActivity(actRes.value.data.activity || []);
      if (walletRes.status === 'fulfilled') {
        setWalletBalance(walletRes.value.data.balance);
        setStripeStatus(walletRes.value.data.stripe);
      }
    } catch {
      setError('Nu s-au putut încărca datele.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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
  const allTasks = projects.filter(p =>
    !p.is_marketplace &&
    !p.is_pm_task &&
    (p.service_type === 'direct' || p.service_type === 'matching') &&
    ['assigned', 'active', 'in_progress', 'review', 'completed', 'pending_expert_approval'].includes(p.status)
  );
  const myProjects = projects.filter(p =>
    !p.is_marketplace &&
    (p.expert_id === user?.id ||
    p.assigned_expert_id === user?.id ||
    p.client_id === user?.id ||
    p.company_id === user?.id ||
    p.posted_by_expert === user?.id) &&
    (p.assignment_type !== 'task_assignment' ||
     p.expert_id === user?.id ||
     p.assigned_expert_id === user?.id ||
     p.company_id === user?.id ||
     p.client_id === user?.id)
  );

  // Wallet figures come from real balance (net after commission), not project budgets
  const earned = walletBalance?.total_earned ?? myProjects
    .filter(p => p.status === 'completed')
    .reduce((s, p) => s + (p.released_amount || p.budget_ron || p.budget || 0), 0);
  const walletAvailable = walletBalance?.available ?? 0;
  const pending = myProjects
    .filter(p => ['active', 'in_progress', 'assigned'].includes(p.status))
    .reduce((s, p) => s + (p.escrow_amount || 0), 0);
  const activeCount = myProjects.filter(p => ['active', 'in_progress', 'assigned', 'review', 'pending_expert_approval'].includes(p.status)).length;
  const reviewCount = myProjects.filter(p => p.status === 'review').length;
  const completedCount = myProjects.filter(p => p.status === 'completed').length;
  const trustScore = trustProfile?.trust_score || trustProfile?.score || 0;
  const trustLevel = trustProfile?.trust_level || 1;
  const kycStatus = user?.kyc_status || 'pending';
  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'utilizator';

  const stripeConnected = stripeStatus?.onboarding_complete;
  const stripePending = stripeStatus?.account_id === 'pending_stripe_integration';
  const hasVerificationCall = !!trustProfile?.has_verification_call;

  const handleStripeOnboarding = async () => {
    setOnboardingLoading(true);
    setOnboardingMsg('');
    try {
      const res = await axios.post('/api/stripe/onboarding', {}, { headers });
      if (res.data.onboarding_url && !res.data.mock) {
        window.location.assign(res.data.onboarding_url);
        return;
      }
      setOnboardingMsg(res.data.message || 'Cerere înregistrată.');
      setStripeStatus(s => ({ ...s, account_id: 'pending_stripe_integration' }));
    } catch (err) {
      setOnboardingMsg(err.response?.data?.error || 'A apărut o eroare. Încearcă din nou.');
    } finally {
      setOnboardingLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Acasă',              icon: 'home' },
    { id: 'lucrari',  label: 'Proiecte & Taskuri', icon: 'folder', count: projects.length || undefined },
  ];

  return (
    <div className="escro-page fade-up">
      {/* Page header */}
      <div className="page-head" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="h-eyebrow">
            <Icon name="user" size={11} /> Dashboard · Expert
          </div>
          <h1 className="h-title">
            {reviewCount > 0
              ? <>{reviewCount} proiecte așteaptă <em>livrarea ta</em>.</>
              : <>Bună, <em>{firstName}</em>.</>
            }
          </h1>
          <p className="h-sub">
            {activeCount} proiecte active · {completedCount} finalizate · Trust L{trustLevel}
          </p>
        </div>
        <div className="page-actions">
          <AccountVerifiedBadge verified={!!user?.verification_date} />
          <KycVerifiedBadge verified={kycStatus === 'verified'} />
          <button className="btn btn-secondary" onClick={() => navigate(`/profile/${user?.id}`)}>
            <Icon name="user" size={14} /> Profil public
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/directory')}>
            <Icon name="search" size={14} /> Găsește proiecte
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
                <span style={{ fontSize: 10.5, color: 'var(--fg-3)', background: 'var(--border-1)', padding: '1px 5px', borderRadius: 3 }}>
                  {t.count}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {loading && <Spinner />}
      {error && <div style={{ color: 'var(--danger)', padding: '1rem', textAlign: 'center' }}>{error}</div>}

      {/* ——— OVERVIEW ——— */}
      {!loading && activeTab === 'overview' && <>
        {/* KYC / Stripe Connect banner — three states: needs verification call → can connect → connected */}
        {!stripeConnected && (() => {
          const waitingForCall = !hasVerificationCall;
          const bg = waitingForCall ? 'var(--bg-1)' : (stripePending ? 'var(--bg-1)' : 'var(--warning-bg)');
          const borderColor = waitingForCall || stripePending ? 'var(--border-1)' : 'var(--warning-border)';
          const iconName = waitingForCall ? 'phone' : (stripePending ? 'clock' : 'alert-triangle');
          const iconColor = waitingForCall || stripePending ? 'var(--fg-3)' : 'var(--warning)';
          const title = waitingForCall
            ? 'Așteaptă apelul de verificare cu administratorul'
            : (stripePending ? 'Verificare KYC — în curs' : 'Verifică-ți identitatea (KYC)');
          const description = waitingForCall
            ? 'După aprobarea apelului de verificare cu adminul, poți începe verificarea KYC: identitate, document, IBAN.'
            : (stripePending
              ? 'Verificarea ta este în procesare la Stripe. Vei fi notificat când e completă și poți primi plăți.'
              : 'Pornește fluxul de verificare KYC prin Stripe: identitate (CNP/CUI + document), apoi IBAN pentru a primi banii din milestone-uri.');
          return (
            <div style={{
              marginBottom: '1.5rem',
              padding: '1rem 1.25rem',
              background: bg,
              border: `1px solid ${borderColor}`,
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
                  {onboardingMsg && (
                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--accent)', background: 'var(--accent-bg)', borderRadius: 4, padding: '4px 8px', display: 'inline-block' }}>
                      {onboardingMsg}
                    </div>
                  )}
                </div>
              </div>
              {hasVerificationCall && !stripePending && (
                <button
                  className="btn btn-sm"
                  style={{ whiteSpace: 'nowrap', gap: 6, background: 'var(--warning)', color: '#fff', border: 'none', flexShrink: 0 }}
                  onClick={handleStripeOnboarding}
                  disabled={onboardingLoading}
                >
                  {onboardingLoading ? <Spinner size={12} inline /> : <Icon name="shield" size={13} />}
                  {onboardingLoading ? 'Se procesează...' : 'Începe verificarea KYC'}
                </button>
              )}
            </div>
          );
        })()}

        {/* Pending reviews banner */}
        {pendingReviews.length > 0 && (
          <div className="card" style={{ borderColor: 'var(--accent)', borderWidth: 2, marginBottom: '1rem', background: 'var(--accent-bg, #eff6ff)' }}>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: 22 }}>★</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--fg-0)' }}>
                      {pendingReviews.length === 1 ? 'Ai o recenzie de lăsat' : `Ai ${pendingReviews.length} recenzii de lăsat`}
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

        <ExpertOverviewTab
          myProjects={myProjects}
          earned={earned}
          pending={pending}
          activeCount={activeCount}
          reviewCount={reviewCount}
          completedCount={completedCount}
          trustScore={trustScore}
          trustLevel={trustLevel}
          activity={activity}
          user={user}
          navigate={navigate}
        />
      </>}

      {/* ——— LUCRARI TAB ——— */}
      {!loading && activeTab === 'lucrari' && (
        <div className="col" style={{ gap: '1rem' }}>
          {projects.filter(p => p.status === 'pending_client_approval').map(p => (
            <div key={`confirm-${p.id}`} style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--fg-0)', marginBottom: 2 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: 'var(--warning)' }}>Adminul a modificat acest task. Verifică detaliile și confirmă sau respinge modificarea.</div>
              </div>
              <div className="row" style={{ gap: '.5rem', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--warning)', color: '#000', padding: '2px 8px', borderRadius: 99, marginRight: 4 }}>Necesită confirmare</span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/project/${p.id}`)}>
                  <Icon name="eye" size={12} /> Detalii
                </button>
                <button className="btn btn-success btn-sm" onClick={async () => {
                  try { await axios.post(`/api/projects/${p.id}/accept-admin-edit`, {}, { headers }); fetchData(); }
                  catch { alert('Eroare la confirmare'); }
                }}>Acceptă</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={async () => {
                  try { await axios.post(`/api/projects/${p.id}/reject-admin-edit`, {}, { headers }); fetchData(); }
                  catch { alert('Eroare la respingere'); }
                }}>Respinge</button>
              </div>
            </div>
          ))}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Proiecte & Task-uri ({projects.length})</div>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/create-project')}>
                <Icon name="plus" size={12} /> Proiect nou
              </button>
            </div>
            {projects.length === 0 ? (
              <EmptyState icon="folder" title="Niciun proiect" description="Nu ești asignat la niciun proiect sau task momentan." />
            ) : (
              <table className="tbl tbl-stack">
                <thead><tr><th>Proiect / Task</th><th>Parte</th><th>Status</th><th>Buget</th><th>Progres</th><th>Deadline</th></tr></thead>
                <tbody>
                  <GroupedProjectRows projects={projects} userId={user?.id} navigate={navigate} />
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ——— Expert Overview Tab ———
function ExpertOverviewTab({ myProjects, earned, pending, activeCount, reviewCount, completedCount, trustScore, trustLevel, activity, user, navigate }) {
  const activeProjects = myProjects.filter(p => ['active', 'in_progress', 'assigned', 'review'].includes(p.status));
  const pendingProjects = myProjects.filter(p => p.status === 'pending_admin_approval');
  const waitingProjects = myProjects.filter(p => p.status === 'open');
  const contractSignProjects = myProjects.filter(p => parseInt(p.pending_contracts_for_me) > 0);
  // Prestator banner: only fires when this user is the prestator (expert_id or company_id) on the project.
  const pendingDeliveryProjects = myProjects.filter(p =>
    parseInt(p.pending_deliveries) > 0
    && (String(p.expert_id) === String(user?.id) || String(p.company_id) === String(user?.id))
  );
  // Client banner: when expert posted a task and a sub-assignment milestone was delivered awaiting approval.
  const pendingApprovalProjects = myProjects.filter(p =>
    parseInt(p.pending_approvals) > 0
    && String(p.client_id) === String(user?.id)
  );

  return (
    <>
      {/* ── Alert: livrabile de trimis ── */}
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

      {/* ── Alert: aprobări de făcut (când expertul a postat un task și un livrabil așteaptă aprobarea lui) ── */}
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

      {/* Vault hero (expert view — shows earnings) */}
      <div className="vault" style={{ marginBottom: '2rem' }}>
        <div className="vault-content" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem', alignItems: 'center' }}>
          <div>
            <div className="h-eyebrow" style={{ marginBottom: '1rem' }}>
              <Icon name="trending-up" size={11} /> Câștiguri · Total câștigat
            </div>
            <div className="vault-num">
              <em>{Math.round(earned).toLocaleString('ro-RO')}</em>
              <span className="vault-cur">RON</span>
            </div>
            <p style={{ marginTop: '1rem', maxWidth: '46ch', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55 }}>
              Câștiguri din proiecte finalizate. Fondurile sunt debursate la aprobarea fiecărui milestone.
            </p>
            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <div className="h-eyebrow" style={{ marginBottom: '.25rem', fontSize: 9 }}>În așteptare</div>
                <div style={{ fontSize: 16, color: 'var(--fg-0)', fontFamily: 'var(--f-mono)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtRON(pending)}
                </div>
              </div>
              <div className="v-divider" />
              <div>
                <div className="h-eyebrow" style={{ marginBottom: '.25rem', fontSize: 9 }}>Proiecte active</div>
                <div style={{ fontSize: 16, color: 'var(--accent-hi)', fontFamily: 'var(--f-mono)' }}>
                  {activeCount}
                </div>
              </div>
              <div className="v-divider" />
              <div>
                <div className="h-eyebrow" style={{ marginBottom: '.25rem', fontSize: 9 }}>Finalizate</div>
                <div style={{ fontSize: 16, color: 'var(--success)', fontFamily: 'var(--f-mono)' }}>
                  {completedCount}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '1.25rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/wallet')} style={{ gap: 6 }}>
                <Icon name="credit-card" size={12} /> Portofel & retrageri
              </button>
            </div>
          </div>
          <div>
            <div className="h-eyebrow" style={{ marginBottom: '.75rem' }}>Trust Profile</div>
            {/* Trust level pips */}
            <div style={{ display: 'flex', gap: 6, marginBottom: '1rem' }}>
              {[1,2,3,4,5].map(n => (
                <div key={n} style={{
                  flex: 1, height: 6, borderRadius: 3,
                  background: n <= trustLevel ? 'var(--accent)' : 'var(--border-2)',
                  transition: 'background 400ms',
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, color: 'var(--fg-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--fg-3)' }}>Nivel trust</span>
                <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--accent-hi)', fontWeight: 600 }}>L{trustLevel} / L5</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--fg-3)' }}>Trust score</span>
                <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--fg-0)' }}>{trustScore} pts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--fg-3)' }}>Proiecte finalizate</span>
                <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--fg-0)' }}>{completedCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid-4 */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <StatCard label="Proiecte active" value={activeCount} icon="folder" sublabel="workspace" />
        <StatCard label="În review" value={reviewCount} icon="flag" sublabel={reviewCount > 0 ? 'livrabile' : 'nicio livrare'} delta={reviewCount > 0 ? 'Livrabile' : null} />
        <StatCard label="Trust Level" value={`L${trustLevel}`} icon="shield" sublabel={`${trustScore} pts`} isText />
        <StatCard label="Câștiguri totale" value={fmtRON(earned)} icon="trending-up" sublabel="din escrow" isText />
      </div>

      {/* 2-col: projects + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        <div>
          <div className="section-h">
            <h2 className="s-title">Proiecte <em>active</em></h2>
            <span className="section-meta">{activeProjects.length} asignate</span>
          </div>

          {pendingProjects.length > 0 && (
            <PipelineStrip
              icon="clock"
              color="var(--fg-3)"
              borderColor="var(--border-1)"
              label="Fără task configurat"
              description="Proiectele se află la admin pentru configurarea taskului."
              projects={pendingProjects}
              navigate={navigate}
            />
          )}

          {waitingProjects.length > 0 && (
            <PipelineStrip
              icon="search"
              color="var(--warning)"
              borderColor="var(--warning-border)"
              label="Disponibil pentru asignare"
              description="Poți aplica pentru aceste proiecte."
              projects={waitingProjects}
              navigate={navigate}
            />
          )}

          {activeProjects.length === 0 ? (
            <EmptyState icon="briefcase" title="Niciun proiect activ" description="Explorează directorul pentru oportunități noi." />
          ) : (
            <div className="grid-2">
              {activeProjects.slice(0, 4).map(p => (
                <ProjectCard key={p.id} p={p} userId={user?.id} onClick={() => navigate(`/project/${p.id}`)} />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="section-h">
            <h2 className="s-title">Activitate <em>live</em></h2>
            <span className="section-meta">
              <span className="pulse ok" style={{ verticalAlign: '-1px', marginRight: 6 }} />
              sincronizat
            </span>
          </div>
          <ActivityPanel activity={activity} navigate={navigate} />
        </div>
      </div>
    </>
  );
}

// ——— Stat Card ———
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

// ——— Project Card ———
function ProjectCard({ p, userId, onClick }) {
  const budget = p.budget_ron || p.budget || 0;
  const progress = p.progress || 0;
  const isExpert = String(p.expert_id) === String(userId) || String(p.assigned_expert_id) === String(userId);
  const partnerName = isExpert
    ? (p.client_name || p.company_name || null)
    : (p.expert_name || p.assigned_expert_name || null);

  const needsSign = parseInt(p.pending_contracts_for_me) > 0;
  const needsDeliver = parseInt(p.pending_deliveries) > 0;

  return (
    <div className="proj" onClick={onClick} style={{ position: 'relative' }}>
      {(needsSign || needsDeliver) && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {needsSign && (
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
              background: 'var(--warning-bg)', color: 'var(--warning)',
              border: '1px solid var(--warning-border)', letterSpacing: '.02em',
            }}>✍ Semnează contract</span>
          )}
          {needsDeliver && (
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
              background: 'var(--accent-bg)', color: 'var(--accent-hi)',
              border: '1px solid var(--accent-border)', letterSpacing: '.02em',
            }}>↑ Livrează milestone</span>
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
              <Avatar user={{ name: partnerName, color: avatarColor('company') }} size="sm" />
              <span>{partnerName}</span>
            </>
          ) : (
            <span style={{ color: 'var(--fg-3)' }}>Client</span>
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
  company_assigned:    { icon: 'building',       color: 'var(--accent)',  bg: 'var(--accent-bg)',  label: 'te-a asignat pe' },
  task_assigned:       { icon: 'kanban',         color: 'var(--accent)',  bg: 'var(--accent-bg)',  label: 'te-a asignat pe' },
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
              style={{ borderBottom: isLast ? 'none' : undefined, cursor: ev.project_id ? 'pointer' : 'default' }}
              onMouseEnter={e => { if (ev.project_id) e.currentTarget.style.background = 'var(--bg-2)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <span style={{ fontSize: 11, background: 'var(--border-1)', color: 'var(--fg-3)', padding: '1px 6px', borderRadius: 3 }}>{projects.length}</span>
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
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
              {p.service_type && <span className="tag" style={{ fontSize: 10.5, marginTop: 2 }}>{p.service_type}</span>}
            </div>
            <div className="row" style={{ gap: '.75rem', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--fg-1)' }}>{fmtRON(p.budget_ron || p.budget || 0)}</span>
              <Icon name="arrow-right" size={12} style={{ color: 'var(--fg-3)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ——— Project Row ———
function GroupedProjectRows({ projects, userId, navigate }) {
  const pmProjects = projects.filter(p => p.is_pm_task);
  const pmIds = new Set(pmProjects.map(p => p.id));
  const subtasks = projects.filter(p => p.task_id && !p.is_pm_task);
  const standalone = projects.filter(p => !p.task_id && !p.is_pm_task);

  // Build groups keyed by parent task_id
  const groups = {};
  subtasks.forEach(p => {
    if (!groups[p.task_id]) groups[p.task_id] = { title: p.task_title || 'Proiect parent', children: [] };
    groups[p.task_id].children.push(p);
  });

  // PM projects that have subtasks shown as group headers; others shown flat
  const pmStandalone = pmProjects.filter(p => !groups[p.id]);
  const pmWithChildren = pmProjects.filter(p => groups[p.id]);

  // Orphan subtasks (parent PM not in list) → show with inline parent indicator
  const groupsWithoutPmRow = Object.entries(groups).filter(([id]) => !pmIds.has(id));
  const groupsWithPmRow = Object.entries(groups).filter(([id]) => pmIds.has(id));

  return (
    <>
      {/* Standalone regular projects */}
      {standalone.map(p => (
        <ProjectRow key={p.id} p={p} userId={userId} onClick={() => navigate(`/project/${p.id}`)} />
      ))}

      {/* PM projects without subtasks — flat row */}
      {pmStandalone.map(p => (
        <ProjectRow key={p.id} p={p} userId={userId} onClick={() => navigate(`/project/${p.id}`)} />
      ))}

      {/* Groups where the PM project IS in the list — show PM as header + children */}
      {groupsWithPmRow.map(([taskId, group]) => {
        const pmRow = pmProjects.find(p => p.id === taskId);
        return (
          <ParentGroupRows key={taskId} parent={pmRow} children={group.children} userId={userId} navigate={navigate} />
        );
      })}

      {/* Orphan groups — parent not in list, show inline header */}
      {groupsWithoutPmRow.map(([taskId, group]) => (
        <OrphanGroupRows key={taskId} parentTitle={group.title} children={group.children} userId={userId} navigate={navigate} />
      ))}
    </>
  );
}

function ParentGroupRows({ parent, children, userId, navigate }) {
  return (
    <>
      <ProjectRow p={parent} userId={userId} onClick={() => navigate(`/project/${parent.id}`)} isParent />
      {children.map(p => (
        <ProjectRow key={p.id} p={p} userId={userId} onClick={() => navigate(`/project/${p.id}`)} isSubtask />
      ))}
    </>
  );
}

function OrphanGroupRows({ parentTitle, children, userId, navigate }) {
  return (
    <>
      <tr data-group style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--border-1)' }}>
        <td colSpan={6} style={{ padding: '0.5rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="folder" size={13} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg-0)' }}>{parentTitle}</span>
            <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--f-mono)' }}>{children.length} task{children.length !== 1 ? 'uri' : ''}</span>
          </div>
        </td>
      </tr>
      {children.map(p => (
        <ProjectRow key={p.id} p={p} userId={userId} onClick={() => navigate(`/project/${p.id}`)} isSubtask />
      ))}
    </>
  );
}

function ProjectRow({ p, userId, onClick, isSubtask, isParent }) {
  const budget = p.budget_ron || p.budget || 0;
  const progress = p.progress || 0;
  const isExpert = String(p.expert_id) === String(userId);
  const partnerName = isExpert ? (p.client_name || p.company_name || '—') : (p.expert_name || p.company_name || '—');

  return (
    <tr onClick={onClick} style={isSubtask ? { background: 'var(--bg-0)' } : isParent ? { background: 'var(--bg-1)' } : {}}>
      <td data-primary>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingLeft: isSubtask ? '1.5rem' : 0 }}>
          {isSubtask && <span style={{ color: 'var(--fg-3)', fontSize: 13, lineHeight: '20px', flexShrink: 0 }}>↳</span>}
          <div>
            <div style={{ fontWeight: isParent ? 700 : 600, color: 'var(--fg-0)', marginBottom: 2 }}>{p.title}</div>
            <div className="row" style={{ gap: '.5rem' }}>
              {p.service_type && !isSubtask && <span className="tag">{p.service_type}</span>}
              {isSubtask && p.service_type && <span className="tag" style={{ fontSize: 10 }}>{p.service_type}</span>}
              <span style={{ fontSize: 11, color: 'var(--fg-4)', fontFamily: 'var(--f-mono)' }}>#{p.id.slice(0,8)}</span>
            </div>
          </div>
        </div>
      </td>
      <td data-label="Parte">
        {partnerName !== '—' && (
          <div className="row" style={{ gap: '.5rem' }}>
            <Avatar user={{ name: partnerName, color: 'violet' }} size="sm" />
            <span style={{ fontSize: 12.5 }}>{partnerName}</span>
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
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--fg-2)' }}>{progress}%</span>
          <div className="bar" style={{ marginTop: 4 }}><div className="bar-fill" style={{ width: `${progress}%` }} /></div>
        </div>
      </td>
      <td data-label="Deadline" style={{ fontSize: 12, color: 'var(--fg-3)' }}>{fmtDate(p.deadline || p.created_at)}</td>
    </tr>
  );
}

// ——— Admin approval badge (verification call completed) ———
function AccountVerifiedBadge({ verified }) {
  if (verified) return (
    <span className="badge badge-green no-dot">
      <Icon name="check" size={10} /> Cont verificat
    </span>
  );
  return (
    <span className="badge badge-amber no-dot">
      <Icon name="clock" size={10} /> Cont neverificat
    </span>
  );
}

// ——— Stripe KYC badge (identity verified via Stripe) ———
function KycVerifiedBadge({ verified }) {
  if (verified) return (
    <span className="badge badge-green no-dot">
      <Icon name="check" size={10} /> KYC verificat
    </span>
  );
  return (
    <span className="badge badge-amber no-dot">
      <Icon name="alert-triangle" size={10} /> KYC neverificat
    </span>
  );
}
