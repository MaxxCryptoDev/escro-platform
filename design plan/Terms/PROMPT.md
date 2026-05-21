# Claude Design — Terms

## Context platformă
ESCRO — platformă B2B românească de escrow. Terms & Conditions versionate (table `terms_versions` în DB). Useri trebuie să accepte versiunea curentă la login (TermsAcceptanceModal apare dacă versiunea acceptată != versiunea curentă).

## Această pagină
- **Rută**: `/terms`
- **Cine vede**: public (link din footer/register) sau authenticated (link din modal de acceptance)
- **Scop**: afișează textul legal al T&C curent + arhivă versiuni anterioare

## User flow
1. User click pe link "Termeni și condiții"
2. Pagina fetch versiunea curentă a T&C
3. User citește
4. Opțional: vede istoric versiuni / changelog

## Componente cheie pe pagină
- Header cu titlu + versiune + dată
- Conținut text (markdown / HTML formatat)
- Sidebar cu cuprins (table of contents) — links la secțiuni
- Footer cu link "Înapoi" / link printable PDF

## Layout
Poate fi accesat și public, și autentificat. **Decizie**: Detectează dacă există user.role în context — afișează cu sau fără Shell. Pentru simplitate, recomandare: fără Shell, layout dedicat readable.

## Ce vreau să îmbunătățești PRIORITAR

1. **Readability** — typography optimizată pentru text lung: line-height 1.6+, font-size 15-16px, max-width pe paragraf ~70 caractere.
2. **Table of contents** — fixed pe stânga / sticky pe desktop; pe mobile collapsed în accordion top.
3. **Section anchors** — fiecare H2/H3 are id, link copyable.
4. **Search inside doc** — Ctrl+F prietenos (highlight matched terms).
5. **Versiune badge** — clar afișat: "Versiunea 2.0 — în vigoare din [data]". Link la archive.
6. **Print-friendly** — media print CSS să arate clean pe hârtie/PDF.
7. **Acceptance state** — dacă userul autentificat NU a acceptat versiunea curentă, afișează banner sus "Trebuie să accepți T&C-uri actualizate" cu CTA.

## Constrângeri
- **Limba română** — textul T&C va fi în română
- **Conținutul vine din DB** (table `terms_versions.content`) — nu hardcoda
- **Output**: `Terms.jsx` modificat
