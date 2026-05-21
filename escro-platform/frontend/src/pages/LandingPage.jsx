import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Icon } from '../components/ui';
import '../styles/LandingPage.css';

const fmtRon = (n) => {
  if (!n) return null;
  if (n >= 1_000_000) return { num: (n / 1_000_000).toFixed(1).replace('.0', ''), unit: 'mil. RON' };
  if (n >= 1_000) return { num: (n / 1_000).toFixed(1).replace('.0', '') + 'K', unit: 'RON' };
  return { num: String(Math.round(n)), unit: 'RON' };
};

const HERO = {
  pill: 'Plată sigură pentru servicii',
  h1Pre: 'Banii tăi stau la noi.',
  h1Em: 'Pleacă doar când e treaba gata.',
  sub: 'Spune-ne de ce ai nevoie. Îți recomandăm direct expertul potrivit — nu cauți printre mii de profile. Banii stau în siguranță la noi până când treaba e gata.',
  cta1: 'Începe gratuit',
  cta2: 'Vezi cum funcționează',
  trust: ['Fără card la înregistrare', 'Plătești doar la final', 'Răspuns uman în 48h'],
};

const NAV_LINKS = { how: 'Cum funcționează', who: 'Pentru cine', pricing: 'Cât costă', faq: 'Întrebări' };

const STEPS = [
  { icon: 'edit', tag: '~2 minute', n: '01', title: 'Spui ce vrei', desc: 'Scrii ce ai nevoie, când îl vrei și cât oferi. Împărți munca pe pași dacă e proiect mai mare.' },
  { icon: 'people', tag: 'Matching uman', n: '02', title: 'Îți recomandăm omul potrivit', desc: 'Nu cauți tu printre mii de profile. Discutăm cu tine despre nevoia exactă și îți recomandăm direct expertul care chiar poate face treaba — am vorbit cu fiecare, le știm punctele forte.' },
  { icon: 'lock', tag: 'Banii blocați', n: '03', title: 'Depui banii în siguranță', desc: 'Plătești cu cardul. Banii NU ajung la expert — stau într-un cont separat, gestionat de Stripe.' },
  { icon: 'check-circle', tag: 'Un click', n: '04', title: 'Aprobi, plata pleacă', desc: 'Verifici lucrarea. Dacă e bună, apeși "Aprobă" și banii merg automat. Dacă nu, deschidem o dispută.' },
];

const TRUST_CARDS = [
  { icon: 'wallet', title: 'Banii stau separat', desc: 'Nu în contul nostru. În conturi escrow gestionate de Stripe — același care procesează plăți pentru Uber, Booking și Glovo.', meta: 'Powered by Stripe' },
  { icon: 'doc', title: 'Contract automat', desc: 'La fiecare lucrare se generează un contract cu valoare legală, semnat electronic. Documentul îți rămâne ție, oricând îl poți descărca.', meta: 'Validat legal RO/UE' },
  { icon: 'people', title: 'Matching făcut de oameni', desc: 'Nu te lăsăm să cauți singur. Discutăm nevoia ta, înțelegem contextul, recomandăm expertul potrivit. Pe toți i-am verificat (KYC + interviu) — le știm punctele forte și unde au livrat.', meta: 'Recomandare directă' },
  { icon: 'scale', title: 'Decizie umană', desc: 'Dacă apar neînțelegeri, echipa noastră se uită la mesaje, livrabile și contract. Decizie în maxim 48 de ore. Fără ping-pong.', meta: 'Răspuns < 48h' },
];

const FOR_WHO = [
  {
    tag: 'Pentru cine angajează',
    title: 'Primești ce-ai cerut. Sau primești banii înapoi.',
    sub: 'Gata cu plățile în avans care dispar. Cu ESCRO controlezi când și pentru ce eliberezi fiecare leu.',
    list: [
      'Primești recomandarea expertului potrivit, fără să cauți tu',
      'Plătești pe pași — nu tot dintr-o dată',
      'Aprobi tu fiecare etapă, înainte ca banii să plece',
      'Dacă livrarea nu e bună, deschidem o dispută în 30 secunde',
    ],
    cta: 'Vreau o recomandare',
    iconTag: 'people',
  },
  {
    alt: true,
    tag: 'Pentru cine prestează',
    title: 'Banii există înainte să începi lucrul.',
    sub: 'Niciun client care „te plătește săptămâna viitoare". Verificăm că banii sunt depuși înainte de prima oră de muncă.',
    list: [
      'Banii sunt blocați înainte să accepți proiectul',
      'Sistem de reputație care îți crește valoarea în timp',
      'Contracte care te protejează legal, nu doar pe hârtie',
      'Plata pleacă automat la aprobare, fără să o ceri',
    ],
    cta: 'Sunt expert, vreau lucrări',
    iconTag: 'briefcase',
  },
];

const PRICING_LIST = [
  { t: 'Înregistrarea e gratuită', s: 'Fără card cerut. Fără perioadă de probă cronometrată.' },
  { t: 'Nu plătești nimic în plus', s: 'Fără abonament lunar, fără taxe ascunse, fără reînnoiri.' },
  { t: 'Plătești doar dacă lucrarea reușește', s: 'Comisionul se reține din suma eliberată expertului — niciodată separat.' },
];

const TESTS = [
  { quote: 'Am angajat 4 freelanceri prin alte platforme și am pierdut bani la 2. Cu ESCRO știu exact ce și când eliberez. Mai sigur decât transferul direct.', name: 'Alexandra Ionescu', role: 'Founder, MarketingLab', av: 'AI' },
  { quote: 'Lucrez ca dezvoltator freelance de 7 ani. ESCRO e prima platformă care îmi garantează că banii există înainte să accept. Asta e tot ce-mi trebuia.', name: 'Mihai Pop', role: 'Senior Developer', av: 'MP', avClass: 'green' },
  { quote: 'Am rulat un audit de securitate de 80.000 RON pe milestone-uri. Zero stres pe partea financiară — tot procesul transparent, totul documentat.', name: 'Cristina Stanciu', role: 'CTO, Fintech RO', av: 'CS', avClass: 'violet' },
];

const FAQ_ITEMS = [
  { q: 'Unde stau banii mei până la finalizare?', a: 'Banii sunt depozitați în conturi escrow separate, gestionate de Stripe — același procesator folosit de Uber, Booking sau Glovo. Nu ajung niciodată în contul nostru operațional. Sunt protejați chiar și dacă platforma noastră ar dispărea mâine.' },
  { q: 'Ce se întâmplă dacă nu sunt mulțumit de lucrare?', a: 'Apeși butonul "Deschide dispută" direct din proiect. Echipa noastră se uită la mesaje, livrabile și contract și ia o decizie în maxim 48 de ore. Banii sunt eliberați sau returnați în funcție de ce decidem. Nu există presiune — fiecare dispută e analizată de un om, nu de un algoritm.' },
  { q: 'Cât costă să folosesc ESCRO?', a: 'Înregistrarea e gratuită și rămâne așa. Singurul cost este un comision de 10% reținut din suma eliberată expertului, doar când o lucrare se finalizează cu succes. Nu există abonamente, taxe de listare sau alte costuri ascunse.' },
  { q: 'Pot folosi ESCRO pentru servicii fizice (renovări, livrări, etc)?', a: 'Da. Orice colaborare comercială care poate fi împărțită în etape cu condiții clare de acceptare poate fi gestionată prin ESCRO. De la dezvoltare software la zugrăvit apartament, de la consultanță fiscală la sesiuni foto.' },
  { q: 'Aleg eu expertul sau îmi recomandați voi?', a: 'Noi îți recomandăm. Spui ce ai nevoie, vorbim cu tine ca să înțelegem contextul, și îți facem o recomandare directă — expertul potrivit pentru proiectul tău. Nu te lăsăm să cauți printre mii de profile. Pe toți experții i-am verificat în prealabil (KYC prin Stripe, portofoliu, interviu) și am vorbit personal cu ei — le știm stilul de lucru și unde excelează.' },
  { q: 'Cât durează să primesc banii dacă sunt expert?', a: 'În momentul în care clientul aprobă o etapă, plata pleacă automat și ajunge în contul tău bancar în 2-3 zile lucrătoare (procesare standard Stripe). Nu trebuie să facturezi nimic în avans și nu trebuie să suni pe nimeni.' },
];

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="ESCRO">
      <div className="brand-mark">E</div>
      <span className="brand-name">escro<span className="dot"></span></span>
    </Link>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.classList.toggle('no-scroll', open);
    return () => document.body.classList.remove('no-scroll');
  }, [open]);

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Brand />
          <div className="nav-links">
            <a href="#cum" className="nav-link">{NAV_LINKS.how}</a>
            <a href="#pentru" className="nav-link">{NAV_LINKS.who}</a>
            <a href="#pret" className="nav-link">{NAV_LINKS.pricing}</a>
            <a href="#faq" className="nav-link">{NAV_LINKS.faq}</a>
          </div>
          <div className="nav-cta">
            <Link to="/login" className="btn btn-ghost">Intră în cont</Link>
            <Link to="/register" className="btn btn-primary">
              Începe gratuit <Icon name="arrow-right" size={14} />
            </Link>
            <button className="hamburger" onClick={() => setOpen(v => !v)} aria-label="Meniu">
              <Icon name={open ? 'x' : 'menu'} size={20} />
            </button>
          </div>
        </div>
      </nav>
      <div className={`mobile-menu ${open ? 'open' : ''}`}>
        <a href="#cum" onClick={() => setOpen(false)}>{NAV_LINKS.how} <Icon name="arrow-right" size={14} /></a>
        <a href="#pentru" onClick={() => setOpen(false)}>{NAV_LINKS.who} <Icon name="arrow-right" size={14} /></a>
        <a href="#pret" onClick={() => setOpen(false)}>{NAV_LINKS.pricing} <Icon name="arrow-right" size={14} /></a>
        <a href="#faq" onClick={() => setOpen(false)}>{NAV_LINKS.faq} <Icon name="arrow-right" size={14} /></a>
        <Link to="/login" className="btn btn-secondary" onClick={() => setOpen(false)}>Intră în cont</Link>
        <Link to="/register" className="btn btn-primary" onClick={() => setOpen(false)}>
          Începe gratuit <Icon name="arrow-right" size={14} />
        </Link>
      </div>
    </>
  );
}

function FlowDemo() {
  const stages = [
    { icon: 'edit', step: 'Pasul 1', label: 'Sara publică „Site de prezentare cabinet"', amt: '8.500' },
    { icon: 'lock', step: 'Pasul 2', label: 'Sara depune banii. Stau în siguranță.', amt: '8.500' },
    { icon: 'briefcase', step: 'Pasul 3', label: 'Andrei (expert) livrează site-ul în 5 zile', amt: '8.500' },
    { icon: 'check-circle', step: 'Pasul 4', label: 'Sara aprobă. Andrei primește banii.', amt: '8.500' },
  ];
  const [stage, setStage] = useState(0);
  const [auto, setAuto] = useState(true);
  const timerRef = useRef();

  useEffect(() => {
    if (!auto) return;
    timerRef.current = setTimeout(() => {
      setStage(s => (s + 1) % (stages.length + 1));
    }, stage === stages.length ? 1800 : 2200);
    return () => clearTimeout(timerRef.current);
  }, [stage, auto, stages.length]);

  const restart = () => {
    clearTimeout(timerRef.current);
    setStage(0);
    setAuto(true);
  };

  const getState = (i) => {
    const s = stage >= stages.length ? stages.length : stage;
    if (i < s) return 'done';
    if (i === s) return 'active';
    return 'pending';
  };

  return (
    <div className="flow-demo">
      <div className="flow-head">
        <div className="flow-title">
          <span className="live-dot"></span>
          Exemplu live: cum funcționează
        </div>
        <button className="flow-restart" onClick={restart} aria-label="Restart">
          <Icon name="restart" size={11} />
          Restart
        </button>
      </div>

      {stages.map((s, i) => {
        const state = getState(i);
        return (
          <div key={i}>
            <div className={`flow-stage ${state}`}>
              <div className="flow-row">
                <div className="flow-icon">
                  {state === 'done'
                    ? <Icon name="check" size={18} />
                    : <Icon name={s.icon} size={17} />}
                </div>
                <div className="flow-text">
                  <div className="flow-step">{s.step}</div>
                  <div className="flow-label">{s.label}</div>
                </div>
                <div className="flow-amt">
                  {state === 'done'
                    ? <><em>+</em>{s.amt}<span style={{ fontSize: 14, color: 'var(--fg-3)' }}> RON</span></>
                    : state === 'pending'
                      ? <span style={{ opacity: 0.4 }}>— RON</span>
                      : <>{s.amt}<span style={{ fontSize: 14, color: 'var(--fg-3)' }}> RON</span></>}
                </div>
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="flow-connector" style={{ '--fill': i < stage ? 1 : 0 }} />
            )}
          </div>
        );
      })}

      <div className="flow-foot">
        <div className="flow-foot-l">
          {stage === stages.length
            ? <>✓ Lucrare finalizată. <strong>Sara are site, Andrei are banii.</strong> Nimeni nu a riscat.</>
            : <>Banii rămân blocați la fiecare pas. <strong>Eliberare doar la aprobarea ta.</strong></>}
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg"></div>
      <div className="hero-grid-bg"></div>
      <div className="wrap hero-inner">
        <div>
          <div className="hero-pill">
            <span className="pulse"></span>
            {HERO.pill}
          </div>
          <h1 className="h-display hero-h1">
            {HERO.h1Pre}<br />
            <em>{HERO.h1Em}</em>
          </h1>
          <p className="hero-sub">{HERO.sub}</p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary btn-lg">
              {HERO.cta1} <Icon name="arrow-right" size={16} />
            </Link>
            <a href="#cum" className="btn btn-secondary btn-lg">
              <Icon name="play" size={14} /> {HERO.cta2}
            </a>
          </div>
          <div className="hero-trust">
            {HERO.trust.map((t, i) => (
              <div key={i} className="hero-trust-item">
                <Icon name="check" size={14} strokeWidth={2.4} />
                {t}
              </div>
            ))}
          </div>
        </div>
        <FlowDemo />
      </div>
    </section>
  );
}

function Stats({ platformStats }) {
  const items = [
    {
      raw: platformStats?.verified_experts,
      fallback: { num: '850', prefix: 'peste' },
      label: 'Experți verificați',
    },
    {
      raw: platformStats?.completed_projects,
      fallback: { num: '2.500', prefix: 'peste' },
      label: 'Lucrări finalizate',
    },
    {
      raw: platformStats?.total_volume_ron,
      fallback: { num: '12,4', unit: 'mil. RON' },
      label: 'Banii protejați',
      formatted: true,
    },
    {
      raw: null,
      fallback: { num: '48', unit: 'ore' },
      label: 'Răspuns dispute',
    },
  ];

  return (
    <section className="stats">
      <div className="wrap">
        <div className="stats-inner">
          {items.map((s, i) => {
            let prefix = s.fallback.prefix;
            let num = s.fallback.num;
            let unit = s.fallback.unit;
            if (s.raw != null) {
              if (s.formatted) {
                const f = fmtRon(s.raw);
                if (f) { num = f.num; unit = f.unit; prefix = undefined; }
              } else {
                num = String(s.raw);
                prefix = undefined;
              }
            }
            return (
              <div key={i} className="stat-item">
                <div className="stat-num">
                  {prefix && <span className="num-unit">{prefix} </span>}
                  <em>{num}</em>
                  {unit && <span className="num-unit"> {unit}</span>}
                </div>
                <div className="stat-label">{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SectionHead({ eyebrow, title, sub }) {
  const parts = title.split('.');
  return (
    <div className="section-head">
      <span className="eyebrow"><span className="dot"></span>{eyebrow}</span>
      <h2 className="h-section">{parts[0]}<em>.{parts.slice(1).join('.')}</em></h2>
      {sub && <p className="lede">{sub}</p>}
    </div>
  );
}

function How() {
  return (
    <section className="section" id="cum">
      <div className="wrap">
        <SectionHead
          eyebrow="Cum funcționează"
          title="Patru pași. Niciun risc."
          sub="Construit pentru oameni, nu pentru contabili. Procesul e clar de la primul click până la ultima plată."
        />
        <div className="steps-grid">
          {STEPS.map((s) => (
            <div key={s.n} className="step-card">
              <div className="step-num">{s.n}</div>
              <div className="step-icon"><Icon name={s.icon} size={22} /></div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
              <span className="step-tag"><Icon name="check" size={11} strokeWidth={2.4} />{s.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section className="section trust-section">
      <div className="wrap">
        <SectionHead
          eyebrow="De ce să ai încredere"
          title="Patru garanții care contează."
          sub="Nu vorbe. Mecanisme concrete, verificabile, în spatele fiecărui leu pe care îl pui aici."
        />
        <div className="trust-grid">
          {TRUST_CARDS.map((c, i) => (
            <div key={i} className="trust-card">
              <div className="icon-wrap"><Icon name={c.icon} size={20} /></div>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
              <div className="trust-meta">— {c.meta}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForWho() {
  return (
    <section className="section" id="pentru">
      <div className="wrap">
        <SectionHead
          eyebrow="Pentru cine"
          title="Două părți. O singură certitudine."
          sub="Indiferent că plătești sau încasezi, lucrezi cu siguranța că celălalt va face ce-a promis."
        />
        <div className="forwho-grid">
          {FOR_WHO.map((c, i) => {
            const parts = c.title.split('.');
            return (
              <div key={i} className={`forwho-card ${c.alt ? 'alt' : ''}`}>
                <span className="forwho-tag"><Icon name={c.iconTag} size={12} />{c.tag}</span>
                <h3 className="forwho-title">{parts[0]}<em>.{parts.slice(1).join('.')}</em></h3>
                <p className="forwho-sub">{c.sub}</p>
                <ul className="forwho-list">
                  {c.list.map((li, j) => (
                    <li key={j}><Icon name="check" size={16} strokeWidth={2.5} />{li}</li>
                  ))}
                </ul>
                <Link to="/register" className="btn btn-primary btn-lg">
                  {c.cta} <Icon name="arrow-right" size={15} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section className="pricing-strip" id="pret">
      <div className="pricing-inner">
        <div>
          <div className="pricing-cap">
            <span className="eyebrow"><span className="dot"></span>Preț transparent</span>
          </div>
          <h2 className="h-section" style={{ marginBottom: 20 }}>
            Un comision<em>. Plătit doar la final.</em>
          </h2>
          <div className="pricing-amount">
            <em>5</em><span className="pricing-pct">%</span>
          </div>
          <div style={{
            marginTop: 10,
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            letterSpacing: '0.08em',
            color: 'var(--fg-3)',
            textTransform: 'uppercase',
          }}>
            COMISION UNIC · doar la finalizare
          </div>
        </div>
        <ul className="pricing-list">
          {PRICING_LIST.map((p, i) => (
            <li key={i}>
              <Icon name="check-circle" size={20} />
              <div>
                <div style={{ color: 'var(--fg-0)', fontWeight: 500 }}>{p.t}</div>
                <small>{p.s}</small>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Tests() {
  return (
    <section className="section section-tight">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow"><span className="dot"></span>Ce spun cei care folosesc</span>
          <h2 className="h-section">Încrederea se câștigă proiect cu proiect.</h2>
        </div>
        <div className="tests-grid">
          {TESTS.map((t, i) => (
            <div key={i} className="test-card">
              <div className="test-quote">{t.quote}</div>
              <div className="test-meta">
                <div className={`test-avatar ${t.avClass || ''}`}>{t.av}</div>
                <div>
                  <div className="test-name">{t.name}</div>
                  <div className="test-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className="section" id="faq">
      <div className="wrap faq-wrap">
        <div>
          <span className="eyebrow"><span className="dot"></span>FAQ</span>
          <h2 className="h-section" style={{ marginTop: 12, marginBottom: 14 }}>
            Întrebări care apar des<em>.</em>
          </h2>
          <p className="lede">Nu găsești răspunsul? Scrie-ne la contact@escro.ro și răspundem în câteva ore.</p>
        </div>
        <div className="faq-list">
          {FAQ_ITEMS.map((f, i) => (
            <div key={i} className={`faq-item ${open === i ? 'open' : ''}`}>
              <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                <span>{f.q}</span>
                <span className="faq-q-icon"><Icon name="plus" size={13} strokeWidth={2.4} /></span>
              </button>
              <div className="faq-a">
                <div className="faq-a-inner">{f.a}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTAFinal() {
  return (
    <section className="cta-final">
      <div className="cta-inner">
        <span className="eyebrow"><span className="dot"></span>Începe acum</span>
        <h2 className="cta-title">Următoarea ta colaborare poate fi sigură<em>.</em></h2>
        <p className="cta-sub">Înregistrarea durează un minut. Nu îți cerem card. Plătești doar când totul iese cum trebuie.</p>
        <div className="cta-actions">
          <Link to="/register" className="btn btn-primary btn-lg">
            Creează cont gratuit <Icon name="arrow-right" size={16} />
          </Link>
          <Link to="/login" className="btn btn-secondary btn-lg">Am deja cont</Link>
        </div>
        <div className="cta-fine">Fără card · Fără abonament · Fără surprize</div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <Brand />
            <p>Plată sigură pentru servicii. București · 2026. Făcută cu grijă în România.</p>
          </div>
          <div className="footer-col">
            <h4>Platformă</h4>
            <a href="#cum">Cum funcționează</a>
            <a href="#pentru">Pentru cine</a>
            <a href="#pret">Preț</a>
            <a href="#faq">Întrebări</a>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <Link to="/terms">Termeni și Condiții</Link>
            <a href="#">Confidențialitate</a>
            <a href="#">GDPR</a>
            <a href="#">Cookies</a>
          </div>
          <div className="footer-col col-contact">
            <h4>Contact</h4>
            <a href="mailto:contact@escro.ro">contact@escro.ro</a>
            <a href="tel:+40000000000">+40 000 000 000</a>
            <a href="#">LinkedIn</a>
          </div>
        </div>
        <div className="footer-bot">
          <span>© 2026 ESCRO Platform SRL · CUI 12345678 · J40/12345/2026</span>
          <div className="badges">
            <span><Icon name="lock" size={11} /> Plăți securizate Stripe</span>
            <span><Icon name="shield" size={11} /> Conform GDPR</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const [platformStats, setPlatformStats] = useState(null);

  useEffect(() => {
    axios.get('/api/stats/platform').then(r => setPlatformStats(r.data)).catch(() => {});
  }, []);

  return (
    <div className="landing">
      <Nav />
      <main>
        <Hero />
        <Stats platformStats={platformStats} />
        <How />
        <Trust />
        <ForWho />
        <Pricing />
        <Tests />
        <FAQ />
        <CTAFinal />
        <Footer />
      </main>
    </div>
  );
}
