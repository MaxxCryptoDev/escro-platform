import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/LandingPage.css';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [platformStats, setPlatformStats] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    axios.get('/api/stats/platform').then(r => setPlatformStats(r.data)).catch(() => {});
  }, []);

  function fmtRon(n) {
    if (!n) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.0', '')}K`;
    return String(Math.round(n));
  }

  const features = [
    {
      symbol: '01',
      title: 'Fonduri Blocate în Escrow',
      description: 'Banii clientului sunt reținuți într-un cont securizat înainte de începerea lucrului. Expertul lucrează cu certitudinea că plata există. Clientul știe că nu pierde nimic dacă lucrarea nu e livrată.'
    },
    {
      symbol: '02',
      title: 'Livrare prin Milestone-uri',
      description: 'Proiectele sunt împărțite în etape clare cu condiții de acceptare definite. Fiecare milestone eliberează o parte din fonduri după aprobare. Nu există surprize la final.'
    },
    {
      symbol: '03',
      title: 'Contracte Generate Automat',
      description: 'La fiecare proiect se generează automat un contract cu valoare legală, semnat electronic de ambele părți. Tot ce contează rămâne documentat.'
    },
    {
      symbol: '04',
      title: 'Experți KYC-Verificați',
      description: 'Fiecare expert trece prin verificare de identitate și validare profesională înainte de a putea lucra pe platformă. Nu colaborezi cu necunoscuți.'
    },
    {
      symbol: '05',
      title: 'Arbitraj în Caz de Dispută',
      description: 'Dacă apar neînțelegeri, echipa ESCRO analizează livrabilele, comunicarea și contractul, și decide eliberarea fondurilor în maxim 48 de ore.'
    },
    {
      symbol: '06',
      title: 'Audit Trail Complet',
      description: 'Fiecare acțiune — mesaj, livrabil, aprobare, plată — este înregistrată cu timestamp. Transparență totală pentru ambele părți pe toată durata colaborării.'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Publici Proiectul',
      desc: 'Descrii ce ai nevoie, setezi bugetul și definești milestone-urile. Proiectul intră în aprobare și devine vizibil pentru experți verificați.',
    },
    {
      number: '02',
      title: 'Alegi Expertul',
      desc: 'Analizezi profilul, portofoliul și ratingurile expertului. Alegi direct sau primești recomandări de la ESCRO. Ambele părți semnează contractul.',
    },
    {
      number: '03',
      title: 'Depui Fondurile',
      desc: 'Banii sunt reținuți în contul escrow ESCRO. Expertul poate începe lucrul cu certitudinea că plata este garantată.',
    },
    {
      number: '04',
      title: 'Livrare și Eliberare',
      desc: 'Expertul livrează fiecare milestone. Tu aprobați și fondurile sunt eliberate automat. La final, proiectul este documentat complet.',
    }
  ];

  const faqs = [
    {
      q: 'Cum funcționează exact contul escrow?',
      a: 'La crearea proiectului, clientul depune suma totală (sau pe milestone) printr-un PaymentIntent Stripe securizat. Banii sunt reținuți de ESCRO — nu ajung la expert până la aprobare. Dacă proiectul nu pornește sau expertul nu livrează, suma este returnată clientului.'
    },
    {
      q: 'Ce se întâmplă dacă apare o dispută?',
      a: 'Oricare parte poate deschide o dispută după ce expertul a marcat un milestone ca livrat. Echipa ESCRO accesează istoricul complet — chat, livrabile, contract — și ia o decizie în maxim 48 de ore. Fondurile sunt eliberate sau returnate în funcție de decizie.'
    },
    {
      q: 'Cât costă utilizarea ESCRO?',
      a: 'ESCRO percepe un comision de 10% din valoarea proiectului, reținut din suma eliberată expertului. Nu există taxe ascunse, abonamente sau costuri de înregistrare. Plătești doar când un proiect se finalizează cu succes.'
    },
    {
      q: 'Pot folosi ESCRO pentru servicii fizice, nu doar digitale?',
      a: 'Da. ESCRO funcționează pentru orice tip de colaborare comercială — servicii digitale, consultanță, lucrări fizice, achiziții. Orice poate fi structurat în milestone-uri cu condiții de acceptare clare poate fi gestionat prin platformă.'
    },
    {
      q: 'Cum sunt verificați experții înainte să poată lucra?',
      a: 'Fiecare expert trece printr-un proces de verificare KYC (identitate, CUI dacă e persoană juridică), validare profesională și un apel de verificare cu echipa ESCRO. Abia după aprobare poate accepta proiecte.'
    }
  ];

  return (
    <div style={s.root}>
      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={s.logo}>
            <div style={s.logoMark}>E</div>
            <span style={s.logoName}>ESCRO</span>
          </div>
          <div className="lp-nav-links" style={s.navLinks}>
            <a href="#cum-functioneaza" style={s.navLink}>Cum funcționează</a>
            <a href="#features" style={s.navLink}>Funcționalități</a>
            <a href="#faq" style={s.navLink}>FAQ</a>
          </div>
          <div className="lp-nav-actions-desktop" style={s.navActions}>
            <Link to="/login" style={s.navLoginBtn}>Intră în cont</Link>
            <Link to="/register" style={s.navCta}>Începe acum</Link>
          </div>
          <button className="lp-nav-hamburger" onClick={() => setMobileMenuOpen(o => !o)} aria-label="Meniu">
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="lp-mobile-menu">
            <a href="#cum-functioneaza" onClick={() => setMobileMenuOpen(false)}>Cum funcționează</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Funcționalități</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} style={{ color: 'rgba(241,245,249,0.7)' }}>Intră în cont</Link>
            <Link to="/register" onClick={() => setMobileMenuOpen(false)} style={{ color: '#3b82f6', fontWeight: 600 }}>Începe acum →</Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section style={s.hero}>
        <div style={s.heroBg} />
        <div style={s.heroGrid} />
        <div className="lp-hero-inner" style={s.heroInner}>
          <div style={s.heroLeft}>
            <div style={s.heroPill}>
              <span style={s.heroPillDot} />
              Infrastructură de Încredere B2B
            </div>
            <h1 style={s.heroH1}>
              Colaborări fără risc.<br />
              <span style={s.heroAccent}>Plăți garantate.</span>
            </h1>
            <p style={s.heroP}>
              ESCRO este stratul de încredere dintre companii și prestatori. Banii sunt blocați până când condiţiile sunt îndeplinite. Nicio înșelătorie, nicio plată refuzată.
            </p>
            <div style={s.heroBtns}>
              <Link to="/register" style={s.heroPrimaryBtn}>
                Creează cont gratuit
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <a href="#cum-functioneaza" style={s.heroSecondaryBtn}>
                Cum funcționează
              </a>
            </div>
            <div style={s.heroTrust}>
              <div style={s.heroTrustItem}>
                <span style={s.heroTrustCheck}>✓</span>
                Fără taxe de înregistrare
              </div>
              <div style={s.heroTrustItem}>
                <span style={s.heroTrustCheck}>✓</span>
                Contracte cu valoare legală
              </div>
              <div style={s.heroTrustItem}>
                <span style={s.heroTrustCheck}>✓</span>
                Arbitraj în 48 ore
              </div>
            </div>
          </div>

          {/* ESCROW FLOW MOCKUP */}
          <div className="lp-hero-right" style={s.heroRight}>
            <div style={s.mockCard}>
              <div style={s.mockHeader}>
                <div style={s.mockDot} />
                <div style={{...s.mockDot, backgroundColor: '#f59e0b'}} />
                <div style={{...s.mockDot, backgroundColor: '#10b981'}} />
                <span style={s.mockTitle}>Proiect activ — Audit IT</span>
              </div>
              <div style={s.mockBody}>
                <div style={s.mockRow}>
                  <span style={s.mockLabel}>Status</span>
                  <span style={s.mockBadgeActive}>● În progres</span>
                </div>
                <div style={s.mockRow}>
                  <span style={s.mockLabel}>Valoare totală</span>
                  <span style={s.mockValue}>12.500 RON</span>
                </div>
                <div style={s.mockRow}>
                  <span style={s.mockLabel}>Fonduri blocate</span>
                  <span style={{...s.mockValue, color: '#f59e0b'}}>12.500 RON ✓</span>
                </div>
                <div style={s.mockDivider} />
                <div style={s.mockMilestones}>
                  <div style={s.mockMLabel}>Milestone-uri</div>
                  {[
                    { label: 'Analiză infrastructură', pct: '30%', st: 'approved' },
                    { label: 'Raport vulnerabilități', pct: '40%', st: 'active' },
                    { label: 'Implementare fixes', pct: '30%', st: 'pending' },
                  ].map((m, i) => (
                    <div key={i} style={s.mockMs}>
                      <div style={s.mockMsLeft}>
                        <div style={{
                          ...s.mockMsIcon,
                          backgroundColor: m.st === 'approved' ? '#10b981' : m.st === 'active' ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                          color: m.st === 'pending' ? 'rgba(255,255,255,0.3)' : 'white'
                        }}>
                          {m.st === 'approved' ? '✓' : m.st === 'active' ? '◉' : '○'}
                        </div>
                        <span style={{
                          ...s.mockMsLabel,
                          color: m.st === 'pending' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)'
                        }}>{m.label}</span>
                      </div>
                      <span style={s.mockMsPct}>{m.pct}</span>
                    </div>
                  ))}
                </div>
                <div style={s.mockDivider} />
                <div style={s.mockRow}>
                  <span style={s.mockLabel}>Eliberat expert</span>
                  <span style={{color: '#10b981', fontWeight: '600', fontSize: '0.9rem'}}>3.750 RON</span>
                </div>
              </div>
            </div>
            <div style={s.mockGlow} />
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div style={s.statsBar}>
        <div className="lp-stats-inner" style={s.statsInner}>
          {[
            {
              n: platformStats ? `${platformStats.verified_experts}+` : '850+',
              l: 'Experți verificați'
            },
            {
              n: platformStats ? `${platformStats.completed_projects}+` : '2.500+',
              l: 'Proiecte finalizate'
            },
            {
              n: platformStats ? `${fmtRon(platformStats.volume_ron)} RON` : '12.4M RON',
              l: 'Procesați în escrow'
            },
            { n: '48h', l: 'Arbitraj garantat' },
          ].map((s2, i) => (
            <div key={i} style={s.statItem}>
              <div style={s.statNum}>{s2.n}</div>
              <div style={s.statLabel}>{s2.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FOR WHO */}
      <section className="lp-section-padded" style={s.forWho}>
        <div className="lp-forwho-inner" style={s.forWhoInner}>
          <div style={s.forCard}>
            <div style={s.forCardTag}>Pentru Companii</div>
            <h3 style={s.forCardTitle}>Angajezi cu certitudine</h3>
            <p style={s.forCardText}>Nu mai plătești în avans fără garanție. Banii sunt blocați escrow și eliberați doar când livrabilele sunt aprobate de tine.</p>
            <ul style={s.forList}>
              <li style={s.forListItem}><span style={s.forCheck}>✓</span> Acces la experți verificați KYC</li>
              <li style={s.forListItem}><span style={s.forCheck}>✓</span> Contract automat la fiecare proiect</li>
              <li style={s.forListItem}><span style={s.forCheck}>✓</span> Control complet pe milestone-uri</li>
              <li style={s.forListItem}><span style={s.forCheck}>✓</span> Protecție în caz de livrare neconformă</li>
            </ul>
            <Link to="/register" style={s.forBtn}>Postează un proiect</Link>
          </div>
          <div className="lp-for-divider" style={s.forDivider} />
          <div style={s.forCard}>
            <div style={{...s.forCardTag, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)'}}>Pentru Experți</div>
            <h3 style={s.forCardTitle}>Lucrezi cu plată garantată</h3>
            <p style={s.forCardText}>Nu mai riști să livrezi fără să primești banii. ESCRO verifică că fondurile există înainte să începi lucrul. Zero neplătitori.</p>
            <ul style={s.forList}>
              <li style={s.forListItem}><span style={{...s.forCheck, color: '#34d399'}}>✓</span> Plata blocată înainte să înceapă proiectul</li>
              <li style={s.forListItem}><span style={{...s.forCheck, color: '#34d399'}}>✓</span> Sistem de reputație și rating transparent</li>
              <li style={s.forListItem}><span style={{...s.forCheck, color: '#34d399'}}>✓</span> Contracte care te protejează legal</li>
              <li style={s.forListItem}><span style={{...s.forCheck, color: '#34d399'}}>✓</span> Arbitraj echitabil în caz de dispute</li>
            </ul>
            <Link to="/register" style={{...s.forBtn, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)'}}>Înregistrează-te ca expert</Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="cum-functioneaza" style={s.how}>
        <div style={s.sectionTag}>Procesul</div>
        <h2 style={s.sectionTitle}>Cum funcționează ESCRO</h2>
        <p style={s.sectionSub}>De la prima discuție la proiect finalizat — totul structurat, documentat și protejat.</p>
        <div className="lp-steps-grid" style={s.stepsGrid}>
          {steps.map((step, i) => (
            <div key={i} style={s.stepCard}>
              <div style={s.stepNum}>{step.number}</div>
              <div style={s.stepConnector} />
              <h3 style={s.stepTitle}>{step.title}</h3>
              <p style={s.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="lp-section-padded" style={s.features}>
        <div className="lp-features-inner" style={s.featuresInner}>
          <div className="lp-features-left" style={s.featuresLeft}>
            <div style={s.sectionTag}>Funcționalități</div>
            <h2 style={{...s.sectionTitle, textAlign: 'left', margin: '0.75rem 0 1.5rem'}}>Tot ce îți trebuie pentru o colaborare sigură</h2>
            <p style={{...s.sectionSub, textAlign: 'left', margin: 0}}>Nu un marketplace simplu. O infrastructură completă de coordonare a serviciilor comerciale.</p>
          </div>
          <div style={s.featuresGrid}>
            {features.map((f, i) => (
              <div key={i} style={s.featureCard}>
                <div style={s.featureNum}>{f.symbol}</div>
                <h3 style={s.featureTitle}>{f.title}</h3>
                <p style={s.featureDesc}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST SECTION */}
      <section style={s.trust}>
        <div style={s.trustInner}>
          <h2 style={s.trustTitle}>Construit pe principii clare</h2>
          <div className="lp-trust-cards" style={s.trustCards}>
            {[
              { icon: '⚖️', title: 'Neutralitate', text: 'ESCRO nu este de partea nimănui. Suntem mediatorii neutri care asigură că ambele părți respectă condițiile agreate.' },
              { icon: '🔒', title: 'Securitate financiară', text: 'Fondurile sunt reținute în conturi escrow separate, nu în contul operațional al platformei. Banii tăi sunt în siguranță.' },
              { icon: '📄', title: 'Trasabilitate', text: 'Fiecare acțiune generează un audit trail permanent. Nimeni nu poate modifica istoricul unei colaborări.' },
            ].map((t, i) => (
              <div key={i} style={s.trustCard}>
                <div style={s.trustIcon}>{t.icon}</div>
                <h3 style={s.trustCardTitle}>{t.title}</h3>
                <p style={s.trustCardText}>{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="lp-section-padded" style={s.faq}>
        <div className="lp-faq-inner" style={s.faqInner}>
          <div className="lp-faq-left" style={s.faqLeft}>
            <div style={s.sectionTag}>FAQ</div>
            <h2 style={{...s.sectionTitle, textAlign: 'left', margin: '0.75rem 0 1rem'}}>Întrebări frecvente</h2>
            <p style={{...s.sectionSub, textAlign: 'left', margin: '0 0 2rem'}}>Nu găsești răspunsul? Scrie-ne la <a href="mailto:contact@escro.ro" style={{color: '#3b82f6', textDecoration: 'none'}}>contact@escro.ro</a></p>
          </div>
          <div style={s.faqList}>
            {faqs.map((f, i) => (
              <div key={i} style={s.faqItem} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div style={s.faqQ}>
                  <span>{f.q}</span>
                  <span style={{...s.faqArrow, transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)'}}>▾</span>
                </div>
                {openFaq === i && <p style={s.faqA}>{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={s.cta}>
        <div style={s.ctaBg} />
        <div style={s.ctaInner}>
          <h2 style={s.ctaTitle}>Gata să elimini riscul din colaborările tale?</h2>
          <p style={s.ctaText}>Înregistrarea este gratuită. Plătești doar când un proiect se finalizează cu succes.</p>
          <div style={s.ctaBtns}>
            <Link to="/register" style={s.ctaPrimary}>Creează cont gratuit</Link>
            <Link to="/login" style={s.ctaSecondary}>Am deja cont</Link>
          </div>
          <p style={s.ctaFine}>Fără card de credit. Fără abonament. Fără taxe ascunse.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div className="lp-footer-top" style={s.footerTop}>
            <div style={s.footerBrand}>
              <div style={s.logo}>
                <div style={s.logoMark}>E</div>
                <span style={s.logoName}>ESCRO</span>
              </div>
              <p style={s.footerTagline}>Infrastructură de încredere pentru colaborări comerciale sigure.</p>
            </div>
            <div className="lp-footer-cols" style={s.footerCols}>
              <div>
                <div style={s.footerColHead}>Platformă</div>
                <a href="#cum-functioneaza" style={s.footerLink}>Cum funcționează</a>
                <a href="#features" style={s.footerLink}>Funcționalități</a>
                <Link to="/register" style={s.footerLink}>Înregistrare</Link>
                <Link to="/login" style={s.footerLink}>Login</Link>
              </div>
              <div>
                <div style={s.footerColHead}>Legal</div>
                <Link to="/terms" style={s.footerLink}>Termeni și Condiții</Link>
                <a href="#" style={s.footerLink}>Confidențialitate</a>
                <a href="#" style={s.footerLink}>Cookies</a>
              </div>
              <div>
                <div style={s.footerColHead}>Contact</div>
                <a href="mailto:contact@escro.ro" style={s.footerLink}>contact@escro.ro</a>
                <a href="#" style={s.footerLink}>Suport</a>
                <a href="#" style={s.footerLink}>Parteneriate</a>
              </div>
            </div>
          </div>
          <div style={s.footerBottom}>
            <span>© 2026 ESCRO Platform SRL. Toate drepturile rezervate.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const BLUE = '#3b82f6';
const BLUE_DIM = 'rgba(59, 130, 246, 0.15)';
const BLUE_BORDER = 'rgba(59, 130, 246, 0.3)';

const s = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#060b18',
    color: '#f1f5f9',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    overflowX: 'hidden'
  },

  /* NAV */
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
    backgroundColor: 'rgba(6, 11, 24, 0.9)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)'
  },
  navInner: {
    maxWidth: '1200px', margin: '0 auto',
    padding: '0.875rem 2rem',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  },
  logo: { display: 'flex', alignItems: 'center', gap: '0.625rem' },
  logoMark: {
    width: '32px', height: '32px',
    backgroundColor: BLUE,
    borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '800', fontSize: '1rem', color: 'white'
  },
  logoName: { fontSize: '1.25rem', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.02em' },
  navLinks: { display: 'flex', gap: '2.5rem' },
  navLink: {
    color: 'rgba(241,245,249,0.78)', textDecoration: 'none',
    fontSize: '0.9rem', fontWeight: '500', transition: 'color 0.2s'
  },
  navActions: { display: 'flex', alignItems: 'center', gap: '1rem' },
  navLoginBtn: {
    color: 'rgba(241,245,249,0.7)', textDecoration: 'none',
    fontSize: '0.9rem', fontWeight: '500', padding: '0.5rem 1rem'
  },
  navCta: {
    backgroundColor: BLUE, color: 'white', textDecoration: 'none',
    fontSize: '0.9rem', fontWeight: '600',
    padding: '0.5rem 1.25rem', borderRadius: '8px'
  },

  /* HERO */
  hero: {
    position: 'relative', minHeight: '100vh',
    display: 'flex', alignItems: 'center',
    padding: '7rem 2rem 5rem',
    overflow: 'hidden'
  },
  heroBg: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse 70% 60% at 60% 40%, rgba(59,130,246,0.12) 0%, transparent 70%)'
  },
  heroGrid: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
    backgroundSize: '60px 60px'
  },
  heroInner: {
    position: 'relative', zIndex: 1,
    maxWidth: '1200px', margin: '0 auto',
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: '5rem', alignItems: 'center', width: '100%'
  },
  heroLeft: {},
  heroPill: {
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    backgroundColor: BLUE_DIM,
    border: `1px solid ${BLUE_BORDER}`,
    borderRadius: '100px', padding: '0.4rem 1rem',
    fontSize: '0.8rem', fontWeight: '600', color: '#93c5fd',
    letterSpacing: '0.02em', textTransform: 'uppercase',
    marginBottom: '1.75rem'
  },
  heroPillDot: {
    width: '6px', height: '6px',
    backgroundColor: BLUE, borderRadius: '50%'
  },
  heroH1: {
    fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)',
    fontWeight: '800', lineHeight: 1.1,
    letterSpacing: '-0.03em', marginBottom: '1.25rem',
    color: '#f8fafc'
  },
  heroAccent: { color: BLUE },
  heroP: {
    fontSize: '1.1rem', lineHeight: 1.7,
    color: 'rgba(241,245,249,0.78)',
    marginBottom: '2.25rem', maxWidth: '480px'
  },
  heroBtns: { display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' },
  heroPrimaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    backgroundColor: BLUE, color: 'white', textDecoration: 'none',
    fontSize: '0.95rem', fontWeight: '600',
    padding: '0.875rem 1.75rem', borderRadius: '10px',
    boxShadow: '0 4px 24px rgba(59,130,246,0.35)'
  },
  heroSecondaryBtn: {
    display: 'inline-flex', alignItems: 'center',
    color: 'rgba(241,245,249,0.75)', textDecoration: 'none',
    fontSize: '0.95rem', fontWeight: '500',
    padding: '0.875rem 1.5rem', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)'
  },
  heroTrust: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap' },
  heroTrustItem: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    fontSize: '0.85rem', color: 'rgba(241,245,249,0.72)'
  },
  heroTrustCheck: { color: '#10b981', fontWeight: '700' },

  /* MOCKUP */
  heroRight: { position: 'relative' },
  mockCard: {
    backgroundColor: '#0d1627',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
    position: 'relative', zIndex: 1
  },
  mockHeader: {
    padding: '0.875rem 1.25rem',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  mockDot: { width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' },
  mockTitle: { marginLeft: '0.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  mockBody: { padding: '1.5rem' },
  mockRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  mockLabel: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' },
  mockBadgeActive: {
    fontSize: '0.75rem', fontWeight: '600', color: '#34d399',
    backgroundColor: 'rgba(16,185,129,0.15)', padding: '0.25rem 0.625rem', borderRadius: '100px'
  },
  mockValue: { fontSize: '0.9rem', fontWeight: '600', color: '#f1f5f9' },
  mockDivider: { borderTop: '1px solid rgba(255,255,255,0.06)', margin: '1rem 0' },
  mockMilestones: {},
  mockMLabel: { fontSize: '0.75rem', fontWeight: '600', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' },
  mockMs: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' },
  mockMsLeft: { display: 'flex', alignItems: 'center', gap: '0.625rem' },
  mockMsIcon: {
    width: '20px', height: '20px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.65rem', fontWeight: '700', flexShrink: 0
  },
  mockMsLabel: { fontSize: '0.82rem' },
  mockMsPct: { fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontWeight: '500' },
  mockGlow: {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '300px', height: '300px',
    background: `radial-gradient(circle, ${BLUE_DIM} 0%, transparent 70%)`,
    zIndex: 0, pointerEvents: 'none'
  },

  /* STATS BAR */
  statsBar: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  statsInner: {
    maxWidth: '900px', margin: '0 auto', padding: '2.5rem 2rem',
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', textAlign: 'center'
  },
  statItem: {},
  statNum: { fontSize: '2rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.03em' },
  statLabel: { fontSize: '0.85rem', color: 'rgba(241,245,249,0.65)', marginTop: '0.25rem' },

  /* FOR WHO */
  forWho: { padding: '7rem 2rem' },
  forWhoInner: {
    maxWidth: '1100px', margin: '0 auto',
    display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '3rem', alignItems: 'start'
  },
  forCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '16px', padding: '2.5rem'
  },
  forCardTag: {
    display: 'inline-block',
    backgroundColor: BLUE_DIM, color: '#93c5fd',
    border: `1px solid ${BLUE_BORDER}`,
    borderRadius: '100px', padding: '0.3rem 0.875rem',
    fontSize: '0.75rem', fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: '1.25rem'
  },
  forCardTitle: { fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.875rem', letterSpacing: '-0.02em' },
  forCardText: { fontSize: '0.95rem', color: 'rgba(241,245,249,0.75)', lineHeight: 1.7, marginBottom: '1.5rem' },
  forList: { listStyle: 'none', padding: 0, margin: '0 0 2rem 0' },
  forListItem: {
    display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
    fontSize: '0.9rem', color: 'rgba(241,245,249,0.7)',
    marginBottom: '0.75rem', lineHeight: 1.5
  },
  forCheck: { color: '#93c5fd', fontWeight: '700', flexShrink: 0 },
  forBtn: {
    display: 'inline-block',
    backgroundColor: BLUE_DIM, color: '#93c5fd',
    border: `1px solid ${BLUE_BORDER}`,
    borderRadius: '8px', padding: '0.75rem 1.5rem',
    fontSize: '0.9rem', fontWeight: '600',
    textDecoration: 'none', transition: 'all 0.2s'
  },
  forDivider: {
    width: '1px', minHeight: '200px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignSelf: 'stretch', margin: '0 1rem'
  },

  /* HOW IT WORKS */
  how: {
    padding: '7rem 2rem',
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'center'
  },
  stepsGrid: {
    maxWidth: '1100px', margin: '4rem auto 0',
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem'
  },
  stepCard: { position: 'relative', textAlign: 'left', paddingTop: '0.5rem' },
  stepNum: {
    fontSize: '2.5rem', fontWeight: '900',
    color: BLUE, letterSpacing: '-0.04em',
    marginBottom: '1.25rem', lineHeight: 1
  },
  stepConnector: {},
  stepTitle: { fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.75rem', color: '#f1f5f9' },
  stepDesc: { fontSize: '0.875rem', color: 'rgba(241,245,249,0.72)', lineHeight: 1.7 },

  /* SECTION TAGS / TITLES */
  sectionTag: {
    display: 'inline-block',
    fontSize: '0.75rem', fontWeight: '700', color: BLUE,
    textTransform: 'uppercase', letterSpacing: '0.1em',
    marginBottom: '0.75rem'
  },
  sectionTitle: {
    fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
    fontWeight: '800', letterSpacing: '-0.03em',
    color: '#f8fafc', textAlign: 'center', margin: '0.75rem auto 1rem'
  },
  sectionSub: {
    fontSize: '1rem', color: 'rgba(241,245,249,0.72)', lineHeight: 1.7,
    maxWidth: '560px', margin: '0 auto', textAlign: 'center'
  },

  /* FEATURES */
  features: { padding: '7rem 2rem' },
  featuresInner: {
    maxWidth: '1200px', margin: '0 auto',
    display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '5rem', alignItems: 'start'
  },
  featuresLeft: { position: 'sticky', top: '7rem' },
  featuresGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem'
  },
  featureCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px', padding: '1.75rem',
    transition: 'border-color 0.2s'
  },
  featureNum: {
    fontSize: '0.75rem', fontWeight: '800', color: BLUE,
    letterSpacing: '0.05em', marginBottom: '1rem'
  },
  featureTitle: { fontSize: '1rem', fontWeight: '700', marginBottom: '0.625rem', color: '#f1f5f9' },
  featureDesc: { fontSize: '0.875rem', color: 'rgba(241,245,249,0.72)', lineHeight: 1.7 },

  /* TRUST */
  trust: {
    padding: '7rem 2rem',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  trustInner: { maxWidth: '1000px', margin: '0 auto', textAlign: 'center' },
  trustTitle: { fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '3rem' },
  trustCards: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' },
  trustCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px', padding: '2rem'
  },
  trustIcon: { fontSize: '2rem', marginBottom: '1rem' },
  trustCardTitle: { fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.75rem' },
  trustCardText: { fontSize: '0.875rem', color: 'rgba(241,245,249,0.72)', lineHeight: 1.7 },

  /* FAQ */
  faq: { padding: '7rem 2rem' },
  faqInner: {
    maxWidth: '1100px', margin: '0 auto',
    display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '5rem', alignItems: 'start'
  },
  faqLeft: { position: 'sticky', top: '7rem' },
  faqList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  faqItem: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '10px', padding: '1.25rem 1.5rem',
    cursor: 'pointer', transition: 'border-color 0.2s'
  },
  faqQ: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: '0.95rem', fontWeight: '600', color: '#f1f5f9', gap: '1rem'
  },
  faqArrow: {
    color: 'rgba(241,245,249,0.62)', flexShrink: 0, fontSize: '1.1rem',
    transition: 'transform 0.2s'
  },
  faqA: {
    fontSize: '0.9rem', color: 'rgba(241,245,249,0.75)',
    lineHeight: 1.7, marginTop: '1rem', marginBottom: 0
  },

  /* CTA */
  cta: {
    position: 'relative', padding: '8rem 2rem',
    textAlign: 'center', overflow: 'hidden'
  },
  ctaBg: {
    position: 'absolute', inset: 0,
    background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(59,130,246,0.12) 0%, transparent 70%)`
  },
  ctaInner: { position: 'relative', zIndex: 1, maxWidth: '600px', margin: '0 auto' },
  ctaTitle: { fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '1rem' },
  ctaText: { fontSize: '1.05rem', color: 'rgba(241,245,249,0.78)', lineHeight: 1.7, marginBottom: '2.5rem' },
  ctaBtns: { display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' },
  ctaPrimary: {
    backgroundColor: BLUE, color: 'white', textDecoration: 'none',
    fontSize: '1rem', fontWeight: '600',
    padding: '0.875rem 2rem', borderRadius: '10px',
    boxShadow: '0 4px 24px rgba(59,130,246,0.35)'
  },
  ctaSecondary: {
    backgroundColor: 'transparent', color: 'rgba(241,245,249,0.7)', textDecoration: 'none',
    fontSize: '1rem', fontWeight: '500',
    padding: '0.875rem 2rem', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)'
  },
  ctaFine: { fontSize: '0.85rem', color: 'rgba(241,245,249,0.58)' },

  /* FOOTER */
  footer: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    padding: '4rem 2rem 2rem'
  },
  footerInner: { maxWidth: '1200px', margin: '0 auto' },
  footerTop: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '4rem', marginBottom: '3rem' },
  footerBrand: {},
  footerTagline: { fontSize: '0.9rem', color: 'rgba(241,245,249,0.62)', lineHeight: 1.6, marginTop: '1rem', maxWidth: '260px' },
  footerCols: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' },
  footerColHead: { fontSize: '0.75rem', fontWeight: '700', color: 'rgba(241,245,249,0.58)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' },
  footerLink: { display: 'block', color: 'rgba(241,245,249,0.72)', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '0.625rem' },
  footerBottom: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '2rem',
    fontSize: '0.85rem', color: 'rgba(241,245,249,0.52)', textAlign: 'center'
  }
};
