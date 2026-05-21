# PROMPT PRINCIPAL — Claude Design

> Copiază tot textul de mai jos într-un chat Claude (sau Claude Design / v0 / Lovable). Atașează celelalte fișiere din folder ca sursă suplimentară.

---

## Context

Construiește un **landing page personal** pentru Claudiu Vladau — escrow officer, intermediar de încredere și project manager, cu bază operațională în SUA și clienți preponderent din România.

Pagina nu vinde un produs. **Vinde o persoană** și un mod de lucru: oameni potriviți, recomandare personală, execuție garantată de la A la Z.

Audiența ajunge aici **printr-o recomandare** (rar din SEO/ads), deci pagina nu trebuie să convingă „de la zero" — trebuie să **confirme** și să **liniștească**: „da, e omul potrivit, pot să-i scriu cu încredere".

---

## Obiectivul paginii (ordinea contează)

1. **Liniștire** — vizitatorul a auzit despre Claudiu de la cineva. Pagina îi spune: „ai ajuns unde trebuie, e serios, e real".
2. **Înțelegere** — în maxim 30 de secunde de scroll, vizitatorul trebuie să poată răspunde la întrebarea „cu ce mă poate ajuta?".
3. **Conversie** — un singur CTA principal: contact direct (WhatsApp/telefon/email). Nu formular complicat, nu funnel.

---

## Cine este Claudiu (rezumat — detalii în `01_BRAND_IDENTITY.md`)

- **Rol**: Escrow Officer · Middle man · Project Manager
- **Locație**: SUA → operează cu clienți din România și internațional
- **Diferențiator**: lucrează doar pe bază de recomandare, cu o rețea selectă de profesioniști verificați. Nu e platformă, nu e marketplace — e o persoană cu reputație.
- **Promisiune**: „Te conectez cu oamenii potriviți, nu cu primii disponibili. Mă ocup de la inițiere până la închidere."
- **Ton**: direct, calm, fără bullshit corporate. Vorbește ca un om matur care a văzut multe deal-uri.

---

## Ce trebuie să transmită design-ul (must-have)

- **Încredere** — vizual: spațiu, claritate, contrast bun, fără aglomerare. Nicio promisiune exagerată, niciun stoc photo generic.
- **Profesionalism** — paletă restrânsă (vezi `06_DESIGN_SYSTEM.md`), tipografie editorială, fără gradient-uri stridente sau emoji-uri în titluri.
- **Caracter uman** — nu suntem o corporație. Tonul textelor (vezi `03_CONTENT_COPY.md`) e personal, vorbește la persoana I, recunoaște limitele.
- **Interactivitate subtilă** — nu animații zgomotoase. Reveal pe scroll, hover-uri precise, micro-tranziții care „respiră". Vezi `05_ELEMENTE_INTERACTIVE.md`.

---

## CONSTRÂNGERE CRITICĂ — păstrează identitatea escro-platform

Pagina personală a lui Claudiu este o **extensie naturală** a platformei [escro-platform](../../work/escro-platform/). **Trebuie să arate ca aparținând aceluiași univers vizual**, nu ca un site separat.

Concret:
- **Paleta**: identică cu `escro-platform/frontend/src/styles/escro.css` — navy (#050912 → #15203f) + accent albastru (#3b82f6 + variațiile -hi / -lo / -glow / -bg / -border).
- **Tipografia**: identică — `Instrument Serif` (display, titluri), `Geist` (sans, body), `Geist Mono` (eyebrows/labels). **Nu** Inter, **nu** Segoe UI.
- **Signature vizual**: cuvântul-cheie din titluri în `<em>` italic, color `--accent-hi` (#60a5fa). Eyebrow uppercase cu dot albastru. Hero cu radial-gradient + grid masked.
- **Pattern-uri**: preia direct din `escro-platform/frontend/src/styles/LandingPage.css` (nav sticky cu blur, butoane cu glow, section heads centrate, hero pill, profile card).

Versiunea actuală (`../index.html`) folosește încă Segoe UI și pattern-uri generice — **trebuie înlocuită cu sistemul escro autentic**. Detalii complete: `06_DESIGN_SYSTEM.md` și `07_REFERINTE_VIZUALE.md`.

---

## Ce să eviți (anti-pattern-uri)

- ❌ Stoc photo cu „businessmen dând mâna"
- ❌ Slidere de testimoniale care se mișcă singure
- ❌ Pop-up de newsletter / cookie banner intruziv
- ❌ Limbaj corporate gen „soluții end-to-end personalizate"
- ❌ Promisiuni cuantificate fără context („0% comision!", „garanție 100%")
- ❌ Funnel cu multiple pași — un singur CTA, accesibil din orice secțiune
- ❌ Carduri identice generate la rând fără ierarhie vizuală

---

## Structura paginii (detaliu în `04_STRUCTURA_PAGINI.md`)

1. **Hero** — nume, rol, propunere de valoare într-o frază, CTA principal, profil card cu stats reale
2. **Despre / Filozofie** — de ce lucrez așa cum lucrez (narativ scurt, nu listă)
3. **Cum lucrez** — proces în 4 pași, vizual orizontal cu connector
4. **Servicii** — 6 carduri scurte, cu numerotare, fără icoane infantile
5. **De ce eu** — 6 puncte de diferențiere (nu „beneficii", ci „ce nu găsești la alții")
6. **Testimoniale** — 3 reale, scurte, cu nume + locație. Fără slider.
7. **FAQ** *(nou)* — 5-7 întrebări frecvente, accordion sobru
8. **Contact** — telefon/WhatsApp + email + opțiune call. Un singur block, mare, accesibil.
9. **Footer** — minimal, fără linkuri sociale dacă nu sunt active

---

## Limbă

**Tot conținutul în română.** Diacritice corecte (ă, â, î, ș, ț). Fără englezisme inutile („matching", „middle man" — OK, sunt deja consacrate în brand-ul lui).

---

## Stack tehnic preferat

- HTML + CSS + JS vanilla (un singur fișier, deployabil ca static site)
- Sau React/Next dacă tool-ul tău o cere — dar fără dependențe inutile
- Responsive mobile-first (peste 50% din trafic e mobil — vine din WhatsApp)
- Performant: Lighthouse > 90 pe toate

---

## Output așteptat

Un fișier `index.html` complet, gata de deploy, care:
- Înlocuiește versiunea actuală (vezi `../index.html`)
- Păstrează paleta navy/blue dar adaugă mai multă personalitate
- Adaugă interactivitate (vezi `05_ELEMENTE_INTERACTIVE.md`)
- Folosește textele finalizate din `03_CONTENT_COPY.md`
- E auto-suficient: niciun build step, niciun CDN obligatoriu

---

## Resurse de referință (în acest folder)

- `01_BRAND_IDENTITY.md` — Cine sunt
- `02_PUBLIC_TARGET.md` — Cine ajunge pe pagină
- `03_CONTENT_COPY.md` — Textele finale
- `04_STRUCTURA_PAGINI.md` — Arhitectura
- `05_ELEMENTE_INTERACTIVE.md` — Interacțiuni
- `06_DESIGN_SYSTEM.md` — Sistem vizual
- `07_REFERINTE_VIZUALE.md` — Inspirație
- `08_CALL_TO_ACTION.md` — Strategie CTA

---

**Începe prin a-mi propune wireframe-ul (text/ASCII) pentru hero și secțiunea „cum lucrez". Apoi continuă cu restul după ce confirm direcția.**
