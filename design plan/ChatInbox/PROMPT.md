# Claude Design — ChatInbox

## Context platformă
ESCRO — platformă B2B românească de escrow. ChatInbox = listă toate conversațiile userului per proiect. Mesajele rămân vizibile chiar dacă proiectul e completed/cancelled (read-only). Folosește Socket.io pentru update-uri real-time (dar NU e încă wired în Inbox — limitare cunoscută).

## Această pagină
- **Rută**: `/chat`
- **Cine vede**: orice user autentificat (non-admin)
- **Scop**: vede toate conversațiile cu partenerii din proiecte

## User flow
1. User click "Chat" în sidebar
2. Vede lista conversații (ordered by last_message_at DESC)
3. Per conversation: avatar partener, nume, ultima previzualizare mesaj, count unread, data ultimului mesaj
4. Pentru proiecte completed/cancelled: badge "Doar vizualizare"
5. Click pe conversation → `/project/:id?tab=chat`

## Componente cheie pe pagină
- Page header "Chat" + titlu
- Lista conversații (cards verticale)
- Per card: avatar, nume partener, project title, last message snippet, timestamp, unread badge, lock indicator (dacă proiect locked)
- Empty state când no conversations

## Layout
**Folosește Shell.jsx**. Max-width 880px, listă centrată.

## Ce vreau să îmbunătățești PRIORITAR

1. **Conversation card polish**:
   - Avatar mare partener (cu fallback inițiale color)
   - Linie 1: nume partener + timestamp
   - Linie 2: proiect title (small, muted)
   - Linie 3: last message snippet (truncated 1 line cu ellipsis)
   - Right: unread badge (count + accent color)
   - Border accent + bold text pentru unread
2. **Lock indicator** — pentru locked projects (completed/cancelled/rejected): badge mic gri "Finalizat — doar vizualizare" cu lock icon.
3. **Search bar** — top — filtru live după nume partener sau proiect.
4. **Group by**:
   - Active first (unread)
   - Recent (last 7 days)
   - Older
   - Locked (read-only)
5. **Real-time update** — folosește Socket.io context (deja în Shell):
   - Socket subscribe `new_message` → prepend conversation + bump unread_count
   - Mark-as-read sync
6. **Empty state** clear:
   - Niciun proiect → "Niciun proiect comun cu cineva încă. Asigură-te într-un proiect via Marketplace."
7. **Click → ProjectDetail tab chat** — păstrează URL pattern `/project/:id?tab=chat`.
8. **Mobile UX** — full-width cards, swipe actions (mark as read swipe).

## Constrângeri
- **Limba română**
- **Nu schimba endpoint-ul** `/api/messages/conversations`
- **Socket context** disponibil prin `useSocket()` din SocketContext.jsx
- **Output**: `ChatInbox.jsx` modificat
