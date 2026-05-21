# Claude Design — AssignmentDetail

## Context platformă
ESCRO — platformă B2B românească de escrow. PM (Project Management) workflow: client postează un task mare, admin sau client adaugă sub-asignmente (assignments), prestatori sunt asignați pe fiecare sub-asignment. AssignmentDetail = pagina unei sub-asignări PM.

## Această pagină
- **Rută**: `/project/:projectId/assignment/:assignmentId`
- **Cine vede**: client task, expert/company asignat pe sub-task, admin, sau (marketplace) anyone autentificat dacă sub-task e open
- **Scop**: workflow specific sub-asignării — similar cu ProjectDetail dar pentru un PM sub-task

## User flow
1. Client / prestator click pe sub-asignment din pagina task-ului mare PM
2. Vede detalii sub-asignment: title, descriere, budget, milestones
3. Acțiuni:
   - **Expert/company asignat**: accept (expert-accept) / reject (expert-reject)
   - **Client task**: aprobă livrabil (client-approve) / respinge (client-reject)
4. Semnează contract sub-asignment
5. Livrare milestones (similar ProjectDetail)
6. Final: review

## Componente cheie pe pagină
- Header cu titlu sub-task + breadcrumb spre task-ul mare
- Tabs: Details / Chat / Contracts / Milestones
- Action buttons: Accept assignment / Reject (expert side)
- Modaluri: ReviewModal, SignatureModal

## Layout
**Folosește Shell.jsx**.

## Ce vreau să îmbunătățești PRIORITAR

1. **Breadcrumb context** — actualul lipsește. Vreau:
   - "PM Task: [titlu] / Sub-asignment: [titlu]"
   - Click pe PM Task → înapoi la pagina parent
2. **Action buttons prominent** — pentru prestator nou-asignat, butoanele "Accept" / "Reject" trebuie să fie evidente sus, nu pierdute în lista de tab-uri.
3. **Status badges clear**:
   - `pending_expert_approval` → "Așteaptă acceptarea ta"
   - `pending_client_approval` → "Așteaptă aprobarea clientului"
   - `active` / `in_progress` → "În lucru"
   - `review` / `completed` → vizibil
4. **Layout symetric cu ProjectDetail** — consistency, dar accentuat că e SUB-PROIECT.
5. **Empty state pentru tab-uri** dacă nu sunt încă contracts / milestones.
6. **Mobile responsive** — la fel ca ProjectDetail.
7. **Reviews modal trigger** — după completed, banner clar "Lasă recenzie" — pe AssignmentDetail.

## Constrângeri
- **Limba română**
- **Nu schimba API contracts** — `/api/tasks/:taskId/assignments/:id/*`
- **Output**: `AssignmentDetail.jsx` modificat; modaluri rămân ca sunt
