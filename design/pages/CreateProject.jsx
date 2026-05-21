import { useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Icon } from '../components/ui';

const SERVICE_TYPES = [
  { value: 'matching',            label: 'Matching',            icon: 'sparkle',   description: 'Platforma te ajută să găsești expertul potrivit.' },
  { value: 'direct',              label: 'Direct',              icon: 'user',      description: 'Contract direct cu expertul ales de tine.' },
  { value: 'project_management',  label: 'Project Management',  icon: 'briefcase', description: 'Supervizăm proiectul de la început până la finalizare.' },
];

const STEPS = [
  { id: 1, label: 'Brief' },
  { id: 2, label: 'Buget & timp' },
  { id: 3, label: 'Milestone-uri' },
  { id: 4, label: 'Revizuire' },
];

export default function CreateProject() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    budget_ron: '',
    timeline_days: '',
    service_type: '',
    direct_partner_email: '',
    milestones: [
      { title: '', deliverable_description: '', percentage_of_budget: 50 },
      { title: '', deliverable_description: '', percentage_of_budget: 50 },
    ],
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setMilestone = (i, key, val) =>
    setForm(p => ({ ...p, milestones: p.milestones.map((m, idx) => idx === i ? { ...m, [key]: key === 'percentage_of_budget' ? parseFloat(val) || 0 : val } : m) }));
  const addMilestone = () => setForm(p => ({ ...p, milestones: [...p.milestones, { title: '', deliverable_description: '', percentage_of_budget: 0 }] }));
  const removeMilestone = (i) => setForm(p => ({ ...p, milestones: p.milestones.length > 1 ? p.milestones.filter((_, idx) => idx !== i) : p.milestones }));

  const totalPct = form.milestones.reduce((s, m) => s + (parseFloat(m.percentage_of_budget) || 0), 0);
  const isPM = form.service_type === 'project_management';
  const commission = form.budget_ron ? Math.round(parseFloat(form.budget_ron) * 0.05) : 0;
  const escrowTotal = form.budget_ron ? Math.round(parseFloat(form.budget_ron) + commission) : 0;

  const validateStep = () => {
    setError('');
    if (step === 1) {
      if (!form.service_type) { setError('Selectează tipul de serviciu.'); return false; }
      if (!form.title.trim()) { setError('Introdu titlul proiectului.'); return false; }
      if (!form.description.trim()) { setError('Adaugă o descriere.'); return false; }
    }
    if (step === 2) {
      if (!form.budget_ron) { setError('Introdu bugetul proiectului.'); return false; }
      if (!form.timeline_days) { setError('Introdu termenul în zile.'); return false; }
      if (form.service_type === 'direct' && !form.direct_partner_email) { setError('Introdu email-ul expertului.'); return false; }
    }
    if (step === 3 && !isPM) {
      if (form.milestones.length === 0) { setError('Adaugă cel puțin o etapă.'); return false; }
      if (Math.round(totalPct) !== 100) { setError(`Procentele trebuie să totalizeze 100% (acum ${totalPct}%).`); return false; }
      if (form.milestones.some(m => !m.title || !m.deliverable_description)) { setError('Completează titlul și livrabilele pentru fiecare etapă.'); return false; }
    }
    return true;
  };

  const next = () => { if (validateStep()) setStep(s => Math.min(s + 1, isPM && step === 2 ? 4 : 4)); };
  const back = () => { setError(''); setStep(s => Math.max(s - 1, 1)); };

  const handleSubmit = async () => {
    setError('');
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/projects', form, { headers: { Authorization: `Bearer ${token}` } });
      const dashboardPath = user?.role === 'expert' ? '/expert/dashboard'
        : user?.role === 'individual' ? '/individual/dashboard'
        : '/company/dashboard';
      if (res.data.is_project_management && res.data.task_id) {
        setSuccess('Project Management task creat și trimis la aprobare!');
        setTimeout(() => navigate(dashboardPath), 2000);
      } else {
        setSuccess('Proiect creat cu succes!');
        setTimeout(() => navigate(dashboardPath), 1500);
      }
    } catch (err) { setError(err.response?.data?.error || 'Eroare la crearea proiectului.'); }
    finally { setLoading(false); }
  };

  const stepsToShow = isPM
    ? STEPS.filter(s => s.id !== 3)
    : STEPS;

  const currentStepIdx = stepsToShow.findIndex(s => s.id === step);

  return (
    <div className="escro-page fade-up" style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="h-eyebrow">Proiect nou · {SERVICE_TYPES.find(s => s.value === form.service_type)?.label || 'Alege tipul'}</div>
        <h1 className="h-title" style={{ fontSize: 28 }}>
          {step === 1 && <>Brief & <em>tip serviciu</em>.</>}
          {step === 2 && <>Buget & <em>timeline</em>.</>}
          {step === 3 && !isPM && <>Milestone-<em>uri</em>.</>}
          {(step === 4 || (step === 3 && isPM)) && <>Revizuire & <em>trimitere</em>.</>}
        </h1>
      </div>

      {/* Step indicator */}
      <div className="steps" style={{ marginBottom: '2rem' }}>
        {stepsToShow.map((s, i) => {
          const isActive = s.id === step;
          const isDone = step > s.id || (isPM && step === 3 && s.id <= 2);
          return (
            <Fragment key={s.id}>
              <div className={`step ${isActive ? 'active' : isDone ? 'done' : ''}`}>
                <div className="step-num">{isDone ? <Icon name="check" size={10} /> : i + 1}</div>
                <span className="step-l">{s.label}</span>
              </div>
              {i < stepsToShow.length - 1 && <div className="step-line" style={{ flex: 1 }} />}
            </Fragment>
          );
        })}
      </div>

      {/* Error / success banners */}
      {error && (
        <div style={{ padding: '.75rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '.75rem 1rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--r-sm)', color: 'var(--success)', fontSize: 13, marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      {/* ── STEP 1: Brief ── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Service type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.625rem' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)', marginBottom: 2 }}>Tip serviciu</div>
            {SERVICE_TYPES.map(st => (
              <div
                key={st.value}
                onClick={() => set('service_type', st.value)}
                style={{
                  padding: '1rem 1.25rem', borderRadius: 'var(--r-md)', cursor: 'pointer',
                  border: `1.5px solid ${form.service_type === st.value ? 'var(--accent)' : 'var(--border-1)'}`,
                  background: form.service_type === st.value ? 'var(--accent-bg)' : 'var(--bg-1)',
                  display: 'flex', alignItems: 'center', gap: '.875rem',
                  transition: 'all .15s',
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 'var(--r-sm)', flexShrink: 0,
                  background: form.service_type === st.value ? 'var(--accent)' : 'var(--bg-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: form.service_type === st.value ? '#fff' : 'var(--fg-3)',
                }}>
                  <Icon name={st.icon} size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg-0)', marginBottom: 2 }}>{st.label}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--fg-3)' }}>{st.description}</div>
                </div>
                {form.service_type === st.value && <Icon name="check" size={14} style={{ color: 'var(--accent)' }} />}
              </div>
            ))}
          </div>

          {/* Title */}
          <div>
            <label className="label">Titlu proiect *</label>
            <input
              className="input"
              type="text"
              placeholder="ex. Audit financiar Q4 2025"
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="label">Descriere *</label>
            <textarea
              className="input"
              rows={4}
              placeholder="Descrie obiectivele proiectului, contextul și cerințele principale…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="wizard-nav wizard-nav-end">
            <button className="btn btn-secondary" type="button" onClick={() => navigate(-1)}>Anulează</button>
            <button className="btn btn-primary" type="button" onClick={next}>
              Continuă <Icon name="arrow-right" size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Buget & Timeline ── */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Vault escrow estimate */}
          {form.budget_ron > 0 && (
            <div className="vault" style={{ marginBottom: '.5rem' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)', marginBottom: '.5rem' }}>
                {isPM ? 'Buget proiect' : 'Estimare escrow'}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '.5rem' }}>
                <span className="vault-num"><em>{(isPM ? parseFloat(form.budget_ron || 0) : escrowTotal).toLocaleString('ro-RO')}</em></span>
                <span className="vault-cur">RON</span>
              </div>
              <div style={{ marginTop: '.875rem', display: 'flex', gap: '1.5rem', fontSize: 12, fontFamily: 'var(--f-mono)', color: 'rgba(255,255,255,0.5)' }}>
                <span>Buget: {parseFloat(form.budget_ron || 0).toLocaleString('ro-RO')} RON</span>
                {!isPM && <span>Comision 5%: {commission.toLocaleString('ro-RO')} RON</span>}
              </div>
              <div style={{ marginTop: '.875rem' }}>
                <div className="bar" style={{ height: 5 }}>
                  <div className="bar-fill" style={{ width: '95%', background: 'rgba(255,255,255,0.6)' }} />
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--f-mono)', marginTop: 4 }}>
                  {isPM
                    ? 'Comisionul de 5% se aplică doar la momentul depunerii fondurilor pentru fiecare milestone.'
                    : 'Expert primește 95% · Escro reține 5%'}
                </div>
              </div>
            </div>
          )}

          <div className="form-row-2">
            <div>
              <label className="label">Buget total (RON) *</label>
              <input
                className="input"
                type="number"
                min="0"
                placeholder="ex. 10000"
                value={form.budget_ron}
                onChange={e => set('budget_ron', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Termen (zile) *</label>
              <input
                className="input"
                type="number"
                min="1"
                placeholder="ex. 30"
                value={form.timeline_days}
                onChange={e => set('timeline_days', e.target.value)}
              />
            </div>
          </div>

          {form.service_type === 'direct' && (
            <div>
              <label className="label">Email expert / companie *</label>
              <input
                className="input"
                type="email"
                placeholder="expert@exemplu.ro"
                value={form.direct_partner_email}
                onChange={e => set('direct_partner_email', e.target.value)}
              />
            </div>
          )}

          {/* Escrow info box */}
          <div style={{
            padding: '.875rem 1rem',
            background: 'var(--bg-1)',
            border: '1px solid var(--border-1)',
            borderRadius: 'var(--r-md)',
            fontSize: 12.5,
            color: 'var(--fg-3)',
            display: 'flex',
            gap: '.75rem',
            alignItems: 'flex-start',
          }}>
            <Icon name="shield" size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <span style={{ color: 'var(--fg-1)', fontWeight: 500 }}>Cum funcționează escrow-ul:</span>{' '}
              Fondurile sunt blocate în escrow la demararea proiectului și eliberate automat după aprobarea fiecărui milestone.
            </div>
          </div>

          <div className="wizard-nav">
            <button className="btn btn-secondary" type="button" onClick={back}><Icon name="arrow-left" size={14} /> Înapoi</button>
            <button className="btn btn-primary" type="button" onClick={next}>
              {isPM ? 'Revizuire' : 'Milestone-uri'} <Icon name="arrow-right" size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Milestones ── */}
      {step === 3 && !isPM && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>
              Împarte bugetul de <strong style={{ color: 'var(--fg-0)' }}>{parseFloat(form.budget_ron || 0).toLocaleString('ro-RO')} RON</strong> pe etape.
            </div>
            <span className={`badge ${Math.round(totalPct) === 100 ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: 11 }}>
              {totalPct}% / 100%
            </span>
          </div>

          {/* Timeline */}
          <div className="tl">
            {form.milestones.map((ms, i) => {
              const amt = form.budget_ron ? Math.round((ms.percentage_of_budget / 100) * parseFloat(form.budget_ron)) : 0;
              return (
                <div key={i} className="tl-row">
                  <div className="tl-dot active">{i + 1}</div>
                  <div style={{
                    flex: 1,
                    background: 'var(--bg-1)',
                    border: '1px solid var(--border-1)',
                    borderRadius: 'var(--r-md)',
                    padding: '1rem 1.125rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '.625rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Etapa {i + 1}</span>
                      {form.milestones.length > 1 && (
                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', padding: '2px 6px' }} onClick={() => removeMilestone(i)}>
                          <Icon name="trash" size={12} />
                        </button>
                      )}
                    </div>
                    <input className="input" placeholder="Titlu etapă" value={ms.title} onChange={e => setMilestone(i, 'title', e.target.value)} style={{ fontSize: 13 }} />
                    <textarea className="input" placeholder="Descrie livrabilele acestei etape…" rows={2} value={ms.deliverable_description} onChange={e => setMilestone(i, 'deliverable_description', e.target.value)} style={{ resize: 'vertical', fontSize: 13 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        <input className="input" type="number" min="0" max="100" style={{ width: 72, fontSize: 13 }} value={ms.percentage_of_budget} onChange={e => setMilestone(i, 'percentage_of_budget', e.target.value)} />
                        <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>%</span>
                      </div>
                      {form.budget_ron && (
                        <span style={{ fontSize: 12, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)' }}>
                          ≈ {amt.toLocaleString('ro-RO')} RON
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button type="button" className="btn btn-secondary btn-sm" onClick={addMilestone} style={{ alignSelf: 'flex-start' }}>
            <Icon name="plus" size={12} /> Adaugă etapă
          </button>

          <div className="wizard-nav">
            <button className="btn btn-secondary" type="button" onClick={back}><Icon name="arrow-left" size={14} /> Înapoi</button>
            <button className="btn btn-primary" type="button" onClick={next}>
              Revizuire <Icon name="arrow-right" size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Revizuire ── */}
      {(step === 4 || (step === 3 && isPM)) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Summary card */}
          <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-1)' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)', marginBottom: 6 }}>
                {SERVICE_TYPES.find(s => s.value === form.service_type)?.label}
              </div>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 22, color: 'var(--fg-0)', letterSpacing: '-0.01em' }}>{form.title}</div>
              {form.description && (
                <div style={{ marginTop: '.5rem', fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.6 }}>{form.description}</div>
              )}
            </div>

            <div className="form-row-3">
              {[
                { label: 'Buget', value: `${parseFloat(form.budget_ron || 0).toLocaleString('ro-RO')} RON` },
                { label: 'Termen', value: `${form.timeline_days} zile` },
                { label: 'Tip', value: SERVICE_TYPES.find(s => s.value === form.service_type)?.label },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '1rem 1.25rem',
                  borderRight: i < 2 ? '1px solid var(--border-1)' : 'none',
                }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--f-mono)', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-0)' }}>{item.value}</div>
                </div>
              ))}
            </div>

            {!isPM && form.milestones.length > 0 && (
              <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-1)' }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)', marginBottom: '.875rem' }}>
                  {form.milestones.length} milestone-uri
                </div>
                {form.milestones.map((ms, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.5rem' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-2)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, fontSize: 13, color: 'var(--fg-1)' }}>{ms.title || `Etapa ${i + 1}`}</div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--f-mono)', color: 'var(--fg-3)' }}>{ms.percentage_of_budget}%</div>
                    {form.budget_ron && (
                      <div style={{ fontSize: 12, fontFamily: 'var(--f-mono)', color: 'var(--fg-2)', minWidth: 90, textAlign: 'right' }}>
                        {Math.round((ms.percentage_of_budget / 100) * parseFloat(form.budget_ron)).toLocaleString('ro-RO')} RON
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Escrow lock warning */}
          <div style={{
            padding: '1rem 1.25rem',
            background: 'var(--accent-bg)',
            border: '1px solid var(--accent-border)',
            borderRadius: 'var(--r-md)',
            display: 'flex',
            gap: '.875rem',
            alignItems: 'flex-start',
          }}>
            <Icon name="shield" size={16} style={{ color: 'var(--accent-hi)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-hi)', marginBottom: 3 }}>
                {isPM ? 'Comision aplicat pe milestone' : 'Fonduri blocate la demarare'}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.6 }}>
                {isPM
                  ? 'Nu plătești niciun comision la crearea task-ului. Comisionul de 5% se aplică doar atunci când adaugi fonduri în escrow pentru fiecare milestone.'
                  : form.budget_ron
                  ? `La acceptarea proiectului, ${escrowTotal.toLocaleString('ro-RO')} RON (buget + comision 5%) vor fi blocați în escrow și eliberați automat la fiecare milestone aprobat.`
                  : 'La acceptarea proiectului, fondurile vor fi blocate în escrow și eliberate automat la fiecare milestone aprobat.'}
              </div>
            </div>
          </div>

          <div className="wizard-nav">
            <button className="btn btn-secondary" type="button" onClick={back} disabled={loading}>
              <Icon name="arrow-left" size={14} /> Înapoi
            </button>
            <button className="btn btn-primary" type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Se creează...' : 'Lansează proiectul'}
              {!loading && <Icon name="sparkle" size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
