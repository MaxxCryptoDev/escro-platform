# Claude Design — Contracts

## Context platformă
ESCRO — platformă B2B românească de escrow. Toate contractele platformei sunt generate automat (PDF) — contract proiect, contract predare-primire per milestone, contract final, contract user T&C. Stocate în DB cu PDF URL.

## Această pagină
- **Rută**: `/contracts`
- **Cine vede**: orice user autentificat (admin vede toate, ceilalți doar ale lor)
- **Scop**: listă tuturor contractelor în care userul e parte (sau toate pentru admin)

## User flow
1. User click "Contracte" în sidebar
2. Vede listă contracte cu filtre (tip, status)
3. Per contract: nume proiect, tip (project/milestone/final), părți, status, dată semnare
4. Click PDF icon → download contract PDF
5. Click pe contract → ProjectDetail tab contracts

## Componente cheie pe pagină
- Page header "Contracte"
- Filter bar (tip, status, perioadă)
- Tabel / cards contracte
- Per row: număr contract, proiect, tip, părți, status, data semnare, download PDF

## Layout
**Folosește Shell.jsx**.

## Ce vreau să îmbunătățești PRIORITAR

1. **Type chips** — colored per tip:
   - `project` — albastru "Contract proiect"
   - `milestone` — gri "Contract predare-primire"
   - `final` — verde "Contract finalizare"
   - `terms_conditions` — outline "T&C"
2. **Status badges**:
   - `pending` — galben "În așteptare semnături"
   - `accepted` — verde "Semnat de toți"
   - `rejected` — roșu "Respins"
3. **Cards refactor** — actual e tabel. Vreau cards expandable:
   - Click card → vede full party signatures cu data
   - Download icon mare în dreapta
   - Link "Vezi proiect"
4. **PDF preview opțional** — modal cu PDF viewer (iframe) pentru click pe titlu.
5. **Filter** persistent în URL (`?type=milestone`).
6. **Empty state**: "Niciun contract încă" + (pentru beneficiari) CTA "Creează proiect".
7. **Search** după număr contract sau proiect.
8. **Mobile UX** — cards stack, butoane touch-friendly.

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-ul** `/api/contracts` (sau echivalent)
- **PDF download** cu auth token via `withAuthToken()` din utils
- **Output**: `Contracts.jsx` modificat
