# ESCRO Platform — Design Plan

Acest folder conține **28 de pachete independente**, câte unul pentru fiecare pagină a platformei. Fiecare pachet (subfolder) e self-contained și poate fi uploadat la Claude design ca o sesiune separată.

## Cum se folosește

1. Alege o pagină pe care vrei să o redesignezi.
2. Deschide folderul ei (ex: `Marketplace/`).
3. Citește `PROMPT.md` — explică ce trebuie îmbunătățit specific acelei pagini.
4. Uploadează ÎNTREG folderul la Claude design (drag-and-drop sau zip).
5. După ce primești output-ul, înlocuiește fișierele corespondente în `/home/maxx/Desktop/work/escro-platform/frontend/src/`.

## Convenții generale (aplicabile la TOATE paginile)

- **Limba**: română — păstrează tot textul existent în română.
- **Stack**: React 18 + Vite + CSS pur cu variabile. **Nu folosi Tailwind / styled-components / librării noi**.
- **Design tokens**: definite în `escro.css` (CSS variables). Folosește-le exclusiv în loc de hex hardcoded.
- **Design system**: `<Icon>`, `<Avatar>`, `<StatusBadge>`, `<EmptyState>`, `<Spinner>` definite în `ui.jsx`. Folosește-le în loc să recreezi.
- **Utility classes**: în `App.css` — `.card`, `.btn`, `.tbl`, `.input`, `.badge`, `.row`, `.col`, `.page-head`, `.h-title`, etc.
- **Roluri** în aplicație: `admin`, `expert`, `company`, `individual`. Unele pagini se afișează diferit pe rol — vezi `PROMPT.md` pentru detalii.
- **Mobile responsive**: prioritate ridicată. Tabelele rup pe ecran mic, modaluri prea late, sidebar nu se închide la nav.
- **API contracts**: NU modifica propsuri / state-uri / endpoint calls. Modificările sunt strict vizuale (JSX layout, CSS).

## Folder structure

```
design plan/
├── README.md                # acest fișier
├── _shared/                 # referință centralizată (NU uploadează singură)
│   ├── ui.jsx
│   ├── Shell.jsx
│   ├── App.css
│   └── escro.css
├── LandingPage/             # 28 foldere self-contained
├── Login/
├── Register/
├── ...
└── Settings/
```

## Lista paginilor (28)

### Public / Auth (6)
- `LandingPage/` — landing public, first impression
- `Login/` — formular login
- `Register/` — wizard role + date personale + referral
- `ForgotPassword/` — request reset link
- `ResetPassword/` — set parolă nouă
- `Terms/` — view T&C

### Dashboards (3)
- `AdminDashboard/` — 11 tab-uri admin (CEL MAI MARE)
- `ExpertDashboard/` — homepage expert
- `ClientDashboard/` — pentru company + individual

### Project workflow (6)
- `ProjectDetail/` — CEL MAI MARE FIȘIER (~2400 linii), 4 tab-uri, multe modaluri
- `AssignmentDetail/` — sub-asignare PM
- `CreateProject/` — wizard 4 pași
- `Marketplace/` — listing proiecte deschise + apply
- `MyProjects/` — listă cu filtre
- `CheckoutEscrow/` — Stripe Elements

### Profile & Social (3)
- `ProfileEdit/` — edit profil + upload portofoliu
- `PublicProfile/` — view profil public
- `Directory/` — listing useri public

### Financial (4)
- `WalletDashboard/` — sold + tranzacții + payout
- `EarningsHistory/` — istoric milestone payments
- `PayoutHistory/` — istoric retrageri
- `AdminFinanciar/` — admin financial overview

### Other (6)
- `ChatInbox/` — listă conversații
- `Contracts/` — listă contracte semnate
- `Disputes/` — listă dispute deschise
- `ProjectManagement/` — view PM specific
- `Referral/` — share cod referral
- `Settings/` — account settings + GDPR

## Verificare după upload

După ce primești output-ul din Claude design și înlocuiești fișierele:
1. Hard refresh în browser (Ctrl+Shift+R)
2. Verifică că funcționalitatea NU s-a stricat — toate butoanele click, toate API calls merg
3. Test pe mobile + desktop
4. Verifică consistency cu restul paginilor (paleta + spacing)
