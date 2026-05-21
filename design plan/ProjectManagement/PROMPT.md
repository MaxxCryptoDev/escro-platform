# Claude Design — ProjectManagement

## Context platformă
ESCRO — platformă B2B românească de escrow. PM workflow special: client postează un proiect MARE, admin sau client adaugă sub-asignmente, fiecare e atribuit unui prestator. ProjectManagement.jsx = vedere generală PM tasks (alternativă la ProjectDetail).

## Această pagină
- **Rută**: `/project-management`
- **Cine vede**: orice user autentificat
- **Scop**: vedere centralizată PM tasks + sub-asignmente

## User flow
1. User click "Project Management" (dacă există în sidebar — verifică) sau via link
2. Vede lista PM tasks
3. Per task: title, budget, count sub-asignmente, progres
4. Click → detail tab cu sub-asignmente
5. Admin / creator: poate adăuga sub-asignment, asigna prestator

## Componente cheie pe pagină
- Page header
- Lista PM tasks
- Per task: card cu sub-tasks listed (mini)
- Acțiuni: vezi detalii, adaugă sub-task (creator)

## Layout
**Folosește Shell.jsx**.

## Ce vreau să îmbunătățești PRIORITAR

1. **Card hierarchy** clar:
   - Card mare PM task
   - Sub-cards interior pentru fiecare sub-asignment (compact)
   - Progress bar combinat (% completed sub-asignments)
2. **Visual hierarchy** între PM și sub-tasks (indent / border line).
3. **Add sub-task CTA** prominent pentru creator.
4. **Status per sub-asignment** clar.
5. **Empty state**: "Niciun PM task încă. Creează unul" → /create-project cu PM selectat.
6. **Mobile UX** — cards stackable, sub-tasks compact.

## Constrângeri
- **Limba română**
- **Verifică dacă pagina e folosită** — poate fi orfană. Dacă da, sugerează merge cu MyProjects sau dedicated PM section.
- **Output**: `ProjectManagement.jsx` modificat
