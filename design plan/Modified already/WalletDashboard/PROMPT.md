# Claude Design — WalletDashboard

## Context platformă
ESCRO — platformă B2B românească de escrow. WalletDashboard = sold + tranzacții + payout pentru prestatori (expert + company). Acum vizibil și pentru individual (sub Profile section).

## Această pagină
- **Rută**: `/wallet`
- **Cine vede**: `expert`, `company`, `individual` (admin nu)
- **Scop**: vizualizare sold, istoric tranzacții, cere payout, conectare Stripe

## User flow
1. User click "Portofel" în sidebar
2. Vede sold total + breakdown:
   - **Earned total** (din milestone_releases unde stripe_payout_status='paid')
   - **Referral balance** (din wallet_balance al userului)
   - **Paid out** (sumă deja plătită cu payout)
   - **Pending payout** (cereri payout în așteptare)
   - **Pending transfer** (releases nemarcate paid încă)
   - **Failed transfer** (transfers care au eșuat — admin recovery needed)
   - **Available** = total_earned + referral - paid - pending payout
3. Lista tranzacții (wallet_transactions)
4. Lista payout requests
5. Buton "Cere payout" → modal cu sumă + IBAN
6. Pentru expert/company fără Stripe Connect: banner "Conectează-ți contul bancar"
7. Pentru individual: NU se cere Stripe Connect (plătesc cardul direct)

## Componente cheie pe pagină
- Page header "Portofel"
- Cards mari pe top: Total Earned, Available, Pending
- Tabs: Tranzacții / Payouts
- Tabel tranzacții cu coloane: data, descriere, sumă, status
- Tabel payouts cu acțiuni (cancel pending)
- Modal "Cere payout"
- Banner KYC (dacă neconnectat)

## Layout
**Folosește Shell.jsx**.

## Ce vreau să îmbunătățești PRIORITAR

1. **Sold hero** — actual e plat. Vreau:
   - Card mare cu "Disponibil pentru retragere: [X] RON" (font foarte mare, monospace)
   - Sub: detail în badge-uri small: "Câștigat: X · Plătit: Y · În procesare: Z"
   - Mini chart cu earnings ultima lună (CSS bar)
2. **Failed transfers alert** — DACĂ failed_transfer > 0: banner roșu prominent "Ai X RON în transferuri eșuate. Contactează admin."
3. **Tranzacții readable** — actual tabel. Vreau:
   - Per row: data + descriere + sumă în culoare (verde positive, roșu negative)
   - Filter pe tip (milestone_payment, refund, payout, referral)
   - Filter pe perioadă (last 7/30/90 zile, custom range)
4. **Payouts list** — coloane:
   - Data cerută, sumă, IBAN (masked), status badge, data plătit, acțiuni (cancel doar pending)
   - Filter status
5. **Payout modal CRITICAL** — actual e simplu. Vreau:
   - Input sumă cu validation: min 50, max disponibil, integer RON
   - Format vizual: separator mii
   - Quick amounts: "Tot disponibilul", "1/2", "1/4"
   - IBAN input (cu validare format RO)
   - Helper text: "Procesare: 1-3 zile lucrătoare"
   - Confirm button: "Cere payout [X] RON"
6. **KYC banner refactor** — pentru company/expert fără Stripe Connect:
   - 3 state-uri clear: pending admin call, pending Stripe onboarding, error
   - Buton "Începe verificarea KYC" prominent
   - Pentru individual: NU afișa acest banner
7. **Empty states**:
   - Niciun tranzacție: "Niciun câștig încă. Aplică la proiecte în Marketplace" (CTA)
   - Niciun payout: "Niciun payout cerut. Cere primul" (CTA)
8. **Mobile UX** — cards stackable, tables → cards.

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-urile** `/api/wallet/balance`, `/api/wallet/transactions`, `/api/wallet/payout`
- **Pentru individual**: ASCUNDE banner Stripe Connect (nu au nevoie)
- **failed_transfer + pending_transfer** sunt câmpuri noi în response — folosește-le pentru alert UX
- **Output**: `WalletDashboard.jsx` modificat
