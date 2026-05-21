# Claude Design — AdminFinanciar

## Context platformă
ESCRO — platformă B2B românească de escrow. Pagină de admin pentru gestionare financiară: payout approvals, escrow stats, commission tracking.

## Această pagină
- **Rută**: `/admin/financiar`
- **Cine vede**: doar `role='admin'`
- **Scop**: control financiar centralizat — aprobă payouts, vede sold escrow total, commission earned, refunds

## User flow
1. Admin click "Financiar" în sidebar
2. Vede stats overview: total escrow held, total released, total commission, pending payouts count
3. Lista payout requests pending → approve / reject / mark paid
4. Lista milestone_releases recente
5. Lista refunds executate
6. Reconciliere Stripe events

## Componente cheie pe pagină
- Page header cu stats overview cards
- Tabs: Payouts / Releases / Refunds / Stripe Events
- Per payout: aprobă / respinge / mark paid (cu Stripe transfer_id input)
- Filter perioadă

## Layout
**Folosește Shell.jsx**.

## Ce vreau să îmbunătățești PRIORITAR

1. **Stats hero** — 4 cards mari sus:
   - Total escrow held (currently în custodie)
   - Total released (lifetime)
   - Commission earned (lifetime + last 30 days)
   - Payouts pending (count + sum)
2. **Charts** — CSS / SVG simple:
   - Monthly revenue (commission) bar chart
   - Released vs Held over time
3. **Payouts pending tabel** — primary actions vizibile:
   - Aprobă (verde, primary) → status approved
   - Respinge (ghost danger) → status rejected
   - Mark paid (după Stripe transfer manual) → status paid + input transfer_id
4. **Reconciliere Stripe events** — listare ultimele evenimente Stripe cu status processed.
5. **Failed transfers escalation** — listă releases cu `stripe_payout_status='failed'` cu CTA "Retry transfer".
6. **Mobile UX** — admin foloseste mobile rare ori, dar tables minimum readable.
7. **Export CSV** — pentru contabilitate.

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-urile** `/api/admin/financiar`, `/api/admin/payouts/*`
- **Output**: `AdminFinanciar.jsx` modificat
