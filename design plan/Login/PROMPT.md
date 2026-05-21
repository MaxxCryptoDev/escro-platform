# Claude Design — Login

## Context platformă
ESCRO — platformă B2B românească de escrow pentru servicii profesionale.

## Această pagină
- **Rută**: `/login`
- **Cine vede**: vizitatori publici
- **Scop**: autentificare existent user; redirect la dashboard-ul corespunzător rolului

## User flow
1. User completează email + parolă
2. Click "Login" → POST /api/auth/login
3. La success: salvează token în localStorage + redirect:
   - admin → `/admin/dashboard`
   - expert → `/expert/dashboard`
   - individual → `/individual/dashboard`
   - company → `/company/dashboard`
4. La eroare: afișează mesaj clar (invalid credentials, account suspended, etc.)

## Componente cheie pe pagină
- Logo / brand top
- Form: email input + password input
- Buton primar "Login"
- Link "Forgot password" → `/forgot-password`
- Link "N-ai cont? Înregistrează-te" → `/register`
- Error message area

## Layout
**NU folosește Shell.jsx** (pagină publică). Layout dedicat — centrat vertical, max-width 400-460px.

## Ce vreau să îmbunătățești PRIORITAR

1. **Form polish** — focus states clare pe input, password toggle (eye icon), enter-to-submit cu loading state pe buton.
2. **Error handling vizibil** — actual e simplu text; vreau banner cu icon roșu, dismissible.
3. **Brand consistency** — logo + ton fontului trebuie să se potrivească cu landing page.
4. **Mobile UX** — pe iPhone keyboard nu trebuie să acopere submit button; input-uri 16px (anti-zoom iOS).
5. **Accessibility** — autocomplete attributes (email, current-password); aria-labels; tab order corect.
6. **Trust signal subtle** — "Securizat prin SSL" sau lacăt mic sub form.
7. **Loading state** — button arată spinner + dezactivat în timpul request-ului.

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-ul** `/api/auth/login` sau response shape
- **Păstrează linkurile către** `/forgot-password` și `/register`
- **Output**: `Login.jsx` modificat
