# 05 — Elemente interactive

> Regulă de bază: interactivitatea servește înțelegerea, nu spectacolul. Dacă o animație nu îl ajută pe vizitator să priceapă mai bine ce facem, e zgomot și o tăiem.

---

## A. Micro-interacțiuni (mereu prezente)

### 1. Nav — sticky cu „shrink"
- La scroll > 80px: nav-ul se reduce ușor în înălțime (60px → 52px), background-ul devine mai opac.
- Tranziție: `transform 0.2s ease, background 0.2s ease`.
- Pe mobile: hamburger care deschide un overlay full-screen, nu un dropdown mic.

### 2. Buton primary — „pulse" subtil la idle
- După 8 secunde de inactivitate pe pagină, butonul „Hai să vorbim" face un puls foarte subtil (1.02 scale + shadow glow) o singură dată.
- Nu se repetă. Doar atrage o singură dată atenția.

### 3. Hover states (precise, fără exagerare)
- Card-uri: `border-color` trece la `--accent-border`, `translateY(-2px)`, shadow blue subtil. Tranziție 0.2s.
- Linkuri din nav: subliniere care apare de la stânga la dreapta (1px, accent), tranziție 0.25s.
- Butoanele primary își întăresc glow-ul (`box-shadow`).

### 4. Scroll progress (linie subțire în top)
- 2px înălțime, lipită sub nav, umple de la stânga la dreapta proporțional cu scroll-ul paginii.
- Culoare: `--accent`, opacity 0.6.

---

## B. Reveal pe scroll (entry animations)

Folosește `IntersectionObserver`. Toate elementele intră cu `opacity 0 → 1` și `translateY(16px → 0)` în 0.5s, cu un stagger de 60ms între ele când e un grup (ex. card-uri).

**Elemente care primesc reveal**:
- Titlurile de secțiune (label + h2 + subtitlu — secvențial)
- Card-uri (servicii, de ce eu, testimoniale) — stagger pe rând
- Pașii din proces — secvențial de la stânga la dreapta
- Întrebările din FAQ — secvențial

**Nu primesc reveal**: hero-ul (e vizibil instant), nav-ul, footer-ul.

---

## C. Componente dinamice

### 1. Proces („Cum lucrez") — linie animată
- Conectorul orizontal dintre cei 4 pași (linia care îi unește) se desenează de la stânga la dreapta când secțiunea intră în viewport. Durata: 1.2s, easing: `ease-out`.
- Cifrele pașilor (01, 02, 03, 04) apar cu un mic „pop" (scale 0.8 → 1) cu delay stagger 200ms.
- Pe mobile: linia devine verticală, animația rămâne.

### 2. Stats din hero — count-up
- Cifrele din profile card (`8+`, `200+`, `98%`, `24h`) folosesc count-up de la 0 până la valoarea finală.
- Durata: 1.2s, easing: `ease-out`.
- Pentru `24h` se anima doar `24`, sufixul `h` rămâne static.

### 3. FAQ — accordion
- Click pe întrebare deschide răspunsul cu `max-height` + `opacity` tranziție (0.3s).
- O singură întrebare deschisă la un moment dat (cele anterioare se închid când se deschide una nouă).
- Iconiță chevron (▾) care se rotește 180° la deschidere.
- **Accesibilitate**: `aria-expanded`, navigabil de la tastatură (Enter/Space).

### 4. Testimoniale — fără slider
- 3 carduri statice, side-by-side (desktop) / stacked (mobile).
- Hover scoate ușor un quote mark mai mare în fundalul cardului (decorativ).
- **Nu** auto-play, **nu** dots, **nu** carousel — sunt 3 testimoniale, le vede pe toate odată.

### 5. Profile card hero — „tilt" subtil
- La hover, cardul face un tilt 3D foarte subtil în funcție de poziția mouse-ului (max ±4°, perspective 1000px).
- Pe mobile: nu se aplică.

---

## D. Componente noi (față de versiunea curentă)

### 1. „Sticky contact bar" pe mobile
- După ce vizitatorul depășește 60% din pagină pe mobil, apare o bară jos cu trei iconițe: WhatsApp · Telefon · Email.
- Înălțime: 56px, background: `--bg-elev` cu blur, border-top: `--border-2`.
- Apare cu `translateY(100% → 0)`, dispare la scroll-up rapid.

### 2. Cursor highlight (doar desktop)
- Subtil radial-gradient (250px diameter, accent low-opacity) care urmărește cursorul pe secțiunile de hero, despre, contact.
- `pointer-events: none`, mix-blend-mode: lighten.
- Dezactivat pe touch devices.

### 3. „Read this section" indicator în nav
- Când vizitatorul scrollează printr-o secțiune, link-ul corespondent din nav se evidențiază (text devine `--fg-0`, mic dot albastru sub el).
- Folosește `IntersectionObserver` pe `<section>` tags.

---

## E. Performanță (obligatoriu)

- **Toate animațiile respectă `prefers-reduced-motion: reduce`** — dezactivate complet pentru cei care au setarea în OS.
- **GPU-friendly**: doar `transform` și `opacity`, niciodată `width/height/top/left` pentru animații.
- **Throttle scroll handlers** la 60fps maxim (`requestAnimationFrame`).
- **No layout thrashing**: niciun reveal care declanșează reflow pe alte elemente.

---

## F. Anti-pattern-uri (interzise)

- ❌ Particle.js sau orice fundal animat constant
- ❌ Animații care durează > 1.5s (excepție: linia procesului)
- ❌ Carousele automate
- ❌ Modale care apar la „exit intent"
- ❌ Sunete
- ❌ Cursor custom (cerc, dot, etc.) — păstrăm cursorul de sistem
- ❌ Animații care se repetă în loop
