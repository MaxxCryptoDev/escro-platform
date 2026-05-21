# Claude Design — LandingPage

## Context platformă
ESCRO este o platformă B2B românească de escrow pentru servicii profesionale. Conectează beneficiari (companii/persoane fizice care au nevoie de servicii) cu prestatori (experți/companii care oferă servicii) cu plată în custodie pe milestones. Procesarea plăților se face prin Stripe Connect.

## Această pagină
- **Rută**: `/`
- **Cine vede**: vizitatori publici (neautentificați)
- **Scop**: convertește vizitatorul în user (call to action: register), explică propunerea de valoare, construiește încredere

## User flow
1. Vizitatorul aterizează pe homepage (din SEO / Google ads / referral)
2. Citește hero + propunerea de valoare în primele 3 secunde
3. Explorează cum funcționează platforma (escrow, milestones, trust)
4. Vede testimoniale / proof points
5. Click pe CTA "Începe acum" / "Înregistrează-te" → redirect /register

## Componente cheie pe pagină
- Hero section cu headline + sub-headline + CTA primar
- Cum funcționează (3-4 pași vizuali)
- De ce ESCRO (trust signals: escrow, contracte legale, KYC Stripe)
- Pentru cine (beneficiari, experți, companii, persoane fizice)
- Pricing transparent (comision pe milestones)
- Footer cu legal links (T&C, privacy, GDPR)

## Layout
Pagina e PUBLICĂ, **nu folosește Shell.jsx** (nu are sidebar + topbar autentificat). Are propriul header + footer minimal.

## CSS specific
`LandingPage.css` conține stilurile dedicate. Variabilele din `escro.css` se aplică și aici.

## Ce vreau să îmbunătățești PRIORITAR

1. **First impression hero** — actual e generic. Vreau headline puternic în română care vorbește direct beneficiarului ("Plătește expert doar când livrează", "Escrow legal pentru fiecare colaborare"), sub-headline cu 1-2 fraze, CTA primar mare și vizibil.
2. **Trust signals** — afișează prominent: "Plăți procesate prin Stripe", "Contracte legale generate automat", "KYC pentru fiecare prestator", "Banii blocați în escrow până la confirmare".
3. **"Cum funcționează" vizual** — 4 pași cu iconuri: 1. Postezi proiect → 2. Alegi/asignezi prestator → 3. Depui în escrow → 4. Aprobi milestone, eliberezi plata.
4. **Conversion-focused** — CTA primar repetat strategic. "Începe acum" trebuie să fie cel mai vizibil element pe scroll.
5. **Social proof spot** — even fără logo-uri reale, structurează zonă pentru testimoniale (folosește placeholder).
6. **Mobile-first** — actual pagina nu e suficient optimizată pe mobile. Hero ascuns sub fold, CTA mic pe touch.
7. **Microinteracții** — hover states pe carduri, smooth scroll pe anchor links, fade-in animations subtle.
8. **Footer profesional** — links T&C, GDPR, contact, social.

## Constrângeri
- **Limba română** strict
- **Nu folosi Tailwind sau alte librării** — CSS pur cu variabilele din `escro.css`
- **Nu adăuga route-uri noi** — singurul CTA primar e `/register`
- **Output**: `LandingPage.jsx` + `LandingPage.css` modificate; restul fișierelor neschimbate
