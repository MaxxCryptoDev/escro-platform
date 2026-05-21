# Claude Design — Marketplace

## Context platformă
ESCRO — platformă B2B românească de escrow. Marketplace = listing PUBLIC al proiectelor deschise (status open/pending_assignment, fără prestator asignat). Experții și companiile pot vedea + aplica. Admin aprobă aplicația și asignează prestatorul.

## Această pagină
- **Rută**: `/marketplace`
- **Cine vede**: `role='expert'` sau `role='company'` (NU individual — sunt beneficiari-only)
- **Scop**: descoperă proiecte unde poți aplica ca prestator

## User flow
1. Expert/company click sidebar "Marketplace"
2. Vede listă proiecte deschise (carduri / table)
3. Filtrează după service_type (Matching / Direct) sau caută în titlu/descriere
4. Click pe proiect → ProjectDetail (cu marketplace access)
5. Click "Aplică" → ProjectDetail cu `?apply=1` → modal apply auto-open
6. Trimite aplicație cu mesaj opțional → admin notified

## Componente cheie pe pagină
- Page header cu titlu "Marketplace" + descriere ("Aplică la proiecte care îți potrivesc")
- Filter bar: search input + service_type select
- Lista proiecte (cards verticale)
- Per card: titlu, descriere truncated, partener, budget, status badge, butoane "Vezi detalii" + "Aplică"
- Empty state când nu sunt proiecte

## Layout
**Folosește Shell.jsx**. Max-width 1100px, listing card-uri.

## Ce vreau să îmbunătățești PRIORITAR

1. **Filter bar polish** — actual e simple input + select. Vreau:
   - Search prominent (icon lupa)
   - Filters as chips clickable (Matching / Direct / Toate)
   - Optional: filter pe buget (range slider)
   - Optional: filter pe timeline (zile)
   - Persistă filtrele în URL params (shareable links)
2. **Cards refactor** — actual e card simplu. Vreau:
   - Header card: title + budget mare în dreapta (font monospace, color accent-hi)
   - Meta row: avatar client, nume client, service_type chip, timeline chip, data postării
   - Description: 2 linii truncated cu ellipsis
   - Footer: "Vezi detalii" (secondary) + "Aplică" (primary cu icon paper plane)
   - Hover: lift effect + border accent
3. **Sort options** — adaugă sort: cel mai nou, buget descrescător, deadline aproape.
4. **Card density** — pe desktop, layout poate fi 2-coloane grid; pe mobile, 1-coloana stack.
5. **Empty states** — diferentiate:
   - 0 proiecte total: "Momentan nu sunt proiecte deschise. Revino mai târziu sau invită cunoscuți cu link referral."
   - 0 după filtre: "Niciun rezultat. Schimbă filtrele." + buton "Reset filtre"
6. **Apply ce face**: NU click directly → trimite modal. Click "Aplică" → redirect `/project/:id?apply=1` (deja există) → modal apply pe ProjectDetail.
7. **Trust signals** — afișează:
   - Trust level al clientului (badge)
   - Câte alte proiecte completate are
   - "Stripe verified" badge
8. **Bookmark / save for later** — opțional, dar dacă timpul permite: button "Salvează" (heart icon) cu state local storage.
9. **Mobile UX** — filter bar collapsable, cards full-width.

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-ul** `/api/projects` (returnează `is_marketplace=true` flag)
- **Apply flow** rămâne via `/api/projects/:id/apply` (din ProjectDetail modal)
- **Output**: `Marketplace.jsx` modificat
