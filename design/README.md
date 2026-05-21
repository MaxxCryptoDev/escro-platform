# ESCRO Platform — Design Files

Fișierele frontend ale platformei ESCRO copiate pentru audit/redesign vizual. Stack: React 18 + Vite + CSS (no Tailwind, no styled-components — pure CSS cu variabile).

## Arhitectură vizuală

- **Design system**: `components/ui.jsx` conține `Icon`, `Avatar`, `StatusBadge`, `EmptyState`, `Spinner`. Iconii sunt SVG inline.
- **CSS variables**: `styles/escro.css` are toate variabilele (`--bg-0/1/2`, `--fg-0/1/2/3`, `--accent`, `--accent-hi`, `--warning`, `--danger`, `--success`, `--border-1/2`, `--r-sm/md/lg`, `--f-display/mono`).
- **Layout**: `components/Shell.jsx` randează sidebar + topbar pentru toate paginile autentificate.
- **Roluri**: `admin`, `expert`, `company`, `individual` — fiecare are dashboard propriu.

## Structură fișiere

### `styles/`
- `App.css` — utility classes globale (`.card`, `.btn`, `.tbl`, `.input`, `.badge`, `.row`, `.col`, `.h-title`, `.h-eyebrow`, etc.) **CEL MAI IMPORTANT** pentru design tokens
- `escro.css` — CSS variables (culori, spacing, radii, fonts)
- `LandingPage.css` — stiluri specifice pagina publică
- `TaskRequestModal.css`, `VerificationModal.css` — modaluri specifice

### `components/`
- **`Shell.jsx`** — sidebar (`navMain`, `navSub`, `navProfile`) + topbar cu search + notification bell + breadcrumbs. Toate paginile autentificate sunt randate înăuntru.
- **`ui.jsx`** — design system. `Icon` cu zeci de SVG-uri inline. `Avatar` (initiale + culoare deterministică). `StatusBadge` mapează statuses la culori. `EmptyState`, `Spinner`.
- **`ContractModal.jsx`** — view + sign PDF contract
- **`SignatureModal.jsx`** — canvas semnătură
- **`ReviewModal.jsx`** — rating + comentariu post-proiect
- **`PostTaskModal.jsx`**, **`PostExpertTaskModal.jsx`** — formulare creare task
- **`VerificationAckModal.jsx`** — modal "voi fi sunat pentru KYC"
- **`TermsAcceptanceModal.jsx`** — accept T&C nou

### `pages/`

**Public:**
- `LandingPage.jsx` — landing page principal (cu LandingPage.css)
- `Login.jsx`, `Register.jsx` — auth flows

**Dashboards (după rol):**
- `AdminDashboard.jsx` — tabs: overview, users, projects-tasks, applications, financiar, contracts, disputes, calls, trust, referral, audit, terms
- `ExpertDashboard.jsx` — homepage expert, cu badge-uri "Cont verificat" / "KYC verificat", banner Stripe KYC, alert livrabile/contracte
- `ClientDashboard.jsx` — folosit și pentru `company` și `individual`, cu tab-uri overview / lucrări / approvals. Banner-e diferite per rol.

**Workflow pages (cele mai folosite):**
- `ProjectDetail.jsx` — **CEL MAI MARE FIȘIER** (~2400 linii). Tab-uri: details / chat / contracts / milestones. Modaluri inline: depunere escrow, propose modification, sign contract, add sub-task, apply to project.
- `Marketplace.jsx` — listing public proiecte deschise, cu filtru + apply button
- `Directory.jsx` — listing useri (experts / companies) public
- `PublicProfile.jsx` — profil public user
- `ProfileEdit.jsx` — editare profil + upload portofoliu
- `CreateProject.jsx` — wizard 4 pași: brief / buget / milestones / revizuire
- `Contracts.jsx` — listă contracte semnate
- `MyProjects.jsx` — listă proiectele mele
- `ChatInbox.jsx` — inbox conversații
- `CheckoutEscrow.jsx` — Stripe Elements pentru depunere
- `WalletDashboard.jsx` — sold + tranzacții + payout
- `Disputes.jsx` — listă dispute deschise
- `Settings.jsx` — settings cont
- `AssignmentDetail.jsx` — sub-asignare PM task

### Root
- `App.jsx` — routing principal cu lazy loading
- `main.jsx` — Vite entry point
- `index.html` — root HTML

## Convenții actuale

- **Limba**: Romanian (texts în UI)
- **Tipografie**: variabile `--f-display` (titluri), `--f-mono` (numere/cifre)
- **Iconografie**: stroke icons SVG inline în `Icon` component
- **Statusuri**: culori semantice — `--success` (verde), `--warning` (galben), `--danger` (roșu), `--accent` (albastru)
- **Tabel**: `.tbl` cu `.tbl-stack` pentru responsive
- **Cards**: `.card` cu `.card-head` + `.card-body`
- **Badges**: `.badge` cu modificatori (`badge-green`, `badge-amber`, `badge-red`, `badge-blue`, `no-dot`)

## Ce ar putea fi îmbunătățit (sugestii)

1. **Inconsistență spacing** — multe stiluri inline (`style={{ padding: '1rem', ... }}`) în loc de utility classes
2. **Mobile responsive** — table-uri grele pe ecrane mici, sidebar nu se închide automat la navigare
3. **Empty states** — bune dar fără ilustrații
4. **Loading states** — spinner generic, fără skeleton screens
5. **Form design** — input-uri funcționale dar fără focus states polish, niciun input mask
6. **Branding** — logo "E" simplu, fără identitate vizuală puternică
7. **Color palette** — dependent de variabile, dar paleta concretă (light/dark mode?) nu e clară din fișiere
8. **Iconografie** — Icon component bun, dar unele SVG-uri sunt rupte/incomplete

Vezi `styles/escro.css` pentru paleta actuală de culori și `styles/App.css` pentru componentele și utility-urile principale.
