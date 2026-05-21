# Claude Design — Directory

## Context platformă
ESCRO — platformă B2B românească de escrow. Directory = listing public al prestatorilor (expert + company) pentru ca beneficiarii să găsească colaboratori.

## Această pagină
- **Rută**: `/directory`
- **Cine vede**: orice user autentificat
- **Scop**: descoperă experți/companii verificate; click → PublicProfile

## User flow
1. User click "Parteneri" / "Director parteneri" în sidebar
2. Vede grid cu toți prestatorii verificați KYC
3. Caută după nume / expertise
4. Filtrează după industrie / rol (expert vs company)
5. Click pe user → `/profile/:userId` (PublicProfile)
6. Optional (future): "Invită la proiect" direct din card

## Componente cheie pe pagină
- Page header "Director parteneri"
- Search input
- Filter chips (industrie, rol)
- Grid card-uri user-i
- Per card: avatar, nume, expertise, industrii chips, trust level, completed projects count

## Layout
**Folosește Shell.jsx**.

## Ce vreau să îmbunătățești PRIORITAR

1. **Card design polish** — actual cards sunt simple. Vreau:
   - Avatar mare în top
   - Nume + rol badge dedesubt
   - Trust level badge (L1-L4) cu color coding
   - Expertise summary (1-2 fraze truncate)
   - Industrii chips (max 3 + "+X more")
   - Stats: "X proiecte completate · ⭐ Y/5"
   - Hover: lift + border accent
2. **Filter bar polish** — chips selectabile (deselectabile), filter combinator clear.
3. **Sort options** — recent activ, trust descending, rating descending.
4. **Search by industries** — actual search e doar pe `expertise` field. Vreau să caute și în `industries[]` (multi).
5. **Empty states**:
   - Niciun rezultat după filtre: "Schimbă filtrele" + reset button
   - Niciun expert verificat: "Niciun expert încă disponibil" (improbabil în practică)
6. **Pagination / infinite scroll** — dacă listing > 20-30.
7. **Quick stats** sus: "Total experți: 24 · Companii: 8" — trust building.
8. **Mobile UX** — grid → 1 col, filters → collapsable.

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-ul** `/api/users/`
- **Filtru pe kyc_status='verified'** rămâne (doar verified prestatori)
- **Output**: `Directory.jsx` modificat
