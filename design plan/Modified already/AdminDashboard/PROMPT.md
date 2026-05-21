# Claude Design — AdminDashboard

## Context platformă
ESCRO — platformă B2B românească de escrow. Adminul (`vladau.claudiu95@gmail.com`) gestionează platforma: aprobă useri (KYC call), proiecte, dispute, payouts, vede stats financiare.

## Această pagină
- **Rută**: `/admin/dashboard?tab=<tab_name>`
- **Cine vede**: doar `role='admin'`
- **Scop**: control center complet pentru administrator

## User flow
1. Admin loghează → automatic redirect la `/admin/dashboard`
2. Vede overview cu stats (useri pending, dispute open, etc.)
3. Click pe tab pentru a face acțiune:
   - **Overview**: stats + quick alerts
   - **Utilizatori**: listă useri, aprobă/respinge KYC, suspend
   - **Proiecte & Taskuri**: listă proiecte, aprobă PM, vede progres
   - **Aplicații** (nou): aplicații pending pentru marketplace — aprobă/respinge
   - **Financiar**: payout requests, escrow stats
   - **Contracte**: toate contractele platformei
   - **Dispute**: dispute open, arbitrage
   - **Apeluri identitate**: schedule/completează video call pentru KYC manual
   - **Trust**: trust profiles + bonus management
   - **Referral**: codes activi
   - **Audit Log**: istoric acțiuni admin
   - **T&C**: management versiuni Terms

## Componente cheie pe pagină
- Topbar (Shell) cu search + notification bell
- Sidebar (Shell) cu nav admin specific
- Tab navigation cu badge counts
- Cards / tables pentru fiecare tab
- Modaluri: assign, edit, approve confirmations

## Layout
**Folosește Shell.jsx**. Este **CEA MAI MARE pagină**, ~3500 linii cu 11 tab-uri.

## Ce vreau să îmbunătățești PRIORITAR

1. **Information density** — actual e suprasaturat. Vreau:
   - Stats overview cu vizualizări (mini-charts inline)
   - Cards mari pentru "urgent actions" (dispute open, payouts pending) pe overview
   - Tab counts cu badge color-coded (roșu pentru urgent)
2. **Tab navigation polish** — actual e listă orizontală cu scroll pe mobile (rău). Vreau:
   - Pe desktop: tabs orizontale clare cu underline activ
   - Pe mobile: dropdown / segmented switch cu indicator
3. **Tables refactor** — tabele dense și unreadable. Vreau:
   - Coloane sortabile cu indicator
   - Row hover + expand-on-click pentru detalii
   - Pagination clear
   - Filtru search persistent în URL
   - Bulk actions vizible în top tabel
4. **Quick actions vizible** — fiecare row trebuie să aibă acțiuni dominante (aprobă/respinge) ca butoane clare, nu icoane mici.
5. **Empty states** — pe tab-uri fără date, mesaje + CTA clear (ex: "Niciun user pending. ✓ Toți sunt aprobați.")
6. **Modal-uri inline** — multe modaluri (assign, edit, approve) — toate trebuie să aibă același feel, închidere prin ESC + click outside, focus trap.
7. **Audit log readable** — actual e tabel plat. Vreau timeline cu icoane per tip de acțiune + filtru pe tip + filtru pe user.
8. **Financiar tab** — chart-uri simple pentru total escrow, total released, commission earned (pure CSS sau SVG inline).
9. **Mobile responsive** — actualmente unutilizable pe phone. Adminul SUSȚINE platformă, are nevoie să aprobe rapid din mobil.
10. **Notification urgency** — bell-ul din topbar trebuie să arate "high priority" actions dintr-un colț (dispute escalation, payout failed).

## Constrângeri
- **Limba română**
- **Nu schimba API contracts** — toate endpoint-urile `/api/admin/*` rămân
- **Păstrează numerele tabului în URL** (?tab=...)
- **Output**: `AdminDashboard.jsx` modificat (e fișier mare ~3500 linii — poți să-l refactorezi în sub-componente private dacă vrei)

## Tab-uri specifice menționate
Importante de îmbunătățit prioritar: **Aplicații** (flow nou marketplace apply), **Dispute** (admin arbitrage critical), **Apeluri identitate** (KYC manual schedule).
