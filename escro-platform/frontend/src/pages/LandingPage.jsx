import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const features = [
    {
      icon: '🛡️',
      title: 'Plăți 100% Sigure',
      description: 'Sistem escrow modern. Banii sunt retrași din contul beneficiarului și blocați într-un cont escrow sigur până la finalizarea cu succes a proiectului.'
    },
    {
      icon: '✅',
      title: 'Experți Verificați',
      description: 'Fiecare expert trece printr-un proces strict de verificare KYC. Toate competențele și experiența sunt certificate și validate.'
    },
    {
      icon: '📋',
      title: 'Management Profesional',
      description: 'Divide proiectul în milestone-uri clare. Fiecare etapă are obiective definite, termene și condiții de aprobare transparente.'
    },
    {
      icon: '⚖️',
      title: 'Litigii Rezolvate',
      description: 'Dispute solutionate profesionist. mediatorii ESCRO analizează dovezile și eliberează fondurile echitabil.'
    },
    {
      icon: '💼',
      title: 'Contracte Automatizate',
      description: 'Contracte generate automat între părți. Semnătură electronică și documentație completă pentru fiecare proiect.'
    },
    {
      icon: '📊',
      title: 'Urmărire Timp Real',
      description: 'Dashboard intuitiv pentru ambele părți. Vezi statusul proiectului, milestone-urile și fluxul de plăți în timp real.'
    }
  ];

  const steps = [
    { 
      number: '1', 
      title: 'Publică un Proiect', 
      desc: 'Descrie detaliat ce ai nevoie, stabilește bugetul și termenul de livrare.',
      icon: '📝'
    },
    { 
      number: '2', 
      title: 'Alege Expertul', 
      desc: 'Analizează profilurile experților verificați, portofoliile și ratingurile acestora.',
      icon: '👨‍💼'
    },
    { 
      number: '3', 
      title: 'Colaborează Secure', 
      desc: 'Lucrați împreună prin milestone-uri. Banii sunt blocați escrow până la aprobare.',
      icon: '🤝'
    },
    { 
      number: '4', 
      title: 'Finalizează cu Succes', 
      desc: 'Aprobă deliverables și eliberează fondurile. Lasă o recenzie expertului.',
      icon: '🎉'
    }
  ];

  const stats = [
    { number: '2,500+', label: 'Proiecte Finalizate' },
    { number: '850+', label: 'Experți Verificați' },
    { number: '98%', label: 'Rata de Succes' },
    { number: '15M+', label: 'RON în Escrow' }
  ];

  const testimonials = [
    {
      name: 'Maria Ionescu',
      role: 'CEO, TechStart SRL',
      text: 'ESCRO a transformat modul în care colaborăm cu freelancerii. Fiecare proiect este transparent și sigur.',
      avatar: '👩‍💼'
    },
    {
      name: 'Alexandru Popa',
      role: 'Expert IT',
      text: 'Înainte pierdeam timp cu clienți neserioși. Acum primesc plăți garantate pentru munca mea.',
      avatar: '👨‍💻'
    },
    {
      name: 'Elena Dumitrescu',
      role: 'Fondator, DesignLab',
      text: 'Sistemul de milestone-uri este perfect. Pot să-mi concentrez energia pe creativitate, nu pe recuperarea banilor.',
      avatar: '👩‍🎨'
    }
  ];

  const faqs = [
    {
      q: 'Cum funcționează sistemul escrow?',
      a: 'Când accepți un proiect, beneficiarul plătește suma într-un cont escrow. Banii rămân blocați până când livrabilele sunt aprobate. Dacă totul este în regulă, fondurile sunt eliberate expertului.'
    },
    {
      q: 'Ce se întâmplă în caz de dispută?',
      a: 'Dacă apar neînțelegeri, ambele părți pot deschide o dispută. mediatorii ESCRO vor analiza dovezile și vor lua o decizie echitabilă în max 48 de ore.'
    },
    {
      q: 'Cât costă utilizarea platformei?',
      a: 'ESCRO percepe o taxă de serviciu de 5% din valoarea proiectului, plătită de ambele părți. Aceasta acoperă costsurile de procesare și protecția oferită.'
    },
    {
      q: 'Cum sunt verificați experții?',
      a: 'Toți experții trec prin verificare KYC (identitate,documente), validarea competențelor și verificarea referințelor. Doar experții aprobați pot opera pe platformă.'
    }
  ];

  return (
    <div style={styles.container}>
      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🔒</span>
            <span style={styles.logoText}>ESCRO</span>
          </div>
          <div style={styles.navLinks}>
            <a href="#features" style={styles.navLink}>Funcționalități</a>
            <a href="#how-it-works" style={styles.navLink}>Cum Funcționează</a>
            <a href="#testimonials" style={styles.navLink}>Testimoniale</a>
            <a href="#faq" style={styles.navLink}>Întrebări</a>
          </div>
          <div style={styles.navButtons}>
            <Link to="/login" style={styles.loginBtn}>Login</Link>
            <Link to="/register" style={styles.registerBtn}>Începe Gratuit</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroBackground}>
          <div style={styles.heroGradient}></div>
          <div style={styles.heroPattern}></div>
        </div>
        <div style={styles.heroContent}>
          <div style={styles.badge}>
            <span style={styles.badgeDot}></span>
            Platformă Escrow #1 din România
          </div>
          <h1 style={styles.heroTitle}>
            Colaborează în Siguranță cu<br />
            <span style={styles.heroHighlight}>Experți Profesioniști</span>
          </h1>
          <p style={styles.heroSubtitle}>
            ESCRO elimină riscul din fiecare tranzacție. Banii sunt protejați până când 
            proiectul este livrat și aprobat. Fără înșelătorii, fără disputes nerezolvate.
          </p>
          <div style={styles.heroButtons}>
            <Link to="/register" style={styles.primaryBtn}>
              Creează Cont Gratuit
              <span style={styles.btnArrow}>→</span>
            </Link>
            <a href="#how-it-works" style={styles.secondaryBtn}>
              Vezi Cum Funcționează
            </a>
          </div>
          <div style={styles.heroStats}>
            {stats.map((stat, i) => (
              <div key={i} style={styles.heroStat}>
                <div style={styles.heroStatNumber}>{stat.number}</div>
                <div style={styles.heroStatLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section style={styles.trustSection}>
        <div style={styles.trustContent}>
          <div style={styles.trustItem}>
            <span style={styles.trustIcon}>🏦</span>
            <div>
              <div style={styles.trustTitle}>Banii în Siguranță</div>
              <div style={styles.trustDesc}>Cont escrow garantat bancar</div>
            </div>
          </div>
          <div style={styles.trustDivider}></div>
          <div style={styles.trustItem}>
            <span style={styles.trustIcon}>🔐</span>
            <div>
              <div style={styles.trustTitle}>Datele Protejate</div>
              <div style={styles.trustDesc}>Criptare end-to-end</div>
            </div>
          </div>
          <div style={styles.trustDivider}></div>
          <div style={styles.trustItem}>
            <span style={styles.trustIcon}>⚡</span>
            <div>
              <div style={styles.trustTitle}>Suport 24/7</div>
              <div style={styles.trustDesc}>Răspundem în max 1 oră</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={styles.features}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>De Ce Să Alegi ESCRO?</h2>
          <p style={styles.sectionSubtitle}>
            Oferim cea mai completă și sigură platformă pentru colaborări profesionale din România
          </p>
        </div>
        <div style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div key={index} style={styles.featureCard}>
              <div style={styles.featureIcon}>{feature.icon}</div>
              <h3 style={styles.featureTitle}>{feature.title}</h3>
              <p style={styles.featureDesc}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={styles.howItWorks}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Cum Funcționează?</h2>
          <p style={styles.sectionSubtitle}>
            Proces simplu în 4 pași - de la idee la proiect finalizat
          </p>
        </div>
        <div style={styles.stepsContainer}>
          <div style={styles.stepsLine}></div>
          <div style={styles.stepsGrid}>
            {steps.map((step, index) => (
              <div key={index} style={styles.stepCard}>
                <div style={styles.stepIcon}>{step.icon}</div>
                <div style={styles.stepNumber}>{step.number}</div>
                <h3 style={styles.stepTitle}>{step.title}</h3>
                <p style={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" style={styles.testimonials}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Ce Spun Utilizatorii?</h2>
          <p style={styles.sectionSubtitle}>
            Mii de profesioniști au ales ESCRO pentru colaborările lor
          </p>
        </div>
        <div style={styles.testimonialsGrid}>
          {testimonials.map((testimonial, index) => (
            <div key={index} style={styles.testimonialCard}>
              <div style={styles.testimonialAvatar}>{testimonial.avatar}</div>
              <p style={styles.testimonialText}>"{testimonial.text}"</p>
              <div style={styles.testimonialAuthor}>
                <div style={styles.testimonialName}>{testimonial.name}</div>
                <div style={styles.testimonialRole}>{testimonial.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={styles.faq}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Întrebări Frecvente</h2>
          <p style={styles.sectionSubtitle}>
            Răspundem la cele mai importante întrebări despre ESCRO
          </p>
        </div>
        <div style={styles.faqGrid}>
          {faqs.map((faq, index) => (
            <div key={index} style={styles.faqCard}>
              <h3 style={styles.faqQuestion}>{faq.q}</h3>
              <p style={styles.faqAnswer}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={styles.cta}>
        <div style={styles.ctaContent}>
          <h2 style={styles.ctaTitle}>Pregătit să Începi?</h2>
          <p style={styles.ctaText}>
            Alătură-te celor peste 2,500 de proiecte finalizate cu succes pe ESCRO
          </p>
          <div style={styles.ctaButtons}>
            <Link to="/register" style={styles.ctaButton}>
              Creează Cont Gratuit
            </Link>
            <span style={styles.ctaNote}>Nu ai niciun cost ascuns</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerMain}>
            <div style={styles.footerLogo}>
              <span style={styles.logoIcon}>🔒</span>
              <span style={styles.logoText}>ESCRO</span>
            </div>
            <p style={styles.footerDesc}>
              Platforma #1 de escrow din România. Conectează profesioniști 
              și finalizează proiecte în siguranță absolută.
            </p>
            <div style={styles.footerSocial}>
              <span style={styles.socialIcon}>📘</span>
              <span style={styles.socialIcon}>📸</span>
              <span style={styles.socialIcon}>💼</span>
            </div>
          </div>
          <div style={styles.footerLinks}>
            <div style={styles.footerCol}>
              <h4 style={styles.footerColTitle}>Platformă</h4>
              <a href="#features" style={styles.footerLink}>Funcționalități</a>
              <a href="#how-it-works" style={styles.footerLink}>Cum Funcționează</a>
              <a href="#testimonials" style={styles.footerLink}>Testimoniale</a>
              <Link to="/register" style={styles.footerLink}>Înregistrare</Link>
            </div>
            <div style={styles.footerCol}>
              <h4 style={styles.footerColTitle}>Legal</h4>
              <Link to="/terms" style={styles.footerLink}>Termeni și Condiții</Link>
              <a href="#" style={styles.footerLink}>Politica de Confidențialitate</a>
              <a href="#" style={styles.footerLink}>Politica de Cookies</a>
            </div>
            <div style={styles.footerCol}>
              <h4 style={styles.footerColTitle}>Contact</h4>
              <a href="mailto:contact@escro.ro" style={styles.footerLink}>contact@escro.ro</a>
              <a href="#" style={styles.footerLink}>Suport</a>
              <a href="#" style={styles.footerLink}>Parteneriate</a>
            </div>
          </div>
        </div>
        <div style={styles.footerBottom}>
          <p style={styles.copyright}>© 2026 ESCRO Platform. Toate drepturile rezervate.</p>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0f',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(10, 10, 15, 0.85)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.08)'
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1rem 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  logoIcon: {
    fontSize: '1.75rem'
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  navLinks: {
    display: 'flex',
    gap: '2rem'
  },
  navLink: {
    color: 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'color 0.2s'
  },
  navButtons: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center'
  },
  loginBtn: {
    color: 'rgba(255,255,255,0.8)',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '500',
    padding: '0.5rem 1.25rem'
  },
  registerBtn: {
    backgroundColor: '#6366f1',
    color: 'white',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '600',
    padding: '0.625rem 1.5rem',
    borderRadius: '10px',
    transition: 'all 0.2s'
  },
  hero: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8rem 2rem 6rem',
    overflow: 'hidden'
  },
  heroBackground: {
    position: 'absolute',
    inset: 0,
    zIndex: 0
  },
  heroGradient: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.3), transparent)'
  },
  heroPattern: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
    backgroundSize: '32px 32px'
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '900px',
    textAlign: 'center'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '50px',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    color: '#a5b4fc',
    marginBottom: '2rem'
  },
  badgeDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#6366f1',
    borderRadius: '50%',
    animation: 'pulse 2s infinite'
  },
  heroTitle: {
    fontSize: 'clamp(2.5rem, 6vw, 4rem)',
    fontWeight: '800',
    lineHeight: 1.1,
    marginBottom: '1.5rem',
    letterSpacing: '-0.02em'
  },
  heroHighlight: {
    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  heroSubtitle: {
    fontSize: '1.25rem',
    color: 'rgba(255,255,255,0.65)',
    maxWidth: '650px',
    margin: '0 auto 2.5rem',
    lineHeight: 1.7
  },
  heroButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '4rem'
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#6366f1',
    color: 'white',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: '600',
    padding: '1rem 2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
    transition: 'all 0.3s'
  },
  btnArrow: {
    transition: 'transform 0.2s'
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: 'rgba(255,255,255,0.8)',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: '500',
    padding: '1rem 2rem',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.15)',
    transition: 'all 0.2s'
  },
  heroStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '3rem',
    flexWrap: 'wrap'
  },
  heroStat: {
    textAlign: 'center'
  },
  heroStatNumber: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#fff'
  },
  heroStatLabel: {
    fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '0.25rem'
  },
  trustSection: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    padding: '2rem'
  },
  trustContent: {
    maxWidth: '1000px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3rem',
    flexWrap: 'wrap'
  },
  trustItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  trustIcon: {
    fontSize: '2rem'
  },
  trustTitle: {
    fontWeight: '600',
    fontSize: '1rem',
    marginBottom: '0.25rem'
  },
  trustDesc: {
    fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.5)'
  },
  trustDivider: {
    width: '1px',
    height: '50px',
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  features: {
    padding: '8rem 2rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '4rem'
  },
  sectionTitle: {
    fontSize: '2.5rem',
    fontWeight: '800',
    marginBottom: '1rem',
    letterSpacing: '-0.02em'
  },
  sectionSubtitle: {
    fontSize: '1.125rem',
    color: 'rgba(255,255,255,0.5)',
    maxWidth: '600px',
    margin: '0 auto'
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem'
  },
  featureCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '2rem',
    transition: 'all 0.3s'
  },
  featureIcon: {
    fontSize: '2.5rem',
    marginBottom: '1.25rem'
  },
  featureTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '0.75rem'
  },
  featureDesc: {
    fontSize: '0.95rem',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 1.7
  },
  howItWorks: {
    padding: '8rem 2rem',
    backgroundColor: 'rgba(255,255,255,0.01)'
  },
  stepsContainer: {
    maxWidth: '1100px',
    margin: '0 auto',
    position: 'relative'
  },
  stepsLine: {
    position: 'absolute',
    top: '60px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '70%',
    height: '2px',
    background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.5), transparent)',
    display: 'none'
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '2rem'
  },
  stepCard: {
    textAlign: 'center',
    position: 'relative'
  },
  stepIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  stepNumber: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#6366f1',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    margin: '0 auto 1rem'
  },
  stepTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    marginBottom: '0.75rem'
  },
  stepDesc: {
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.6
  },
  testimonials: {
    padding: '8rem 2rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  testimonialsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem'
  },
  testimonialCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '2rem',
    textAlign: 'center'
  },
  testimonialAvatar: {
    fontSize: '3rem',
    marginBottom: '1.5rem'
  },
  testimonialText: {
    fontSize: '1rem',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 1.7,
    marginBottom: '1.5rem',
    fontStyle: 'italic'
  },
  testimonialAuthor: {},
  testimonialName: {
    fontWeight: '700',
    fontSize: '1rem'
  },
  testimonialRole: {
    fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.5)'
  },
  faq: {
    padding: '8rem 2rem',
    maxWidth: '900px',
    margin: '0 auto'
  },
  faqGrid: {
    display: 'grid',
    gap: '1.5rem'
  },
  faqCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '1.5rem 2rem'
  },
  faqQuestion: {
    fontSize: '1.1rem',
    fontWeight: '600',
    marginBottom: '0.75rem'
  },
  faqAnswer: {
    fontSize: '0.95rem',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 1.7
  },
  cta: {
    padding: '8rem 2rem',
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    borderBottom: '1px solid rgba(255,255,255,0.08)'
  },
  ctaContent: {
    maxWidth: '600px',
    margin: '0 auto',
    textAlign: 'center'
  },
  ctaTitle: {
    fontSize: '2.5rem',
    fontWeight: '800',
    marginBottom: '1rem'
  },
  ctaText: {
    fontSize: '1.125rem',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '2rem'
  },
  ctaButtons: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem'
  },
  ctaButton: {
    display: 'inline-block',
    backgroundColor: '#6366f1',
    color: 'white',
    textDecoration: 'none',
    fontSize: '1.125rem',
    fontWeight: '600',
    padding: '1rem 3rem',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
  },
  ctaNote: {
    fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.5)'
  },
  footer: {
    padding: '4rem 2rem 2rem',
    borderTop: '1px solid rgba(255,255,255,0.06)'
  },
  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '4rem'
  },
  footerMain: {
    maxWidth: '300px'
  },
  footerDesc: {
    fontSize: '0.95rem',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.7,
    marginTop: '1rem'
  },
  footerSocial: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem'
  },
  socialIcon: {
    fontSize: '1.5rem',
    cursor: 'pointer'
  },
  footerLinks: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '2rem'
  },
  footerCol: {},
  footerColTitle: {
    fontSize: '0.875rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '1rem',
    color: 'rgba(255,255,255,0.4)'
  },
  footerLink: {
    display: 'block',
    color: 'rgba(255,255,255,0.6)',
    textDecoration: 'none',
    fontSize: '0.95rem',
    marginBottom: '0.5rem',
    transition: 'color 0.2s'
  },
  footerBottom: {
    maxWidth: '1200px',
    margin: '3rem auto 0',
    paddingTop: '2rem',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    textAlign: 'center'
  },
  copyright: {
    fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.4)'
  }
};
