# Claude Design — MyProjects

## Context platformă
ESCRO — platformă B2B românească de escrow. MyProjects = listă completă proiecte/taskuri unde userul e parte (creator, prestator, sau asignat). Diferit de Dashboard care arată un overview.

## Această pagină
- **Rută**: `/my-projects`
- **Cine vede**: orice user autentificat (non-admin)
- **Scop**: listă completă a proiectelor user-ului cu filtre + search

## User flow
1. Click "Proiectele mele" în sidebar (Profile section)
2. Vede tabel cu toate proiectele
3. Filtrează după status (active / pending / completed / cancelled)
4. Sortează după dată / buget
5. Caută în titlu
6. Click pe rând → ProjectDetail

## Componente cheie pe pagină
- Page header cu titlu + count proiecte
- Filter bar: search + status filter
- Table (tbl-stack) cu coloane: Titlu, Status, Partener, Buget, Deadline, Acțiuni
- Empty states (no projects OR no match)

## Layout
**Folosește Shell.jsx**.

## Ce vreau să îmbunătățești PRIORITAR

1. **Hibrid table/cards** — actual table-only e dens pe mobile. Vreau:
   - Desktop: tabel cu sticky header
   - Mobile: cards verticale (deja CSS class `tbl-stack` ar trebui, dar verifică)
2. **Status chips colored** — folosește `StatusBadge` component din ui.jsx pentru consistency.
3. **Progress indicator inline** — coloană "Progres" cu bar mic vizual (% milestone-uri done).
4. **Filter persistence** — filtrul status în URL (`?status=active`).
5. **Bulk actions** opțional (low priority): selectați multiple proiecte cu checkbox → archive (future).
6. **Empty states** discriminate:
   - User fără proiecte: "Niciun proiect încă. Creează unul." → CTA `/create-project` sau "Aplică la Marketplace" pentru expert/company.
   - Filter goal: "Niciun proiect cu status [X]". 
7. **Sortabil** — click pe header coloană → sort asc/desc cu indicator.
8. **Click handlers** — întreg row clickable, nu doar un buton mic.

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-ul** `/api/projects`
- **Output**: `MyProjects.jsx` modificat
