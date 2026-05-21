# Claude Design — ProjectDetail (CEL MAI MARE FIȘIER ~2400 linii)

## Context platformă
ESCRO — platformă B2B românească de escrow. ProjectDetail e PAGINA CENTRALĂ a aplicației — tot ce ține de un proiect/task între părți (beneficiar + prestator) se întâmplă aici.

## Această pagină
- **Rute**: `/project/:projectId`, `/company/project/:projectId`, `/expert/project/:projectId` (toate randează ProjectDetail.jsx)
- **Cine vede**: oricine e parte (client_id, expert_id, company_id) + admin + (pentru proiecte marketplace) orice user autentificat (read-only + apply)
- **Scop**: workflow complet — view detalii, chat, contracte, milestones, escrow, dispute, modifications

## User flow (variabil pe rol)

### Pentru beneficiar (client)
1. Click pe proiect din dashboard
2. Tab "Detalii": vezi sumar, partener, escrow status, progres
3. Generează contract proiect (buton dedicat) → ambele părți semnează
4. Depune fonduri în escrow per milestone (buton "Depune X RON" → redirect /checkout)
5. La fiecare milestone livrat: aprobă / cere revizuire / dispute
6. Final: review prestator

### Pentru prestator (expert/company)
1. Click pe proiect (din notification sau dashboard)
2. Tab "Detalii": vede detaliile + partener
3. Semnează contractul de proiect
4. Așteaptă funding escrow
5. Livrează milestone (file upload + descriere + semnează predare-primire)
6. Așteaptă aprobare → primește bani în wallet → poate cere payout

### Pentru admin
- Vede tot read-only + poate interveni (release manual, arbitrage)

### Pentru un visitor (marketplace)
- Vezi detalii public (fără sensitive: emails, phones)
- Click "Aplică la proiect" → modal cu mesaj opțional → admin approval

## Componente cheie pe pagină
- Page header cu titlu, status badge, page-actions (Aplică / Adaugă task / Cancel / Refund)
- Tabs: Details / Chat / Contracts / Milestones (variabil pe rol)
- Tab Details: 
  - Vault hero (escrow held visualization)
  - Card "Părți" (client + prestator)
  - Quick stats
  - Activitate recentă
- Tab Chat: messages list + input (BLOCKED dacă project status completed/cancelled)
- Tab Contracts: ContractStep workflow (1. proiect, 2-N. milestones, N+1. final) cu progress visualizat
- Tab Milestones: lista milestones cu deliverable upload + approve + revision request
- Modaluri INLINE foarte multe:
  - **ContractModal** (view PDF + sign)
  - **SignatureModal** (canvas semnătură)
  - **ReviewModal** (rating + comment)
  - **AnnexModal** (anexa contract)
  - Modal "Aplică la proiect" (nou)
  - Modal "Depunere fonduri escrow"
  - Modal "Propune modificare" (project sau milestone)
  - Modal "Add task" (pentru PM creators)
  - Modal "Refund escrow"

## Layout
**Folosește Shell.jsx**. Cel mai dens conținut din aplicație.

## Ce vreau să îmbunătățești PRIORITAR

### 1. Tab navigation
- Actual: 4 taburi mici sub header
- Vreau: tabs cu badge counts (unread messages, pending contracts, pending milestones)
- Mobile: scrollable horizontal cu indicator

### 2. State visibility ("Where am I in the workflow?")
- Actual: tab Contracts arată steps inline lung
- Vreau: pe TOP al paginii (sub header) — un mini-stepper orizontal cu:
  - Contract proiect ⟶ Escrow funding ⟶ Milestone 1 ⟶ Milestone 2 ⟶ ... ⟶ Contract final
  - Step curent highlighted (color + animation)
  - Click pe step → jump to milestone in Contracts tab

### 3. Vault hero (escrow visualization)
- Actual: număr mare cu emoji
- Vreau: 
  - Bar visual: total project budget, segmented per milestone (released vs held vs pending)
  - Tooltip pe hover cu sume exacte
  - Color: released=green, held=blue, pending=gray

### 4. Modal-uri unification
- Sunt mulți modali in-line. Toți trebuie să aibă același feel:
  - Header: titlu + close button (X)
  - Body
  - Footer cu butoane (cancel ghost + primary action)
  - ESC + click outside close
  - Focus trap
  - Animație fade-in subtle

### 5. ContractStep workflow
- Actual: vertical list cu pași 1, 2, 3, ...
- Vreau: card-uri verticale cu status icon stânga, conținut centru, acțiuni dreapta
- Pași past = colaps simplu, current = expanded, future = blur/dim

### 6. Milestone cards
- Actual: dense, multe state-uri
- Vreau:
  - Card per milestone cu progress bar
  - "Next action" highlight (color + label)
  - Pentru prestator: file upload zone vizibil
  - Pentru beneficiar: butoane "Aprobă" / "Revizuire" / "Dispute" mari
  - Deliverable history (versiuni anterioare)

### 7. Chat tab UX
- Actual: input simplu + lista messages
- Vreau:
  - Messages bubbles cu avatar partener
  - "Read" indicator pe propriile mesaje
  - File attachment vizibil
  - Auto-scroll smooth
  - Empty state ("Începe conversația — semnează contractul mai întâi")
  - Lock state CLEAR când proiectul e completed/cancelled

### 8. Apply modal (nou)
- Modal care apare pe `?apply=1` pentru marketplace visitors
- Mesaj scurt cu placeholder; max 1000 chars
- Submit clear cu state "Se trimite..."
- After-submit: success message + close (rămâi pe pagină)

### 9. Page-actions header
- Actual: butoane diverse pe baza role + status
- Vreau: ordine clară — primary action (Aplică/Aprobă/Plătește) primul, secondary (Anulează/Refund) dropdown ghost
- Pe mobile: collapsed în dropdown menu

### 10. Mobile responsive
- Page e GREU folosibilă pe mobile actual
- Tabs trebuie scrollable
- Vault hero stackable
- Modaluri să fie full-screen pe mobile
- Buttons touch-friendly (min 44px)

## Constrângeri
- **Limba română**
- **Nu schimba API contracts** — TOATE endpoint-urile rămân
- **Păstrează lazy state** — multe sub-componente, păstrează use-state-urile existente
- **Modal logic** — păstrează state-urile (showApplyModal, showDepositModal, etc.)
- **Output**: `ProjectDetail.jsx` modificat. Poți refactoriza în sub-componente dacă vrei (ex: `<MilestoneCard>`, `<ContractStepCard>`, `<VaultHero>`).
- **Modal-uri**: ContractModal, SignatureModal, ReviewModal, AnnexModal — păstrează API-ul (props), poți schimba doar internals dacă vrei.

## Atenție specială
Pagina e ESENȚIALĂ — userii petrec 80% din timp aici. Orice îmbunătățire de fluiditate / state visibility / action discoverability are impact mare pe conversie și completarea proiectelor.
