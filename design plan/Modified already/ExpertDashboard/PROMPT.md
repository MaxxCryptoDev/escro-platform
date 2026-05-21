# Claude Design — ExpertDashboard

## Context platformă
ESCRO — platformă B2B românească de escrow. Expert = PFA/specialist care oferă servicii și primește plăți după ce finalizează milestones.

## Această pagină
- **Rută**: `/expert/dashboard?tab=<overview|lucrari>`
- **Cine vede**: doar `role='expert'`
- **Scop**: homepage activ pentru expert — vede ce are de făcut + stats personale

## User flow
1. Expert login → `/expert/dashboard`
2. Vede badge-uri status (Cont verificat, KYC verificat)
3. Vede banner-e cu acțiuni necesare:
   - "Verifică-ți identitatea" (dacă KYC neîncheiat — link Stripe Connect)
   - "Ai un milestone de livrat" (dacă există proiecte unde el e prestator cu pending_deliveries)
   - "Ai un livrabil de aprobat" (dacă expert posted task)
   - "Ai un contract de semnat"
   - "Recenzii de lăsat"
4. Vede stats: proiecte active, completate, trust level, total câștigat
5. Tab "Proiecte & Taskuri" — listă proiecte cu progres
6. Acțiuni rapide: "Profil public", "Găsește proiecte" (Marketplace)

## Componente cheie pe pagină
- Page header cu badges + buttons primare
- Banner-e condiționale (acțiuni necesare)
- Stats grid (proiecte, trust, earnings)
- Wallet hero card (banii câștigați)
- Tabs (Acasă / Proiecte & Taskuri)
- Activitate recentă feed

## Layout
**Folosește Shell.jsx**.

## Ce vreau să îmbunătățești PRIORITAR

1. **Hero state pentru wallet** — actual e mediocru. Vreau:
   - Sumă totală câștigată mare, font monospace
   - Sub: net disponibil (pentru retragere) + "în procesare" + "eșuate" (cu link spre wallet)
   - Mini sparkline (CSS / SVG simplu) cu earnings ultima lună
2. **Acțiuni necesare prioritizate** — banner-ele actuale (livrabile / contracte / reviews) sunt secvențiale și se acumulează vertical. Vreau:
   - Un singur "alert center" sus, cu liste expandable
   - Cea mai urgentă acțiune evidențiată (ex: dispute escalation)
   - Click pe acțiune → direct la screenul corect
3. **Stats grid** — actuala paragraf "X active · Y completed · Trust L Z" e sărac. Vreau:
   - 4 card-uri mici cu trend (vs luna trecută)
   - Iconuri + culoare semantică
4. **KYC banner refactor** — pentru expert care e prestator, banner-ul "Verifică-ți identitatea" e prima impresie după register. Trebuie:
   - Visual prominent dar nu agresiv
   - 3-state clar: așteaptă call → pot începe KYC → completat
   - Buton "Începe verificarea KYC" mare cu icon scut
5. **Tab "Proiecte & Taskuri"** — table-ul curent e dens. Vreau cards expandable cu:
   - Title + status badge
   - Progress bar
   - "Next action" (ce trebuie să facă expertul acum)
   - Partener (avatar + nume)
   - Click → ProjectDetail
6. **Empty states** — "Niciun proiect activ" → CTA "Aplică la Marketplace" cu link spre `/marketplace`.
7. **Mobile-first** — Stats cards stackable, banner-e collapsible.
8. **Real-time freshness** — folosește Socket.io ca să update-eze badge counts când vin notificări noi (deja există context).

## Constrângeri
- **Limba română**
- **Nu schimba API contracts** — `/api/projects`, `/api/trust-profiles/my-trust-profile`, `/api/wallet/balance`
- **Păstrează badge-urile**: AccountVerifiedBadge, KycVerifiedBadge (sunt expuse user din verification_date + kyc_status)
- **Output**: `ExpertDashboard.jsx` modificat
