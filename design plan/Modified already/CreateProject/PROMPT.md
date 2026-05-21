# Claude Design — CreateProject

## Context platformă
ESCRO — platformă B2B românească de escrow. Beneficiarii (company, individual) postează proiecte. 3 tipuri de servicii:
- **Matching**: platforma ajută să găsești expert
- **Direct**: alegi un anumit expert (email)
- **Project Management (PM)**: proiect mare cu sub-tasks supervizate de admin

## Această pagină
- **Rută**: `/create-project`
- **Cine vede**: orice user autentificat (cu kyc='verified')
- **Scop**: wizard 4 pași pentru creare proiect

## User flow
1. **Pasul 1 — Brief**: 
   - Selectează service_type (Matching / Direct / PM)
   - Titlu + descriere
2. **Pasul 2 — Buget & timeline**:
   - Buget RON (integer)
   - Timeline zile
   - Pentru Direct: email expert
3. **Pasul 3 — Milestone-uri** (NU se afișează pentru PM):
   - Lista milestone-uri cu titlu + descriere livrabil + procent din buget
   - Validare: suma procente = 100%
4. **Pasul 4 — Revizuire**:
   - Sumar complet
   - Comision platformă (5%)
   - Total escrow (buget + comision)
   - Submit

## Componente cheie pe pagină
- Step indicator (4 pași orizontali cu numere + linii conectoare)
- Wizard form (un singur step vizibil pe rând)
- Navigation: "Înapoi" / "Următorul" / "Submit"
- Pe pasul 3: cards per milestone cu adăugare/ștergere
- Validation errors per step
- Success state după submit

## Layout
**Folosește Shell.jsx**. Wizard centrat, max-width 680px.

## Ce vreau să îmbunătățești PRIORITAR

1. **Step indicator polish** — actual e funcțional dar plain. Vreau:
   - Numerele într-un circle, linia conectoare animată
   - Step done = check verde, current = pulse subtle, future = grey
   - Click pe step done → poți reveni
2. **Service type selection (Step 1)** — actual e listă butoane stiv. Vreau:
   - 3 carduri vizuale mari cu icon + nume + descriere
   - Card selectat: border accent + check icon
   - Hover effect subtle
3. **Buget input** — actual `<input type="number">` cu min=0 (acceptă 0). Vreau:
   - `step=1 min=1` (integer RON only)
   - Format vizual cu separator mii: "1 000 RON"
   - Helper text: "Suma totală va fi blocată în escrow"
4. **Milestone management (Step 3)** — actual e funcțional dar plain. Vreau:
   - Cards drag-to-reorder (sortable cu icon mâner)
   - Procente cu slider VS input numeric (visual feedback)
   - Suma procente vizuală: bar plin (100%) cu indicator dacă != 100
   - Validation inline (nu doar mesaj de eroare general)
5. **Pas Revizuire** — actual e plat. Vreau:
   - Sumar visual cu icons per secțiune
   - Comision evidențiat (informativ, nu surprize)
   - Total escrow în box prominent (RON mari, monospace)
   - Disclaimer: "Vei putea anula DOAR înainte de semnarea contractului"
6. **Validare per-step** — actual e modală pe submit. Vreau:
   - Validare inline pe field (când userul completează)
   - "Next" disabled până când step valid
   - Mesaje friendly
7. **Auto-save draft** — wizard lung; risk de pierdere date. Vreau:
   - localStorage backup la fiecare schimbare
   - "Te-ai întors la draft" banner dacă reload
8. **Success state** — actual e simplu mesaj + auto-redirect. Vreau:
   - Visual "✓ Proiect creat!" cu next steps clare:
     - Pentru PM: "Așteaptă admin approval"
     - Pentru direct: "Vom contacta expertul [email]"
     - Pentru matching: "Postul e în marketplace — experții pot aplica"
9. **Mobile UX** — wizard pe touch:
   - Fields full-width
   - Step indicator collapsable / dot-only
   - Sticky bottom bar cu Înapoi / Următorul

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-ul** `/api/projects` sau `/api/tasks`
- **Păstrează service_type values**: 'matching', 'direct', 'project_management'
- **Output**: `CreateProject.jsx` modificat
