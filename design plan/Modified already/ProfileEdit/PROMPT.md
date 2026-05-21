# Claude Design — ProfileEdit

## Context platformă
ESCRO — platformă B2B românească de escrow. ProfileEdit = pagina de editare a propriului profil + upload portofoliu.

## Această pagină
- **Rută**: `/profile-edit`
- **Cine vede**: orice user autentificat (non-admin)
- **Scop**: editează datele profile + adaugă itemi portofoliu

## User flow
1. User click "Profilul meu" în sidebar (Profile section)
2. Pagina afișează form cu câmpuri pre-completate
3. Editează: nume, email, telefon, companie (pentru company/expert), industrie, expertise, bio, experiență
4. Upload avatar (poză profil)
5. Pentru prestatori: secțiune "Portofoliu" — adaugă item cu titlu, descriere, fișier, client, anul, categorie
6. Save → POST/PUT către `/api/users/profile`

## Componente cheie pe pagină
- Header "Profilul meu"
- Avatar uploader (large)
- Form principal (cards / sections)
- Secțiune Portofoliu (doar prestatori): grid cu items existenți + buton "Adaugă item"
- Modal upload portofoliu (actual: 5x window.prompt - PROBLEM major UX)
- Notificări preferences (email + in-app toggle)

## Layout
**Folosește Shell.jsx**.

## Ce vreau să îmbunătățești PRIORITAR

1. **Multi-section layout** — actual e form long. Vreau:
   - Card 1: "Identitate" (avatar + nume + email + telefon)
   - Card 2: "Business" (doar expert/company: company, CUI, industrii)
   - Card 3: "Profil profesional" (expertise textarea, bio, experiență)
   - Card 4: "Portofoliu" (doar prestatori)
   - Card 5: "Preferințe notificări"
2. **PORTOFOLIU UPLOAD - CRITICAL FIX** — actual folosește `window.prompt()` x5 consecutiv. ABERANT UX. Vreau:
   - Modal proper cu form ALL fields visible în același timp:
     - File input (drag & drop zone)
     - Title input
     - Description textarea
     - Client name input
     - Year input (number, max=anul curent)
     - Category select (dropdown)
     - Results textarea
     - Technologies tags input
     - Featured checkbox
   - Validation client-side
   - Submit → POST + close modal + reload portfolio
3. **Avatar upload** — drag-drop zone cu preview, crop tool opțional. Fallback la `<Avatar>` cu inițiale dacă nu există URL.
4. **Portfolio items grid** — actual e listă. Vreau:
   - Grid responsive 2-3 coloane pe desktop, 1 pe mobile
   - Per item: thumbnail/icon, title, year, client + Edit/Delete buttons
   - Drag-to-reorder (sortable)
   - Featured items badge
5. **Form sticky save button** — pe scroll lung, butonul "Salvează" trebuie să rămână accesibil (fixed bottom sau sticky top).
6. **Notification preferences** — toggle switches frumoase, nu checkboxes plain.
7. **Required field indicators** — asterix roșu pe required, helper text sub fields.
8. **Save feedback** — actual e text simplu. Vreau toast/banner success.
9. **Mobile UX** — cards stackable, modal full-screen.

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-urile** `/api/users/profile`, `/api/users/portfolio`
- **Output**: `ProfileEdit.jsx` modificat. Refactor portfolio modal din `window.prompt()` la form proper e PRIORITATE ABSOLUTĂ.
