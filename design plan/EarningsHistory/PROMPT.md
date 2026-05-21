# Claude Design — EarningsHistory

## Context platformă
ESCRO — platformă B2B românească de escrow. Istoric câștigurilor prestator din milestones aprobate.

## Această pagină
- **Rută**: `/wallet/earnings`
- **Cine vede**: `expert`, `company`, `individual`
- **Scop**: lista detaliată a tuturor milestone_releases (câștiguri) cu link la proiect

## User flow
1. User click "Câștiguri" (din WalletDashboard sau sidebar sub Portofel)
2. Vede lista cronologică a tuturor releases
3. Filtrează după perioadă / proiect / status (paid, pending, failed)
4. Click pe release → ProjectDetail al proiectului

## Componente cheie pe pagină
- Page header cu titlu + total
- Filter bar (perioadă, status)
- Lista / tabel earnings
- Per release: data, milestone title, project name, expert_amount, status badge

## Layout
**Folosește Shell.jsx**.

## Ce vreau să îmbunătățești PRIORITAR

1. **Stats top** — Cards mici cu:
   - Total câștigat (last 30 days)
   - Total câștigat (lifetime)
   - Comision platformă plătită (informativ)
2. **Timeline view** — alternativă la tabel: grouping pe lună cu sub-total per lună.
3. **Status badges** explicit:
   - `paid` (transfer Stripe completed) — verde
   - `pending` (release înregistrat dar transfer încă nu) — galben
   - `failed` (transfer Stripe eșuat) — roșu
4. **Click → ProjectDetail** sau secțiune Milestones tab.
5. **Export CSV** opțional (pentru contabilitate).
6. **Empty state**: "Niciun câștig încă" + CTA Marketplace.
7. **Mobile UX** — cards stackable.

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-ul** dacă există (sau folosește wallet/balance + filter)
- **Output**: `EarningsHistory.jsx` modificat
