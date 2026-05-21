# Claude Design — ForgotPassword

## Context platformă
ESCRO — platformă B2B românească de escrow pentru servicii profesionale.

## Această pagină
- **Rută**: `/forgot-password`
- **Cine vede**: vizitatori publici (cineva care a uitat parola)
- **Scop**: trimite email cu link de reset al parolei

## User flow
1. User introduce email
2. Click "Trimite link" → POST /api/auth/forgot-password
3. Indiferent dacă emailul există în DB sau nu, mesaj generic "Dacă email-ul există, primești instrucțiuni"
4. User verifică inbox-ul (link se trimite cu token expirable 1h)
5. Click pe link → ajunge la `/reset-password?token=...`

## Componente cheie pe pagină
- Input email
- Buton "Trimite link"
- Mesaj success (după submit)
- Link "Înapoi la login"

## Layout
**NU folosește Shell.jsx**. Layout minim — similar cu Login, centrat, max-width 400-460px.

## Ce vreau să îmbunătățești PRIORITAR

1. **Success state clear** — după submit, înlocuiește formul cu mesaj cu icon (mail) "Verifică inbox-ul tău".
2. **Prevent abuse** — buton disabled timp de 30 sec după submit (anti-spam).
3. **Brand consistency** — exact același feel cu Login + Register.
4. **Accessibility** — autocomplete="email", aria-describedby pentru ajutor.
5. **Securitate UX** — mesaj generic (NU "email-ul nu există în sistem" — leak de info).
6. **Mobile UX** — keyboard email pe mobile, submit button mare.

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-ul**
- **Output**: `ForgotPassword.jsx` modificat
