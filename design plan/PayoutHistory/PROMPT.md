# Claude Design — PayoutHistory

## Context platformă
ESCRO — platformă B2B românească de escrow. Istoric cereri payout către conturi bancare.

## Această pagină
- **Rută**: `/wallet/payouts`
- **Cine vede**: `expert`, `company`, `individual`
- **Scop**: vizualizare istoric payout requests cu status + sumă + IBAN + dată

## User flow
1. User click "Retrageri" (din WalletDashboard sau sidebar)
2. Vede lista cronologică a payouts
3. Filtrează după status (pending / approved / paid / rejected)
4. Pentru pending: poate anula
5. Pentru paid: vede ID transfer Stripe

## Componente cheie pe pagină
- Page header cu titlu + total plătit
- Filter bar (status, perioadă)
- Lista payouts
- Per payout: data cerută, sumă, IBAN masked, status, data procesare, acțiuni

## Layout
**Folosește Shell.jsx**.

## Ce vreau să îmbunătățești PRIORITAR

1. **Status timeline visual** — fiecare payout are flow: Cerut → Aprobat → Plătit. Vreau timeline horizontal vizual.
2. **Status badges** clear:
   - `pending` — galben "În așteptare aprobare"
   - `approved` — albastru "Aprobat — în procesare"
   - `paid` — verde "Plătit"
   - `rejected` — roșu "Respins" (cu motiv dacă există)
3. **IBAN masking** consistent (•••• XXXX last 4 digits).
4. **Stripe transfer ID** dacă există — link sau text cu copy button.
5. **Cancel pending** — buton cu confirm modal.
6. **Empty state** — "Niciun payout cerut" + CTA "Cere primul".
7. **Mobile UX** — cards stackable.

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-urile** `/api/wallet/payouts`
- **Output**: `PayoutHistory.jsx` modificat
