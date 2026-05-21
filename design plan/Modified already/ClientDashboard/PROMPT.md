# Claude Design — ClientDashboard

## Context platformă
ESCRO — platformă B2B românească de escrow. Acest dashboard e folosit pentru DOUĂ roluri: `company` (SRL beneficiar care contractează experți) și `individual` (persoană fizică beneficiar). Ambii sunt beneficiari (clienți). Companii pot fi ȘI prestatori pe PM sub-tasks. Individualii sunt strict beneficiari.

## Această pagină
- **Rute**: `/company/dashboard?tab=<overview|lucrari|approvals>` și `/individual/dashboard?tab=<...>`
- **Cine vede**: `role='company'` sau `role='individual'`
- **Scop**: homepage activ pentru beneficiar — vede proiectele postate + acțiunile necesare

## User flow
1. Login → `/company/dashboard` sau `/individual/dashboard`
2. Vede badge-uri (Cont verificat, KYC verificat — KYC ASCUNS pentru individual)
3. Banner-e condiționale:
   - "Așteaptă apelul de verificare" (admin neapprobat încă)
   - "Verifică-ți identitatea KYC" (doar pentru company, NU individual)
   - "Ai un livrabil de aprobat" (prestator a livrat milestone)
   - "Ai un contract de semnat"
   - "Recenzii de lăsat"
   - "Ai un milestone de livrat" (doar pentru company care e prestator pe sub-task)
4. Stats: proiecte active, completate, escrow blocat, total released
5. Tab "Proiecte & Taskuri": listă cu filtre status
6. Tab "De aprobat" (urgent): tasks pending approval

## Componente cheie pe pagină
- Page header cu badges + butoane "Experti" / "Proiect nou"
- Banner urgent (pulse animation) pentru pending_client_approval
- Banner-e condiționale per status
- Wallet hero (escrow blocat + released)
- Grid stats
- Pendings reviews banner
- Tabs (Acasă / Proiecte & Taskuri / De aprobat)
- Modal: PostTaskModal (creare task)

## Layout
**Folosește Shell.jsx**.

## Ce vreau să îmbunătățești PRIORITAR

1. **Eyebrow header diferențiat per rol** — actual e doar "Dashboard · Companie" hardcodat. Vreau:
   - Pentru company: "Dashboard · Companie" cu icon building
   - Pentru individual: "Dashboard · Persoană fizică" cu icon user
2. **Wallet hero** — afișează clar:
   - Escrow blocat (în custodie, neaprobat)
   - Total cheltuit (released to prestatori)
   - Cu icoane lock vs check
3. **Urgent banner pulse** — actual există dar polish:
   - Animație subtle, not jarring
   - Click oriunde pe banner → tab approvals
   - Lista task-urilor truncated cu "+X more"
4. **Banner stacking** — actual banner-ele se acumulează vertical = mess. Vreau "alert hub" centralizat sus.
5. **Banner KYC ascuns pentru individual** — verifică în condition: `user.role !== 'individual'`. La individual, doar "Cont verificat" badge (nu KYC).
6. **Banner "Așteaptă apel" pentru individual neaprobat** — mesaj clar: "După apelul de verificare, plățile se fac direct cu cardul fără Stripe onboarding suplimentar."
7. **Project list tab** — vezi PostTaskModal pentru creare. Refactor:
   - Cards expandable cu title, status, partener, progres, deadline
   - "Next action" highlighted (ex: "Aprobă milestone X")
   - Filtru status persistent
8. **Empty states**:
   - Companies fără proiecte: "Postează primul tău proiect" → /create-project
   - Individuals fără proiecte: "Caută un expert în Directory" → /directory
   - Companii care pot fi prestatori: "Aplică la proiecte în Marketplace" → /marketplace
9. **Mobile experience** — stats stackable, banner-e compacte.

## Constrângeri
- **Limba română**
- **Nu schimba API contracts** — `/api/projects`, `/api/trust-profiles/my-trust-profile`, `/api/stripe/status`
- **Pentru individual**: HIDE complet badge KYC + banner Stripe — sunt beneficiari-only, plătesc cu cardul direct
- **Output**: `ClientDashboard.jsx` + opțional ajustări pe `PostTaskModal.jsx`
