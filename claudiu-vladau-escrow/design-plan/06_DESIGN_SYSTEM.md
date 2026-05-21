# 06 — Design System

> **CONSTRÂNGERE CRITICĂ**: design-ul personal trebuie să se simtă ca o **continuare** a platformei `escro-platform` (același univers vizual, aceeași identitate). Tokenii de mai jos sunt extrași **identic** din `escro-platform/frontend/src/styles/escro.css` și `LandingPage.css`. Nu inventa altele.

---

## A. Culori (dark theme, default)

### Background levels
```css
--bg-0:    #050912;   /* fundalul paginii */
--bg-1:    #0a1020;   /* secțiuni alternative subtile */
--bg-2:    #0f1830;   /* card-uri primare */
--bg-3:    #15203f;   /* hover / elevated */
--bg-card: #0c1426;   /* card body */
--bg-elev: #111d35;   /* nav, sticky bar, modal */
```

### Border levels
```css
--border-1: rgba(255, 255, 255, 0.06);  /* dividere subtile */
--border-2: rgba(255, 255, 255, 0.10);  /* card borders default */
--border-3: rgba(255, 255, 255, 0.16);  /* hover/focus */
```

### Foreground levels
```css
--fg-0: #f8fafc;   /* titluri H1/H2 */
--fg-1: #e2e8f0;   /* text body principal */
--fg-2: #94a3b8;   /* text secundar, descrieri */
--fg-3: #64748b;   /* labeluri small, eyebrow */
--fg-4: #475569;   /* dezactivat */
```

### Accent (signature blue)
```css
--accent:        #3b82f6;
--accent-hi:     #60a5fa;   /* italic display, hover bright */
--accent-lo:     #2563eb;   /* pressed, depth */
--accent-glow:   rgba(59, 130, 246, 0.35);
--accent-bg:     rgba(59, 130, 246, 0.12);
--accent-bg-2:   rgba(59, 130, 246, 0.18);
--accent-border: rgba(59, 130, 246, 0.30);
```

### Status (rar folosite pe landing, dar disponibile)
```css
--success: #10b981;  --success-bg: rgba(16, 185, 129, 0.12);
--warning: #f59e0b;  --warning-bg: rgba(245, 158, 11, 0.12);
--danger:  #ef4444;  --danger-bg:  rgba(239, 68, 68, 0.12);
--violet:  #a78bfa;  --violet-bg:  rgba(167, 139, 250, 0.12);
```

### Light theme (opțional, dacă adaugi toggle)
```css
[data-theme="light"] {
  --bg-0: #fafaf7;  --bg-1: #f4f4ee;  --bg-2: #ebebe3;  --bg-3: #e1e1d6;
  --bg-card: #ffffff;  --bg-elev: #ffffff;
  --fg-0: #0a1020;  --fg-1: #1e293b;  --fg-2: #475569;  --fg-3: #64748b;  --fg-4: #94a3b8;
}
```

---

## B. Tipografie (SEMNĂTURĂ VIZUALĂ ESCRO)

### Familii — **identice cu escro-platform**
```css
--f-display: 'Instrument Serif', 'Iowan Old Style', Georgia, serif;
--f-sans:    'Geist', 'Inter', system-ui, -apple-system, sans-serif;
--f-mono:    'Geist Mono', 'JetBrains Mono', ui-monospace, monospace;
```

**Import obligatoriu** (Google Fonts):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Reguli de aplicare (CRITICE — semnătura escro)

1. **`--f-display` (Instrument Serif)** = pe **toate titlurile** (H1, H2, H3, brand name).
   - `font-weight: 400` mereu (e serif, nu îl îngroșa).
   - `line-height: 1.02 – 1.15`.
   - `letter-spacing: -0.02em` la -0.03em.
   - `text-wrap: balance`.

2. **Cuvântul-cheie din titlu = `<em>`** și primește `font-style: italic; color: var(--accent-hi);` — asta e signature-ul escro. Exemplu:
   ```html
   <h1 class="h-display">Omul de încredere care te conectează cu <em>oamenii potriviți</em>.</h1>
   ```

3. **`--f-sans` (Geist)** = body, descrieri, butoane, nav links.
   - 15px default body, line-height 1.55.

4. **`--f-mono` (Geist Mono)** = eyebrows / section labels, stats numerice, tag-uri tehnice.
   - 11px, weight 500, `text-transform: uppercase`, `letter-spacing: 0.14em`.
   - Mereu cu un mic dot albastru `•` înainte (vezi pattern `.eyebrow .dot`).

### Scară tipografică
```
H1 display:  clamp(40px, 6.4vw, 76px)  · Instrument Serif 400 · -0.025em
H2 section:  clamp(28px, 4vw, 44px)    · Instrument Serif 400 · -0.02em
H3 card:     20px – 22px               · Instrument Serif 400 · -0.01em
Lede:        clamp(15px, 1.4vw, 18px)  · Geist 400 · fg-2 · max-width 56ch
Body:        15px                      · Geist 400 · fg-1
Small:       13px                      · Geist 400 · fg-2
Eyebrow:     11px                      · Geist Mono 500 · uppercase · 0.14em · fg-3
Button:      14-15px                   · Geist 500
```

---

## C. Spacing

### Padding tokens (cu density variable)
```css
--density: 1;
--pad-xs: calc(0.375rem * var(--density));
--pad-sm: calc(0.625rem * var(--density));
--pad-md: calc(1rem * var(--density));
--pad-lg: calc(1.5rem * var(--density));
--pad-xl: calc(2rem * var(--density));
```

### Section padding
```css
.section { padding: clamp(64px, 9vw, 120px) 0; }
.section-tight { padding: clamp(48px, 6vw, 80px) 0; }
```

### Container
```css
.wrap { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
```

---

## D. Radii

```css
--r-xs: 4px;    /* tag-uri mici */
--r-sm: 6px;    /* iconițe square */
--r-md: 10px;   /* butoane, input-uri */
--r-lg: 14px;   /* card-uri */
--r-xl: 18px;   /* card-uri mari, modale */
```

Profil card (hero): `border-radius: 20px` — excepție pentru efect editorial.

---

## E. Componente-cheie (cu CSS de referință)

### Eyebrow (signature)
```css
.eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--f-mono);
  font-size: 11px; font-weight: 500;
  color: var(--fg-3);
  text-transform: uppercase; letter-spacing: 0.14em;
}
.eyebrow .dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); }
```

### Hero pill
```css
.hero-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px 6px 8px;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: 999px;
  font-family: var(--f-mono); font-size: 11px;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--accent-hi);
}
```

### Butoane
```css
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 18px; font-size: 14px; font-weight: 500;
  border-radius: var(--r-md); border: 1px solid transparent;
  cursor: pointer; transition: all 0.15s;
  font-family: inherit;
}
.btn-primary {
  background: var(--accent); color: white;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.18) inset,
    0 6px 20px var(--accent-glow);
}
.btn-primary:hover { background: var(--accent-lo); transform: translateY(-1px); }

.btn-secondary {
  background: rgba(255,255,255,0.04); color: var(--fg-1);
  border-color: var(--border-2);
}
.btn-secondary:hover { background: rgba(255,255,255,0.07); border-color: var(--border-3); }

.btn-lg { padding: 14px 26px; font-size: 15px; min-height: 44px; }
```

### Hero background (semnătură!)
```css
.hero-bg {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(900px 600px at 70% 30%, var(--accent-bg-2) 0%, transparent 60%),
    radial-gradient(700px 500px at 10% 80%, rgba(139, 92, 246, 0.06) 0%, transparent 60%);
}
.hero-grid-bg {
  position: absolute; inset: 0; opacity: 0.5; pointer-events: none;
  background-image:
    linear-gradient(var(--border-1) 1px, transparent 1px),
    linear-gradient(90deg, var(--border-1) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black 20%, transparent 80%);
}
```

### Nav (sticky, blur)
```css
.nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  background: rgba(5, 9, 18, 0.78);
  backdrop-filter: saturate(160%) blur(18px);
  -webkit-backdrop-filter: saturate(160%) blur(18px);
  border-bottom: 1px solid var(--border-1);
}
```

### Card de bază (servicii, de ce eu, etc.)
```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-2);
  border-radius: var(--r-lg);
  padding: var(--pad-lg);
  transition: border-color 0.2s, transform 0.2s;
}
.card:hover {
  border-color: var(--accent-border);
  transform: translateY(-2px);
}
```

---

## F. Iconografie

- **Sursă unică**: [Lucide Icons](https://lucide.dev) (SVG inline, stroke 1.5)
- **Mărimi**: 16px (inline body), 20px (butoane), 24px (carduri), 32px (hero accents)
- **Culoare default**: `currentColor` (preia culoarea părintelui)
- **Nu folosi**: emoji în loc de iconițe (excepție: rare, în testimoniale unde fac sens)

---

## G. Breakpoints

```css
--bp-xs: 360px;
--bp-sm: 480px;
--bp-md: 768px;
--bp-lg: 1024px;
--bp-xl: 1280px;
```

Reguli:
- < 768px: stack vertical, hamburger nav, profile card hidden în hero
- 768-1024: grid-uri din 3 col devin 2 col
- ≥ 1024: layout complet

---

## H. Accesibilitate (WCAG AA minim)

- Contrast text body (`--fg-1` pe `--bg-0`): **≥ 4.5:1** ✓
- Contrast titluri (`--fg-0` pe `--bg-0`): **≥ 7:1** ✓
- Tap targets: minim **44x44px** (`--tap-min: 44px`)
- Focus visible pe toate elementele interactive: outline 2px `--accent`, offset 2px
- `prefers-reduced-motion: reduce` respectat pentru toate animațiile
- Alt text pentru toate imaginile decorative = `alt=""`

---

## I. Checklist final design

- [ ] Folosit `Instrument Serif` pe toate titlurile, nu Inter/Segoe
- [ ] Cuvântul-cheie din titluri e `<em>` cu culoare `--accent-hi`
- [ ] Eyebrow are dot albastru și e Geist Mono uppercase
- [ ] Hero are radial gradient + grid mask
- [ ] Butoane primary au glow shadow albastru
- [ ] Card-uri folosesc `--bg-card` cu border `--border-2`
- [ ] Niciun fundal alb hard pe dark theme
- [ ] Toate animațiile respectă `prefers-reduced-motion`
