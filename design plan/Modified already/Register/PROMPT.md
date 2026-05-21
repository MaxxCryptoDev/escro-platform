# Claude Design — Register

## Context platformă
ESCRO — platformă B2B românească de escrow pentru servicii profesionale. Userii pot fi `expert` (PFA/specialist), `company` (SRL prestator), `individual` (persoană fizică beneficiar — clienții) sau admin (nu se înregistrează prin acest formular).

## Această pagină
- **Rută**: `/register`
- **Cine vede**: vizitatori publici
- **Scop**: înregistrare cont nou cu selectare rol + date personale + date business (pentru prestatori) + cod referral opțional

## User flow
1. User aterizează din landing sau din link referral (URL `?ref=ABC123`)
2. Selectează tip de cont: Expert / Companie / Persoană fizică
3. Completează: nume, prenume, email, parolă, telefon
4. Pentru expert/company (prestatori): completează și CUI, denumire firmă, industrii (multi-select), expertise (textarea), experiență
5. Acceptă T&C (checkbox)
6. Submit → POST /api/auth/register
7. Redirect la dashboard-ul corespondent rolului

## Componente cheie pe pagină
- Selector rol (3 carduri vizuale)
- Form personal: nume, prenume, email, password, telefon
- Form business (condițional, doar prestatori): CUI, denumire, industrii (chips selectabile), expertise (textarea cu placeholder)
- Câmp cod referral (auto-fill dacă vine din URL)
- Checkbox T&C cu link
- Buton submit

## Layout
**NU folosește Shell.jsx**. Pagină mai mare decât Login (mai multe câmpuri) — max-width 560-640px, layout vertical.

## Ce vreau să îmbunătățești PRIORITAR

1. **Role selector cu impact vizual** — actual e o listă de butoane. Vreau 3 carduri mari clickabile cu iconuri + descrieri scurte ("Expert: ofer servicii ca specialist", "Companie: avem servicii ca firmă", "Persoană fizică: am nevoie de servicii").
2. **Progressive disclosure** — câmpurile business apar/dispar lin (animație) când userul schimbă rolul. Pentru `individual` nu se afișează deloc câmpurile business (CUI etc.).
3. **Industrii multi-select** — actual e scroll list cu maxHeight 180px. Pe mobile e greu. Vreau chips selectabile sau combobox cu autocomplete.
4. **Validation client-side în timp real**:
   - Email: regex strict
   - Telefon: format RO (+40 sau 07X X XXX XXX)
   - CUI: format RO valid (cifre, control digit ANAF)
   - Parolă: minim 8 chars + indicator strength (slab / mediu / puternic)
5. **Referral code** — actual e ascuns într-un badge dacă vine din URL. Vreau vizibil + editabil (user să poată corecta dacă a fost paste greșit) cu state "Aplicat" / "Invalid".
6. **T&C** — checkbox cu link "Am citit termenii" → modal sau pagină nouă (NU navighează pierzând datele).
7. **Submit button** — mare, vizibil, cu loading state + dezactivat dacă formular incomplet.
8. **Mobile UX** — actual scrolling e nesfârșit. Posibil să grupezi în "steps" expandable sau să optimizezi vertical spacing.
9. **Error messaging** — granular pe field, nu doar un banner generic.

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-ul** sau response shape
- **Păstrează roles**: expert, company, individual
- **Păstrează industrii** ca lista existentă (mai multe selectabile)
- **Output**: `Register.jsx` modificat
