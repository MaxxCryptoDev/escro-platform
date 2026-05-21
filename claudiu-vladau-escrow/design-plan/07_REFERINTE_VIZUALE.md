# 07 — Referințe vizuale

## A. Sursa principală — `escro-platform`

**Pagina personală trebuie să arate ca o extensie naturală a platformei escro-platform.** Vizitatorul care vede ambele trebuie să simtă că aparțin aceluiași univers (același brand, aceiași oameni).

### Fișiere de referință (citește înainte de a începe design-ul)

| Fișier | De ce | Ce să iei |
|---|---|---|
| `escro-platform/frontend/src/styles/escro.css` | Toți tokenii de design | Culorile, fonturile, radii, density |
| `escro-platform/frontend/src/styles/LandingPage.css` | Landing page-ul platformei | Pattern-uri concrete: hero, eyebrow, butoane, grid bg, section heads |
| `escro-platform/frontend/src/styles/PublicProfile.css` | Profile cards | Inspirație pentru profile card-ul din hero |
| `escro-platform/frontend/src/styles/Contracts.css` | UI sobru, profesional | Tone-ul detaliilor — borders, spacing, hierarchy |

### Pattern-uri esențiale de preluat 1:1

1. **Title cu accent italic**:
   ```html
   <h2 class="h-display">Reputația se construiește pe <em>recomandări</em>.</h2>
   ```
   `<em>` primește `font-style: italic; color: var(--accent-hi);`

2. **Eyebrow cu dot**:
   ```html
   <span class="eyebrow"><span class="dot"></span> Despre mine</span>
   ```

3. **Hero pill**:
   ```html
   <span class="hero-pill"><span class="dot"></span> Escrow · Matching · PM</span>
   ```

4. **Section head centrat**:
   - Eyebrow → H2 → Lede, centrat, max-width 56ch pe lede

5. **Hero background**: radial-gradient + grid masked

---

## B. Inspirație externă (mood)

### Site-uri cu vibe-ul potrivit

| Site | De ce e relevant |
|---|---|
| **stripe.com** | Tipografie editorială + spacing generos. Tonul „suntem serioși fără să fim plictisitori" |
| **linear.app** | Dark mode făcut corect. Animații subtile, focus pe lizibilitate |
| **vercel.com/blog** | Articole long-form cu Instrument Serif + sans modern. Exact tipografia escro |
| **rauchg.com** | Personal page minimală, tonul „eu, ca persoană" |
| **brianlovin.com** | Personal site cu personalitate, fără să fie țipător |
| **paco.me** | Card-uri sobre, nav cu sticky behavior elegant |
| **www.fontshare.com** | Reference pentru cum Instrument Serif funcționează cu sans |

### Site-uri de evitat (anti-mood)

- Site-uri de „coach motivational" (gradient cu text-shadow strident)
- Landing pages de SaaS B2B mainstream (gen Calendly, HubSpot — prea „corporate friendly")
- Site-uri de „business consultant" românești (stock photo cu strângere de mână, palete bej/auriu)

---

## C. Do's & Don'ts vizuale

### ✅ DO

- Folosește **mult spațiu negativ**. Nu umple toate colțurile.
- Lasă titlurile să **respire** (line-height generos, balance wrap).
- Folosește **Instrument Serif italic** ca accent — e signature-ul platformei.
- Păstrează paleta **restrânsă** (navy + alb + un albastru de accent). Adaugă doar accent secundar dacă e absolut necesar.
- Animații **scurte și utile** (250-500ms, ease-out, pe transform/opacity).
- Imagini **dacă există**: doar foto reală a lui Claudiu (poate fi adăugată în viitor în profile card sau o secțiune „despre"). Nu stock.
- Border-uri foarte subtile (`--border-1`, `--border-2`), nu linii groase.

### ❌ DON'T

- Nu folosi **gradient-uri stridente** (purple-to-pink, sunset, etc.)
- Nu pune **drop shadows colorate puternice** (excepție: accent-glow subtil pe butonul primary)
- Nu folosi **fonturi noi** în afară de Instrument Serif + Geist + Geist Mono
- Nu adăuga **iconițe colorate** în card-uri (folosește lucide cu currentColor)
- Nu folosi **emoji** la rândul titlurilor (ex: „🚀 Project Management" — NU)
- Nu folosi **border-radius mare** pe blocuri rectangulare mici (ex: tag-urile sunt 999px / pill, dar card-urile sunt max 18px)
- Nu adăuga **box-shadow generic** (de tip `0 4px 6px rgba(0,0,0,0.1)`) — pe dark nu se vede și e zgomot. Folosește border și accent-glow inteligent.

---

## D. ASCII mood-board (cum ar trebui să arate hero-ul redesigned)

```
┌──────────────────────────────────────────────────────────────────┐
│  [CV]  Claudiu Vladau               Despre · Servicii · [Contact]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│        ╲ ░ grid faded ░ ╱        radial accent glow ◯           │
│                                                                  │
│   • ESCROW · MATCHING · PROJECT MANAGEMENT                       │
│                                                                  │
│   Omul de încredere care te                                      │
│   conectează cu  oamenii potriviți.                              │
│                        ↑ italic, accent-hi, Instrument Serif     │
│                                                                  │
│   Nu te conectez cu oricine disponibil. Te conectez cu           │
│   profesioniști verificați din rețeaua mea selectă — cu          │
│   recomandare personală și execuție garantată din A la Z.        │
│                                                                  │
│   [ Hai să vorbim → ]    [ Cum lucrez ]                          │
│                                                                  │
│                              ┌─────────────────────────────────┐ │
│                              │ ◯ CV                            │ │
│                              │ Claudiu Vladau                  │ │
│                              │ ESCROW OFFICER · MIDDLE MAN     │ │
│                              │                                 │ │
│                              │  8+     200+    98%    24h      │ │
│                              │ ANI EX. PROJ.  SUCCES  RĂSPUNS  │ │
│                              │                                 │ │
│                              │ [Escrow] [Matching] [PM]        │ │
│                              └─────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## E. Asset-uri (dacă vrei să le pregătim)

### Necesare
- **Favicon**: monogramă `CV` pe square albastru. SVG + PNG 32/192/512.
- **OG image** (1200x630): pe fundal navy, titlul „Claudiu Vladau — Omul de încredere", cu eyebrow „Escrow · Matching · PM".

### Opționale (faza 2)
- Fotografie reală cu Claudiu (head shot, lumină naturală, fundal neutru)
- Logo lockup (CV + nume) ca SVG pentru export

---

## F. Concluzie

**Pagina trebuie să se simtă ca un capitol dintr-o carte deja deschisă**: cititorul a auzit despre Claudiu (de la cineva, sau de la platforma escro-platform pe care a văzut-o) și acum citește pagina lui personală. Tonul, paleta, tipografia, ritmul — toate trebuie să confirme că e **aceeași poveste**, doar la o altă scară.
