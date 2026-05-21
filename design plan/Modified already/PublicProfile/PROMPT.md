# Claude Design — PublicProfile

## Context platformă
ESCRO — platformă B2B românească de escrow. PublicProfile = pagină vizibilă altor useri când click pe nume/avatar partner. Trust building important.

## Această pagină
- **Rută**: `/profile/:userId`
- **Cine vede**: orice user autentificat
- **Scop**: profil public — trust building (verificare, experiență, portofoliu, recenzii)

## User flow
1. User click pe nume sau avatar al partener (în ProjectDetail, Directory, etc.)
2. Vede:
   - Identity card (nume, avatar, rol, location, badges)
   - Expertise / industrii
   - Bio
   - Trust score + level
   - Stats: proiecte completed, average rating
   - Portfolio items
   - Reviews (fetched, but currently NOT rendered - bug)
3. Optional: link "Trimite mesaj" (dacă au proiect comun)

## Componente cheie pe pagină
- Hero card cu identity
- Trust profile section (level badge, score, milestones)
- Portfolio grid
- Reviews section (BROKEN currently — fetched dar nu rendered)
- Completed projects list
- Industries chips

## Layout
**Folosește Shell.jsx**.

## Ce vreau să îmbunătățești PRIORITAR

1. **Hero card refactor** — actual e simple. Vreau:
   - Avatar mare în stânga
   - Coloana dreapta: nume, role tag, location, badges (KYC verified, Cont verificat)
   - Trust level badge prominent (L1, L2, L3, L4)
   - Action button "Trimite mesaj" sau "Vezi proiectele comune"
2. **Trust signals** — pe lângă badges, afișează:
   - Trust score visual (bar / star rating)
   - "Verificat de admin pe [data]"
   - "Membru din [data]"
   - "X proiecte finalizate"
3. **REVIEWS RENDERING - CRITICAL FIX** — actual fetched but never displayed. Vreau:
   - Secțiune "Recenzii" cu rating mediu + count
   - Lista review-uri cu: stars, comment, autor (anonim sau name), data proiect
   - Star rating breakdown (cât 5 stele, cât 4, etc.)
4. **Portfolio grid** — similar cu ProfileEdit dar read-only:
   - Grid 2-3 col responsive
   - Click pe item → lightbox / modal cu detalii complete
   - Filter pe categorie / industrie
5. **Completed projects** — listare nume proiecte completate (fără sensitive data — emails, sume).
6. **Sticky contact CTA** — pe scroll, buton "Contactează" rămâne accesibil.
7. **Empty states** pentru fiecare secțiune:
   - "Niciun item în portofoliu încă"
   - "Niciun review încă"
8. **Mobile UX** — hero stackable, grids responsive.

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-urile** `/api/users/:userId/public-profile`, `/api/reviews/user/:userId`, `/api/users/:userId/completed-projects`
- **Output**: `PublicProfile.jsx` modificat. Rendering reviews e prioritate absolută — sunt deja fetched, doar de afișat.
