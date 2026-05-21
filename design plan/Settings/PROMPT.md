# Claude Design — Settings

## Context platformă
ESCRO — platformă B2B românească de escrow. Settings = pagina pentru account management: password change, email notifications, GDPR data export/delete, T&C acceptance.

## Această pagină
- **Rută**: `/settings`
- **Cine vede**: orice user autentificat
- **Scop**: management cont — securitate, preferințe, legal

## User flow
1. User click "Settings" (din topbar user menu sau sidebar)
2. Vede secțiuni:
   - Securitate: change password, sesiuni active, 2FA (future)
   - Preferințe: email notifications, in-app notifications
   - Date personale: export GDPR (download ZIP)
   - Cont: dezactivare cont
   - Legal: link T&C, accept T&C (dacă există versiune nouă) — modal TermsAcceptanceModal
   - Identity verification: link la VerificationAckModal (acknowledgement KYC call)

## Componente cheie pe pagină
- Page header "Settings"
- Sections / cards stiv:
  - Schimbare parolă (form)
  - Preferințe notificări (toggles)
  - GDPR (export + delete)
  - T&C info
  - Identity verification status
- Modaluri: TermsAcceptanceModal, VerificationAckModal

## Layout
**Folosește Shell.jsx**.

## Ce vreau să îmbunătățești PRIORITAR

1. **Section cards** clare — fiecare secțiune în card propriu cu titlu + descriere + acțiune.
2. **Schimbare parolă**:
   - Input current password
   - Input new password + strength indicator
   - Input confirm new password
   - Submit cu loading + success state
   - După schimbare: opțional auto-logout (security best practice) cu warning
3. **Notification toggles** — switches frumoase (nu checkbox):
   - Email notifications (master + per-tip dacă vrem detaliat)
   - In-app notifications
4. **GDPR section**:
   - "Exportă datele mele" buton → download ZIP cu toate datele
   - "Șterge contul" buton (red) cu warning modal:
     - "Vrei să-ți ștergi contul? Acțiunea e ireversibilă..."
     - Block dacă escrow held > 0 sau payout pending
5. **Identity verification info**:
   - Status badge "Cont verificat" / "Așteaptă call"
   - Dacă neacknowledged (verification_call_acknowledged_at null): show VerificationAckModal trigger button
6. **T&C section**:
   - Versiunea curentă + dată acceptare
   - Buton "Vezi T&C" → modal sau /terms
   - Dacă requires re-acceptance: banner amber prominent
7. **Logout** button mare (danger zone) jos.
8. **Mobile UX** — sections stack, modal-uri full-screen.

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-urile** `/api/auth/change-password`, `/api/me/account`, `/api/me/export`
- **Modal păstrare**: TermsAcceptanceModal, VerificationAckModal
- **Output**: `Settings.jsx` modificat
