# Claude Design — CheckoutEscrow

## Context platformă
ESCRO — platformă B2B românească de escrow. CheckoutEscrow = pagina unde beneficiarul depune fonduri (card) pentru un proiect/milestone. Folosește Stripe Elements (PaymentElement).

## Această pagină
- **Rută**: `/escrow/:projectId/checkout?amount=X&milestone_id=Y`
- **Cine vede**: beneficiar (client_id) sau admin
- **Scop**: depunere fonduri via Stripe Checkout (card)

## User flow
1. Beneficiar click "Depune X RON în escrow" pe ProjectDetail
2. Redirect aici cu amount în query string
3. Pas 1: confirmare sumă (input editable)
4. Click "Continuă la plată" → backend creează PaymentIntent → returnează client_secret
5. Pas 2: Stripe Elements (PaymentElement) — card input
6. Click "Depune X RON" → stripe.confirmPayment()
7. Redirect la `/project/:projectId?paid=1` (Stripe redirect)
8. Webhook backend marchează escrow `held`

## Componente cheie pe pagină
- Back button "Înapoi la proiect"
- Page header: "Plată securizată · Stripe" + title proiect
- Card cu input sumă (Pas 1)
- Card cu Stripe Elements PaymentElement (Pas 2)
- Test card hint: "Card test: 4242 4242 4242 4242"
- Securitate disclaimer: "Fondurile sunt blocate în escrow și eliberate automat la aprobarea milestone-ului"

## Layout
**Folosește Shell.jsx**. Centrat, max-width 560px.

## Ce vreau să îmbunătățești PRIORITAR

1. **Trust signals prominente** — pagina face plată reală. Vreau:
   - Lacăt + "Plată securizată via Stripe"
   - "Banii sunt blocați în escrow — eliberare doar după aprobarea ta"
   - Logo Stripe (subtle)
2. **Sumar proiect pe top** — în pasul 1, înainte de input sumă:
   - Titlul proiectului
   - Suma propusă (buget total)
   - Comision platformă explicit ("Din [X] RON: [Y] RON expert, [Z] RON comision platformă")
3. **Input sumă polish** — actual e input numeric simplu. Vreau:
   - Format vizual cu separator mii live
   - Helper text cu max disponibil
   - Quick-pick chips: "[suggested budget]", "[milestone amount]"
4. **Step indicator** — 2 pași (Confirmare sumă → Card details) cu progress visual.
5. **Stripe Elements wrapper** — appearance custom care match cu design tokens:
   - Theme: night dacă appBg e dark, light altfel
   - colorPrimary: var(--accent-hi)
   - Border radius consistent
   - Padding consistent
6. **Submit button** state machine:
   - Idle: "Depune [X] RON în escrow"
   - Loading: spinner + "Se procesează..."
   - Disabled dacă Stripe Elements not ready
7. **Error handling clear** — banner roșu cu icon + mesaj specific (card declined, insufficient funds, 3DS failed).
8. **Mock mode hint** — dacă backend returnează `mock: true`, afișează banner amber "Mod dev — escrow marcat fără plată reală".
9. **Mobile UX** — input mare touch, submit button fixed la bottom safe-area.

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-ul** `/api/escrow/checkout` sau Stripe Elements integration
- **Test card hint** păstrat — utili pentru dev
- **Output**: `CheckoutEscrow.jsx` modificat
