# Claude Design — ResetPassword

## Context platformă
ESCRO — platformă B2B românească de escrow.

## Această pagină
- **Rută**: `/reset-password?token=...`
- **Cine vede**: cineva care a primit email cu reset link
- **Scop**: set parolă nouă cu token valid

## User flow
1. User click pe link din email (token în query string)
2. Pagina extrage token din URL
3. User completează parolă nouă + confirmare
4. Submit → POST /api/auth/reset-password cu {token, password}
5. La succes: notice + redirect către `/login`
6. La eroare (token invalid/expirat): mesaj clar + link spre forgot password

## Componente cheie pe pagină
- Input password nou
- Input confirmare password
- Strength indicator
- Buton "Schimbă parola"
- Error states (token invalid, mismatch)

## Layout
**NU folosește Shell.jsx**. Pagină centrată, max-width 460px.

## Ce vreau să îmbunătățești PRIORITAR

1. **Password strength** — bar vizual sub input (slab/mediu/puternic/foarte puternic) cu culori variabile.
2. **Show/hide password** — toggle eye icon pe fiecare input.
3. **Confirmare matching** — feedback real-time când userul tastează în field-ul de confirmare (✓ verde dacă match, ✗ roșu dacă nu).
4. **Token expirat handling** — dacă token e invalid/expirat, pagina afișează un state dedicat cu CTA "Solicită link nou" → forgot password.
5. **Success state** — după reset reușit, pagina afișează succes vizual (icon mare + mesaj) timp de 2-3 sec, apoi redirect automat la login.
6. **Anti-pattern** — NU pre-completa email-ul în pagină (security via obscurity).

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-ul** sau response shape
- **Token vine în URL query string** — citește cu useSearchParams
- **Output**: `ResetPassword.jsx` modificat
