# Claude Design — Disputes

## Context platformă
ESCRO — platformă B2B românească de escrow. Dispute = mecanism când beneficiarul + prestatorul nu sunt de acord pe un milestone. Admin arbitrează — decide split refund/release.

## Această pagină
- **Rută**: `/disputes`
- **Cine vede**: orice user autentificat (admin vede toate, ceilalți doar dispute în care e parte)
- **Scop**: listă dispute deschise + istoric

## User flow
1. User click "Dispute" în sidebar
2. Vede lista dispute (open + resolved)
3. Per dispute: proiect, milestone, motiv inițial, status, data deschidere
4. Click → vezi detalii + upload evidence (dacă open)
5. Admin: arbitraj — release_amount split decizie

## Componente cheie pe pagină
- Page header "Dispute"
- Filter bar (status, perioadă)
- Lista dispute cu cards
- Per dispute: titlu, status badge, motivul, party-ies, data
- Pentru admin: butoane "Resolve" direct

## Layout
**Folosește Shell.jsx**.

## Ce vreau să îmbunătățești PRIORITAR

1. **Card design** — pentru fiecare dispute:
   - Status badge prominent (open / under_review / resolved / archived)
   - Project + milestone title
   - Cine a deschis (raised_by — name + role)
   - Reason snippet (truncated)
   - Data + days pending (cu warning > 14 days)
2. **Urgency indicator** — dispute deschis > 14 zile = roșu, > 7 zile = galben.
3. **Evidence upload** vizibil pentru open disputes (file input + list existing).
4. **Admin arbitrage UI** (in card sau modal separat):
   - Slider: % release prestator vs % refund client (suma totala = milestone_amount)
   - Note + reasoning textarea
   - Resolve button
5. **Timeline view** — pentru dispute resolved: cronologic events (opened, evidence added, admin reviewed, resolved).
6. **Empty state** — "Nicio dispută. Asta e excelent." (cu emoji subtle).
7. **Mobile UX** — cards full width, modal admin full-screen.

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-urile** `/api/disputes`, `/api/milestones/:id/dispute`, `/api/admin/disputes/:id/resolve`
- **Output**: `Disputes.jsx` modificat
