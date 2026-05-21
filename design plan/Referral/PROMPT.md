# Claude Design — Referral

## Context platformă
ESCRO — platformă B2B românească de escrow. Fiecare user (non-admin) primește un cod referral unic la register. Codul are usage_count + max_uses (default 1). Userul invitat primește bonus trust level + identity points; userul inviter primește bonus points.

## Această pagină
- **Rută**: `/referral`
- **Cine vede**: `role='expert'` sau `role='company'` (per Shell sidebar; verifică dacă și individual ar trebui)
- **Scop**: vezi codul, share, vezi cine s-a înregistrat cu codul tău

## User flow
1. User click "Recomandă" în sidebar
2. Vede codul lui referral cu URL share
3. Copy to clipboard
4. Share pe social (links direct)
5. Vede lista celor înregistrați (status: registered / verified / project_done)
6. Vede recompensa câștigată

## Componente cheie pe pagină
- Page header
- Card cu codul + URL share + copy button
- Stats: invitați, verificați, completați
- Lista referrals
- Reward explained (cât primești, cât primesc ei)

## Layout
**Folosește Shell.jsx**.

## Ce vreau să îmbunătățești PRIORITAR

1. **Code display hero** — actual e simplu text. Vreau:
   - Codul mare, font monospace, în box cu border accent
   - Click → copy + toast "Copiat!"
   - URL complet cu QR code generat (CSS pur sau SVG)
2. **Share buttons** — direct cu icons:
   - WhatsApp (pre-filled mesaj)
   - Email (mailto with subject)
   - Facebook / LinkedIn
3. **Reward explainer** — clar:
   - "Primești +5 puncte trust pentru fiecare cont creat cu codul tău"
   - "Persoana invitată primește +20 puncte identitate"
4. **Stats cards**:
   - Total invitați (number)
   - Verificați (number)
   - Trust points câștigate
5. **Referrals list table**:
   - Email/nume invitat
   - Data signup
   - Status badge (registered, verified, project_done)
6. **Empty state**: "Niciun invitat încă. Începe să recomanzi!" + share buttons.
7. **Active code state** — dacă usage_count >= max_uses (deactivated): banner gri "Codul tău a expirat (folosit X/X)" + opțional: "Cere admin să crească max_uses".
8. **Mobile UX** — copy button mare touch, share native API on mobile.

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-ul** `/api/referrals/my-code`
- **Cod single-use default** (max_uses=1) — codul devine inactiv după folosire
- **Output**: `Referral.jsx` modificat
