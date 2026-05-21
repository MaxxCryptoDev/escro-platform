import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

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

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
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
    referral_code: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [referralMessage, setReferralMessage] = useState('');

  const toggleIndustry = (ind) => {
    setFormData(prev => ({
      ...prev,
      industries: prev.industries.includes(ind)
        ? prev.industries.filter(i => i !== ind)
        : [...prev.industries, ind]
    }));
  };

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setFormData(prev => ({ ...prev, referral_code: refCode }));
      setReferralMessage('Vei primi +15 puncte Trust pentru că te-ai înregistrat cu un cod de referință!');
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const isPrestator = formData.role === 'expert' || formData.role === 'company';
    const missingBase = !formData.firstName || !formData.lastName || !formData.phone;
    // Industry/expertise required only for prestators (expert/company); individual skips.
    const missingActivity = isPrestator && (formData.industries.length === 0 || !formData.expertise.trim());
    const missingExpert = formData.role === 'expert' && !formData.experience;
    // Both expert and company are business entities with CUI + denumire
    const missingBusiness = isPrestator && (!formData.company || !formData.cui);
    if (missingBase || missingActivity || missingExpert || missingBusiness) {
      setError(isPrestator
        ? 'Completează toate câmpurile obligatorii (PFA/firmă, CUI, industrii, expertiză).'
        : 'Completează prenume, nume și telefon.');
      return;
    }

    if (!formData.acceptTerms) {
      setError('Trebuie să accepți Termenii și Condițiile');
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        industry: formData.industries.join(', '),
        name: `${formData.firstName} ${formData.lastName}`
      };
      delete submitData.industries;

      const response = await authAPI.register(submitData);
      login(response.data.user, response.data.token);
      localStorage.setItem('referralCode', response.data.user.referral_code || '');
      navigate(
        formData.role === 'expert' ? '/expert/dashboard'
        : formData.role === 'individual' ? '/individual/dashboard'
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
        <div className="row" style={{ gap: '.625rem', position: 'relative', zIndex: 1 }}>
          <div className="escro-brand-mark">E</div>
          <div className="escro-brand-name" style={{ fontSize: 16 }}>ESCRO<span className="dot" /></div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1, maxWidth: 480 }}>
          <div className="page-eyebrow">Infrastructură de încredere B2B</div>
          <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 44, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--fg-0)', marginBottom: '1rem' }}>
            Înregistrează-te în ESCRO.<br />
            <em style={{ color: 'var(--accent-hi)', fontStyle: 'italic' }}>Plăți garantate.</em>
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--fg-2)', marginBottom: '2rem' }}>
            Banii sunt blocați în escrow până când milestone-urile sunt aprobate. Contracte cu valoare legală. Arbitraj în 48h.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[
              { v: '850+', l: 'Experți verificați KYC' },
              { v: '12.4M', l: 'RON procesați în 2025' },
              { v: '48h', l: 'Arbitraj garantat' },
            ].map((s, i) => (
              <div key={i} style={{ borderLeft: '2px solid var(--accent-border)', paddingLeft: '0.875rem' }}>
                <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-0)', letterSpacing: '-0.02em' }}>{s.v}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: '.875rem' }}>
          <div className="avatar sm rose">ER</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--fg-1)', fontStyle: 'italic', lineHeight: 1.5 }}>
              "Am eliminat toate plățile în avans fără garanție. ESCRO ne-a salvat două proiecte."
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: '.25rem' }}>Elena Rădulescu, Product Lead</div>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="auth-panel-r">
        <form style={{ maxWidth: 420, width: '100%' }} onSubmit={handleSubmit}>
          <div className="page-eyebrow">Înregistrare</div>
          <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 28, letterSpacing: '-0.02em', color: 'var(--fg-0)', marginBottom: '.5rem' }}>
            Creează un cont
          </h2>
          <p className="muted" style={{ marginBottom: '1.5rem', fontSize: 13.5 }}>
            Ai deja cont?{' '}
            <Link to="/login" style={{ color: 'var(--accent-hi)', fontWeight: 600 }}>Conectează-te</Link>
          </p>

          {error && (
            <div style={{ padding: '.75rem 1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {referralMessage && (
            <div style={{ padding: '.75rem 1rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--r-sm)', color: 'var(--success-color)', fontSize: 13, marginBottom: '1rem' }}>
              {referralMessage}
            </div>
          )}

          {/* Role selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.625rem', marginBottom: '.875rem' }}>
            {[
              { id: 'expert', label: 'Expert', sub: 'PFA/SRL · prestez' },
              { id: 'company', label: 'Companie', sub: 'SRL · prestez' },
              { id: 'individual', label: 'Persoană fizică', sub: 'Doar plătesc servicii' },
            ].map(r => (
              <button key={r.id} type="button"
                style={{ padding: '.65rem .5rem', borderRadius: 'var(--r-sm)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                  background: formData.role === r.id ? 'var(--accent-bg)' : 'var(--bg-card)',
                  border: `2px solid ${formData.role === r.id ? 'var(--accent)' : 'var(--border-2)'}`,
                  color: formData.role === r.id ? 'var(--accent-hi)' : 'var(--fg-2)', textAlign: 'center' }}
                onClick={() => setFormData(p => ({ ...p, role: r.id }))}>
                <div>{r.label}</div>
                <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.75, marginTop: 2 }}>{r.sub}</div>
              </button>
            ))}
          </div>

          {/* Prenume + Nume */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '.875rem' }}>
            <div>
              <label className="label">Prenume</label>
              <input
                className="input"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Ion"
                required
              />
            </div>
            <div>
              <label className="label">Nume</label>
              <input
                className="input"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Popescu"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: '.875rem' }}>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="nume@firma.ro"
              required
            />
          </div>

          {/* Telefon */}
          <div style={{ marginBottom: '.875rem' }}>
            <label className="label">Telefon</label>
            <input
              className="input"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+40 7xx xxx xxx"
              required
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '.875rem' }}>
            <label className="label">Parolă</label>
            <input
              className="input"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••••"
              required
            />
          </div>

          {/* Business fields — required for expert (PFA/SRL) and company (SRL); individual skips */}
          {(formData.role === 'company' || formData.role === 'expert') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '.875rem' }}>
              <div>
                <label className="label">{formData.role === 'company' ? 'Denumire firmă' : 'PFA / SRL'}</label>
                <input
                  className="input"
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder={formData.role === 'company' ? 'Firma SRL' : 'Nume PFA sau SRL'}
                  required
                />
              </div>
              <div>
                <label className="label">CUI</label>
                <input
                  className="input"
                  type="text"
                  name="cui"
                  value={formData.cui}
                  onChange={handleChange}
                  placeholder="Ex: 12345678 sau RO12345678"
                  required
                />
              </div>
            </div>
          )}

          {/* Expert-specific: experience years */}
          {formData.role === 'expert' && (
            <div style={{ marginBottom: '.875rem' }}>
              <label className="label">Experiență (ani)</label>
              <input
                className="input"
                type="number"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                placeholder="Ex: 5"
                min="0"
                required
              />
            </div>
          )}

          {/* Cu ce te ocupi — industries + expertise (only for prestators: expert/company) */}
          {formData.role !== 'individual' && (<>
          <div style={{ marginBottom: '.875rem' }}>
            <label className="label">
              Industrii — selectează toate care se aplică
              <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--fg-3)', fontWeight: 400 }}>
                {formData.industries.length > 0 ? `· ${formData.industries.length} selectate` : ''}
              </span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', padding: '.5rem', border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)', background: 'var(--bg-card)', maxHeight: 180, overflowY: 'auto' }}>
              {INDUSTRIES.map(ind => {
                const on = formData.industries.includes(ind);
                return (
                  <button
                    type="button"
                    key={ind}
                    onClick={() => toggleIndustry(ind)}
                    style={{
                      padding: '.25rem .65rem', fontSize: 11.5, fontWeight: on ? 600 : 400,
                      background: on ? 'var(--accent)' : 'var(--bg-1)',
                      color: on ? '#fff' : 'var(--fg-2)',
                      border: on ? '1px solid var(--accent)' : '1px solid var(--border-2)',
                      borderRadius: 100, cursor: 'pointer', transition: 'all 0.12s',
                    }}
                  >{ind}</button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: '.875rem' }}>
            <label className="label">Expertiză — descrie pe scurt</label>
            <textarea
              className="input"
              rows={3}
              name="expertise"
              value={formData.expertise}
              onChange={handleChange}
              placeholder={formData.role === 'expert'
                ? 'Ex: Dezvolt aplicații web cu React și Node.js, specializat în e-commerce și platforme SaaS.'
                : 'Ex: Firmă de consultanță IT, oferim soluții cloud pentru retail și logistică.'}
              required
              style={{ resize: 'vertical', fontSize: 13, lineHeight: 1.6 }}
            />
          </div>
          </>)}

          {/* Referral code */}
          <div style={{ marginBottom: '.875rem' }}>
            {formData.referral_code && searchParams.get('ref') ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <label className="label" style={{ margin: 0 }}>Cod referință</label>
                <span style={{ marginLeft: '.5rem', padding: '.2rem .6rem', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--accent-hi)', fontWeight: 600 }}>
                  {formData.referral_code}
                </span>
              </div>
            ) : (
              <div>
                <label className="label" style={{ fontSize: 12, color: 'var(--fg-3)' }}>Cod referință (opțional)</label>
                <input
                  className="input"
                  type="text"
                  name="referral_code"
                  value={formData.referral_code}
                  onChange={handleChange}
                  placeholder="Introdu codul dacă ai unul"
                  style={{ fontSize: 13 }}
                />
              </div>
            )}
          </div>

          {/* Terms checkbox */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.5rem', marginBottom: '.875rem' }}>
            <input
              type="checkbox"
              id="terms"
              checked={formData.acceptTerms}
              onChange={(e) => setFormData(prev => ({ ...prev, acceptTerms: e.target.checked }))}
              style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--accent)' }}
              required
            />
            <label htmlFor="terms" style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.5, cursor: 'pointer' }}>
              Am citit și accept{' '}
              <Link to="/terms" target="_blank" style={{ color: 'var(--accent-hi)' }}>Termenii și Condițiile</Link>
              {' '}platformei ESCRO și sunt de acord cu utilizarea datelor mele personale.
            </label>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '1.5rem' }} disabled={loading}>
            {loading ? 'Se creează contul...' : 'Creează cont'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: 13, color: 'var(--fg-3)' }}>
            Ai deja cont?{' '}
            <Link to="/login" style={{ color: 'var(--accent-hi)', fontWeight: 600 }}>Conectează-te</Link>
          </p>

          <p style={{ fontSize: 11, color: 'var(--fg-3)', textAlign: 'center', marginTop: '.75rem' }}>
            Continuând accepți{' '}
            <Link to="/terms" style={{ color: 'var(--fg-2)' }}>Termenii</Link>{' '}și{' '}
            <Link to="/terms" style={{ color: 'var(--fg-2)' }}>Politica de confidențialitate</Link>.
          </p>
        </form>
      </div>
    </div>
  );
}
