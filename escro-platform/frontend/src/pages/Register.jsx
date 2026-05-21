import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Icon } from '../components/ui';
import '../styles/Register.css';

const INDUSTRIES = [
  'IT & Software', 'Web & Mobile Development', 'Design & UX/UI',
  'Marketing Digital', 'Publicitate & Comunicare', 'Fotografie & Video',
  'Construcții & Renovare', 'Imobiliare', 'Arhitectură & Interior Design',
  'Finanțe & Contabilitate', 'Juridic & Avocatură', 'Resurse Umane & Recrutare',
  'Consultanță Business', 'Educație & Training', 'Sănătate & Medical',
  'Transport & Logistică', 'Comerț & eCommerce', 'HoReCa & Turism',
  'Producție & Manufacturing', 'Agricultură', 'Energie & Utilități',
  'Media & Jurnalism', 'Muzică & Entertainment', 'Modă & Fashion',
  'Inginerie & Tehnic', 'Cercetare & Inovare',
];

const ROLES = [
  {
    id: 'expert',
    title: 'Expert',
    tag: 'PFA · SRL',
    icon: 'briefcase',
    desc: 'Sunt specialist independent și ofer servicii ca PFA sau micro-SRL.',
    bullets: ['Plăți blocate în escrow', 'Verificare KYC', 'Comision platformă fix'],
  },
  {
    id: 'company',
    title: 'Companie',
    tag: 'SRL prestator',
    icon: 'building',
    desc: 'Suntem o firmă care prestează servicii pentru alți clienți B2B.',
    bullets: ['Echipă cu mai mulți experți', 'Facturare automată', 'Dashboard SRL'],
  },
  {
    id: 'individual',
    title: 'Persoană fizică',
    tag: 'Beneficiar',
    icon: 'user',
    desc: 'Am nevoie de servicii și vreau garanție pentru banii plătiți.',
    bullets: ['Plata blocată în escrow', 'Eliberare doar după aprobare', 'Arbitraj în 48h'],
  },
];

// ─── Validators (RO-specific) ─────────────────────────────────────────

function validateEmail(v) {
  if (!v) return { ok: false, msg: '' };
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(v)) return { ok: false, msg: 'Format email invalid' };
  return { ok: true };
}

function validatePhone(v) {
  if (!v) return { ok: false, msg: '' };
  const digits = v.replace(/\D/g, '');
  const m = digits.match(/^(?:40|0)?(7\d{8})$/);
  if (!m) return { ok: false, msg: 'Format: +40 7XX XXX XXX' };
  return { ok: true };
}

function formatPhoneAsTyped(v) {
  const digits = v.replace(/\D/g, '');
  let core = digits;
  if (core.startsWith('40')) core = core.slice(2);
  else if (core.startsWith('0')) core = core.slice(1);
  core = core.slice(0, 9);
  if (core.length === 0) return '';
  let out = '+40 ';
  if (core.length > 0) out += core.slice(0, 3);
  if (core.length > 3) out += ' ' + core.slice(3, 6);
  if (core.length > 6) out += ' ' + core.slice(6, 9);
  return out;
}

function validateCUI(v) {
  if (!v) return { ok: false, msg: '' };
  const s = v.toUpperCase().replace(/^RO/, '').replace(/\s/g, '');
  if (!/^\d{2,10}$/.test(s)) return { ok: false, msg: 'CUI: 2–10 cifre, opțional prefix RO' };
  const keys = [7, 5, 3, 2, 1, 7, 5, 3, 2];
  const digits = s.split('').map(Number);
  const control = digits.pop();
  let sum = 0;
  for (let i = 0; i < digits.length; i++) sum += digits[i] * keys[i];
  let computed = (sum * 10) % 11;
  if (computed === 10) computed = 0;
  if (computed !== control) return { ok: false, msg: 'CUI invalid (cifră de control ANAF)' };
  return { ok: true };
}

function passwordStrength(v) {
  if (!v) return { score: 0, label: '', msg: '', ok: false };
  let score = 0;
  if (v.length >= 8) score++;
  if (v.length >= 12) score++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
  if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) score++;
  const labels = ['Foarte slab', 'Slab', 'Mediu', 'Puternic', 'Foarte puternic'];
  let msg = '';
  if (v.length < 8) msg = 'Minim 8 caractere';
  return { score, label: labels[score], msg, ok: v.length >= 8 };
}

function validateName(v) {
  if (!v) return { ok: false, msg: '' };
  if (v.trim().length < 2) return { ok: false, msg: 'Minim 2 caractere' };
  if (!/^[a-zA-ZăâîșțĂÂÎȘȚ\s\-']+$/.test(v)) return { ok: false, msg: 'Doar litere, spații, cratimă' };
  return { ok: true };
}

// ─── Sub-components ────────────────────────────────────────────────────

function RoleCard({ role, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(role.id)}
      className={`role-card ${selected ? 'is-selected' : ''}`}
      aria-pressed={selected}
    >
      <div className="role-card-icon">
        <Icon name={role.icon} size={22} />
      </div>
      <div className="role-card-body">
        <div className="role-card-title">
          {role.title}
          {selected && (
            <span className="role-check">
              <Icon name="check" size={11} />
            </span>
          )}
        </div>
        <div className="role-card-tag">{role.tag}</div>
        <div className="role-card-desc">{role.desc}</div>
        <ul className="role-card-bullets">
          {role.bullets.map(b => (
            <li key={b}>
              <Icon name="check" size={11} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </button>
  );
}

function Field({ label, hint, error, children, required, optional }) {
  return (
    <div className={`fld ${error ? 'has-err' : ''}`}>
      <div className="fld-head">
        <label className="fld-label">
          {label}
          {required && <span className="fld-req">*</span>}
          {optional && <span className="fld-opt">opțional</span>}
        </label>
        {hint && !error && <span className="fld-hint">{hint}</span>}
      </div>
      {children}
      {error && (
        <div className="fld-err">
          <Icon name="alert" size={12} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function ValidatedInput({ name, value, onChange, placeholder, type = 'text', icon, validate, autoComplete, ...rest }) {
  const [touched, setTouched] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const res = validate ? validate(value) : { ok: true };
  const showErr = touched && !res.ok && res.msg;
  const showOk = touched && res.ok && value;
  const inputType = type === 'password' && showPwd ? 'text' : type;

  return (
    <div className={`input-wrap ${showErr ? 'err' : ''} ${showOk ? 'ok' : ''}`}>
      {icon && <span className="input-icon"><Icon name={icon} size={15} /></span>}
      <input
        className={`input ${icon ? 'has-icon' : ''}`}
        type={inputType}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        autoComplete={autoComplete || (type === 'password' ? 'new-password' : 'on')}
        {...rest}
      />
      {type === 'password' && value && (
        <button type="button" className="input-tail" onClick={() => setShowPwd(s => !s)} tabIndex={-1}>
          <Icon name={showPwd ? 'eye-off' : 'eye'} size={15} />
        </button>
      )}
      {showOk && type !== 'password' && (
        <span className="input-tail input-tail-ok"><Icon name="check" size={13} /></span>
      )}
      {showErr && res.msg && <div className="fld-err"><Icon name="alert" size={12} /><span>{res.msg}</span></div>}
    </div>
  );
}

function PasswordStrengthBar({ value }) {
  const s = passwordStrength(value);
  if (!value) return null;
  const tones = ['danger', 'danger', 'warning', 'accent', 'success'];
  const tone = tones[s.score];
  return (
    <div className="pwd-strength">
      <div className="pwd-strength-track">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`pwd-strength-seg ${i < s.score ? 'on ' + tone : ''}`} />
        ))}
      </div>
      <div className="pwd-strength-meta">
        <span className={`pwd-strength-label tone-${tone}`}>{s.label}</span>
        {s.score < 3 && <span className="muted-2">· adaugă majuscule, cifre, simboluri</span>}
      </div>
    </div>
  );
}

function IndustriesPicker({ all, selected, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(ind => !selected.includes(ind) && (q === '' || ind.toLowerCase().includes(q)));
  }, [all, selected, query]);

  const toggle = (ind) => {
    if (selected.includes(ind)) onChange(selected.filter(i => i !== ind));
    else onChange([...selected, ind]);
    setQuery('');
  };

  const remove = (ind) => onChange(selected.filter(i => i !== ind));

  return (
    <div className="ind-picker" ref={wrapRef}>
      <div className={`ind-input-wrap ${open ? 'is-open' : ''}`} onClick={() => setOpen(true)}>
        <Icon name="search" size={14} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
        <div className="ind-chips">
          {selected.map(ind => (
            <span key={ind} className="ind-chip">
              {ind}
              <button type="button" onClick={(e) => { e.stopPropagation(); remove(ind); }} aria-label={`Elimină ${ind}`}>
                <Icon name="x" size={11} />
              </button>
            </span>
          ))}
          <input
            className="ind-search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={selected.length === 0 ? 'Caută și selectează industrii…' : 'Adaugă altă industrie…'}
          />
        </div>
        {selected.length > 0 && (
          <button type="button" className="ind-clear" onClick={(e) => { e.stopPropagation(); onChange([]); setQuery(''); }}>
            Curăță
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="ind-dropdown">
          {filtered.slice(0, 8).map(ind => (
            <button key={ind} type="button" className="ind-option" onClick={() => toggle(ind)}>
              <span>{ind}</span>
              <Icon name="plus" size={12} style={{ opacity: 0.6 }} />
            </button>
          ))}
          {filtered.length > 8 && (
            <div className="ind-more">+{filtered.length - 8} alte rezultate · scrie pentru a filtra</div>
          )}
        </div>
      )}
      {open && filtered.length === 0 && query && (
        <div className="ind-dropdown"><div className="ind-empty">Nicio industrie nu se potrivește cu „{query}"</div></div>
      )}
    </div>
  );
}

function TermsModal({ open, onClose, onAccept }) {
  if (!open) return null;
  return (
    <div className="reg-modal-backdrop" onClick={onClose}>
      <div className="reg-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="reg-modal-head">
          <div>
            <div className="page-eyebrow" style={{ marginBottom: 4 }}>Document legal</div>
            <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 22, color: 'var(--fg-0)', fontWeight: 400, margin: 0 }}>
              Termenii și Condițiile ESCRO
            </h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Închide">
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="reg-modal-body">
          <div className="terms-section">
            <div className="terms-num">01</div>
            <div>
              <div className="terms-h">Servicii oferite</div>
              <p>ESCRO operează o platformă de escrow între prestatori (PFA, SRL) și beneficiari pentru servicii profesionale. Fondurile sunt depozitate în conturi escrow segregate la o bancă reglementată BNR până la îndeplinirea milestone-urilor.</p>
            </div>
          </div>
          <div className="terms-section">
            <div className="terms-num">02</div>
            <div>
              <div className="terms-h">Verificare KYC</div>
              <p>Toți prestatorii trec prin verificare KYC (CI + CUI ANAF) înainte de a primi proiecte. Beneficiarii sunt verificați la prima depunere.</p>
            </div>
          </div>
          <div className="terms-section">
            <div className="terms-num">03</div>
            <div>
              <div className="terms-h">Comision platformă</div>
              <p>Aplicat din valoarea brută a milestone-ului. Fără taxe de înscriere, fără abonamente.</p>
            </div>
          </div>
          <div className="terms-section">
            <div className="terms-num">04</div>
            <div>
              <div className="terms-h">Arbitraj 48h</div>
              <p>În caz de dispută, un panel de arbitri (cu acoperire legală RO) emite o decizie în maximum 48 ore lucrătoare. Decizia este finală și executorie pe platformă.</p>
            </div>
          </div>
          <div className="terms-section">
            <div className="terms-num">05</div>
            <div>
              <div className="terms-h">Protecția datelor (GDPR)</div>
              <p>Datele tale sunt stocate criptat pe servere UE. Poți solicita oricând export sau ștergere. Nu vindem și nu cedăm date terților.</p>
            </div>
          </div>
        </div>
        <div className="reg-modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Anulează</button>
          <Link to="/terms" target="_blank" className="btn btn-secondary">
            <Icon name="external-link" size={13} /> Vezi document complet
          </Link>
          <button className="btn btn-primary" onClick={() => { onAccept(); onClose(); }}>
            <Icon name="check" size={14} />
            Am citit și accept
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const urlRef = useMemo(() => searchParams.get('ref') || '', [searchParams]);

  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'expert',
    company: '',
    cui: '',
    industries: [],
    expertise: '',
    experience: '',
    acceptTerms: false,
    referral_code: urlRef,
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  useEffect(() => {
    if (urlRef) setForm(prev => ({ ...prev, referral_code: urlRef }));
  }, [urlRef]);

  const isPrestator = form.role === 'expert' || form.role === 'company';

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const onChange = (e) => set(e.target.name, e.target.value);
  const onPhone = (e) => set('phone', formatPhoneAsTyped(e.target.value));

  // Per-field validity (used for submit gate)
  const v = useMemo(() => ({
    firstName: validateName(form.firstName),
    lastName: validateName(form.lastName),
    email: validateEmail(form.email),
    phone: validatePhone(form.phone),
    password: passwordStrength(form.password),
    cui: validateCUI(form.cui),
    company: { ok: form.company.trim().length >= 2 },
    experience: { ok: form.experience !== '' && Number(form.experience) >= 0 },
    industries: { ok: form.industries.length > 0 },
    expertise: { ok: form.expertise.trim().length >= 30 },
  }), [form]);

  const personalOk = v.firstName.ok && v.lastName.ok && v.email.ok && v.phone.ok && v.password.ok;
  const businessOk = !isPrestator || (v.company.ok && v.cui.ok && (form.role !== 'expert' || v.experience.ok));
  const activityOk = !isPrestator || (v.industries.ok && v.expertise.ok);
  const allOk = personalOk && businessOk && activityOk && form.acceptTerms;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!allOk) {
      setError('Completează corect toate câmpurile obligatorii și acceptă Termenii.');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...form,
        industry: form.industries.join(', '),
        name: `${form.firstName} ${form.lastName}`.trim(),
      };
      delete submitData.industries;

      const response = await authAPI.register(submitData);
      login(response.data.user, response.data.token);
      localStorage.setItem('referralCode', response.data.user.referral_code || '');
      navigate(
        form.role === 'expert' ? '/expert/dashboard'
          : form.role === 'individual' ? '/individual/dashboard'
            : '/company/dashboard'
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Înregistrare eșuată');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left — brand */}
      <div className="auth-panel-l">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.625rem', position: 'relative', zIndex: 1 }}>
          <div className="escro-brand-mark">E</div>
          <div className="escro-brand-name" style={{ fontSize: 16 }}>ESCRO<span className="dot" /></div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1, maxWidth: 480 }}>
          <div className="page-eyebrow">Infrastructură de încredere B2B</div>
          <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 46, letterSpacing: '-0.03em', lineHeight: 1.04, color: 'var(--fg-0)', marginBottom: '1rem', fontWeight: 400 }}>
            Înregistrează-te.<br />
            <em style={{ color: 'var(--accent-hi)', fontStyle: 'italic' }}>Plătești după livrare.</em>
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--fg-2)', marginBottom: '2.5rem', maxWidth: 380 }}>
            Banii sunt blocați în escrow până când milestone-urile sunt aprobate. Contracte cu valoare legală. Arbitraj în 48h.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
            {[
              { v: '850+', l: 'Experți KYC' },
              { v: '12.4M', l: 'RON 2025' },
              { v: '48h', l: 'Arbitraj' },
            ].map((s, i) => (
              <div key={i} style={{ borderLeft: '2px solid var(--accent-border)', paddingLeft: '0.875rem' }}>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 22, fontWeight: 700, color: 'var(--fg-0)', letterSpacing: '-0.02em' }}>{s.v}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>

          <div className="trust-list">
            {[
              { i: 'shield-check', t: 'Conturi escrow la bancă reglementată BNR' },
              { i: 'document', t: 'Contracte cu semnătură digitală calificată' },
              { i: 'spark', t: '+15 puncte Trust cu cod de referință' },
            ].map((it, i) => (
              <div key={i} className="trust-item">
                <Icon name={it.i} size={14} />
                <span>{it.t}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, padding: '1rem 1.125rem', background: 'var(--bg-card)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'flex-start', gap: '.875rem' }}>
          <div className="avatar sm rose">ER</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, color: 'var(--fg-1)', fontStyle: 'italic', lineHeight: 1.5, fontFamily: 'var(--f-display)' }}>
              „Am eliminat plățile în avans fără garanție. ESCRO ne-a salvat două proiecte mari."
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: '.375rem' }}>Elena Rădulescu · Product Lead</div>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="auth-panel-r">
        <form className="reg-form" onSubmit={handleSubmit} noValidate>
          {/* Mobile brand */}
          <div className="reg-mobile-brand">
            <div className="escro-brand-mark">E</div>
            <div className="escro-brand-name">ESCRO<span className="dot" /></div>
          </div>

          <div className="reg-head">
            <div className="page-eyebrow">Cont nou</div>
            <h2 className="reg-title">
              Creează cont <em>ESCRO</em>
            </h2>
            <p className="reg-sub">
              Ai deja cont?{' '}
              <Link to="/login" style={{ color: 'var(--accent-hi)', fontWeight: 600 }}>
                Conectează-te
              </Link>
            </p>
          </div>

          {error && (
            <div className="reg-banner reg-banner-err">
              <Icon name="alert" size={14} />
              <span>{error}</span>
            </div>
          )}

          {urlRef && (
            <div className="reg-banner reg-banner-ok">
              <Icon name="gift" size={14} />
              <span>Te-ai înregistrat cu un cod referință — <strong>+15 puncte Trust</strong> la primul proiect.</span>
            </div>
          )}

          {/* ─── 01. Tip cont ─── */}
          <section className="reg-section">
            <div className="reg-section-h">
              <div className="reg-section-num">01</div>
              <div>
                <div className="reg-section-title">Ce tip de cont creezi?</div>
                <div className="reg-section-sub">Poți schimba mai târziu doar prin solicitare către suport.</div>
              </div>
            </div>
            <div className="role-grid">
              {ROLES.map(r => (
                <RoleCard key={r.id} role={r} selected={form.role === r.id} onSelect={(id) => set('role', id)} />
              ))}
            </div>
          </section>

          {/* ─── 02. Date personale ─── */}
          <section className="reg-section">
            <div className="reg-section-h">
              <div className="reg-section-num">02</div>
              <div>
                <div className="reg-section-title">Datele tale</div>
                <div className="reg-section-sub">Folosim email și telefon pentru notificări de escrow.</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '0.875rem' }}>
              <Field label="Prenume" required>
                <ValidatedInput name="firstName" value={form.firstName} onChange={onChange} placeholder="Ion" validate={validateName} />
              </Field>
              <Field label="Nume" required>
                <ValidatedInput name="lastName" value={form.lastName} onChange={onChange} placeholder="Popescu" validate={validateName} />
              </Field>
            </div>
            <Field label="Email" required hint="Va fi folosit pentru login">
              <ValidatedInput name="email" type="email" icon="mail" value={form.email} onChange={onChange} placeholder="nume@firma.ro" validate={validateEmail} />
            </Field>
            <Field label="Telefon" required hint="Format RO">
              <ValidatedInput name="phone" type="tel" icon="phone" value={form.phone} onChange={onPhone} placeholder="+40 7XX XXX XXX" validate={validatePhone} />
            </Field>
            <Field label="Parolă" required hint={`${form.password.length}/8 minim`}>
              <ValidatedInput name="password" type="password" icon="lock" value={form.password} onChange={onChange} placeholder="Cel puțin 8 caractere"
                validate={passwordStrength} />
              <PasswordStrengthBar value={form.password} />
            </Field>
          </section>

          {/* ─── 03. Activitate (only for prestators) ─── */}
          <div className={`disclose ${isPrestator ? 'is-open' : ''}`}>
            <section className="reg-section">
              <div className="reg-section-h">
                <div className="reg-section-num">03</div>
                <div>
                  <div className="reg-section-title">
                    Activitate {form.role === 'company' ? 'companie' : 'profesională'}
                  </div>
                  <div className="reg-section-sub">Necesar pentru verificarea KYC și facturare automată.</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '0.875rem' }}>
                <Field label={form.role === 'company' ? 'Denumire firmă' : 'PFA / SRL'} required>
                  <ValidatedInput name="company" value={form.company} onChange={onChange}
                    placeholder={form.role === 'company' ? 'Firma SRL' : 'Nume PFA sau SRL'}
                    validate={(val) => val.trim().length >= 2 ? { ok: true } : { ok: false, msg: val ? 'Minim 2 caractere' : '' }} />
                </Field>
                <Field label="CUI" required hint="Validare ANAF">
                  <ValidatedInput name="cui" icon="tag" value={form.cui} onChange={onChange}
                    placeholder="RO12345678" validate={validateCUI} />
                </Field>
              </div>

              {form.role === 'expert' && (
                <Field label="Experiență (ani)" required>
                  <ValidatedInput name="experience" type="number" min="0" max="60" value={form.experience} onChange={onChange} placeholder="5"
                    validate={(val) => val === '' ? { ok: false, msg: '' } : { ok: Number(val) >= 0 && Number(val) <= 60, msg: Number(val) > 60 ? 'Max 60 ani' : '' }} />
                </Field>
              )}

              <Field label="Industrii" required hint={form.industries.length > 0 ? `${form.industries.length} selectate` : 'Selectează toate care se aplică'}>
                <IndustriesPicker all={INDUSTRIES} selected={form.industries} onChange={(arr) => set('industries', arr)} />
              </Field>

              <Field label="Descrie pe scurt expertiza ta" required
                hint={`${form.expertise.trim().length}/30 caractere minim`}
                error={form.expertise && form.expertise.trim().length < 30 ? 'Mai scrie puțin — minim 30 caractere' : null}>
                <textarea className="input" rows={3} name="expertise" value={form.expertise} onChange={onChange}
                  placeholder={form.role === 'expert'
                    ? 'Ex: Dezvolt aplicații web cu React și Node.js, specializat în e-commerce și platforme SaaS B2B.'
                    : 'Ex: Firmă de consultanță IT, oferim soluții cloud pentru retail și logistică.'}
                  style={{ resize: 'vertical' }} />
              </Field>
            </section>
          </div>

          {/* ─── Last step ─── */}
          <section className="reg-section">
            <div className="reg-section-h">
              <div className="reg-section-num">{isPrestator ? '04' : '03'}</div>
              <div>
                <div className="reg-section-title">Ultimul pas</div>
                <div className="reg-section-sub">Verifică detaliile și acceptă termenii.</div>
              </div>
            </div>

            {/* Summary card */}
            <div className="summary-card">
              <div className="summary-row">
                <span className="summary-l">Tip cont</span>
                <span className="summary-v">
                  <span className="badge badge-blue no-dot" style={{ paddingLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name={ROLES.find(r => r.id === form.role)?.icon || 'user'} size={11} />
                    {ROLES.find(r => r.id === form.role)?.title || '—'}
                  </span>
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-l">Nume</span>
                <span className="summary-v">{form.firstName || '—'} {form.lastName}</span>
              </div>
              <div className="summary-row">
                <span className="summary-l">Email</span>
                <span className="summary-v" style={{ fontFamily: 'var(--f-mono)', fontSize: 12.5 }}>{form.email || '—'}</span>
              </div>
              {isPrestator && (
                <div className="summary-row">
                  <span className="summary-l">{form.role === 'company' ? 'Firmă' : 'PFA/SRL'} · CUI</span>
                  <span className="summary-v">{form.company || '—'} · <span style={{ fontFamily: 'var(--f-mono)' }}>{form.cui || '—'}</span></span>
                </div>
              )}
              {isPrestator && form.industries.length > 0 && (
                <div className="summary-row">
                  <span className="summary-l">Industrii</span>
                  <span className="summary-v" style={{ textAlign: 'right' }}>
                    {form.industries.slice(0, 3).join(' · ')}
                    {form.industries.length > 3 && <span style={{ color: 'var(--fg-3)' }}> +{form.industries.length - 3}</span>}
                  </span>
                </div>
              )}
            </div>

            {/* Referral block */}
            <div className={`ref-block ${urlRef && form.referral_code === urlRef ? 'ref-valid' : ''}`}>
              <div className="ref-head">
                <span className="ref-label">
                  <Icon name="gift" size={13} />
                  <span>Cod referință</span>
                  {urlRef && <span className="ref-from-url">din link</span>}
                </span>
              </div>
              <div className="ref-input-wrap">
                <input
                  className="ref-input"
                  value={form.referral_code}
                  onChange={(e) => set('referral_code', e.target.value.toUpperCase())}
                  placeholder="EX: ESCRO2025"
                  maxLength={16}
                />
              </div>
            </div>

            {/* Terms checkbox */}
            <label className="terms-check">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={(e) => set('acceptTerms', e.target.checked)}
              />
              <span className="terms-check-box" aria-hidden="true">
                {form.acceptTerms && <Icon name="check" size={11} />}
              </span>
              <span className="terms-check-text">
                Am citit și accept{' '}
                <button type="button" className="terms-link" onClick={() => setTermsOpen(true)}>
                  Termenii și Condițiile
                </button>
                {' '}platformei ESCRO și sunt de acord cu utilizarea datelor mele personale.
              </span>
            </label>
          </section>

          <button type="submit" className={`btn btn-primary btn-lg reg-submit ${!allOk ? 'is-disabled' : ''}`} disabled={loading || !allOk}>
            {loading ? (
              <>
                <span className="reg-spin" /> Se creează contul…
              </>
            ) : (
              <>
                <Icon name="shield-check" size={15} />
                Creează cont · începe în siguranță
              </>
            )}
          </button>

          <p className="reg-foot">
            Continuând accepți{' '}
            <button type="button" className="terms-link" onClick={() => setTermsOpen(true)}>Termenii</button>{' '}și{' '}
            <Link to="/terms" className="terms-link">Politica de confidențialitate</Link>.
          </p>
        </form>
      </div>

      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} onAccept={() => set('acceptTerms', true)} />
    </div>
  );
}
