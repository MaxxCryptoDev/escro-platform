# 04 — Structura paginii

## Schemă de ansamblu (de sus în jos)

```
┌─────────────────────────────────────────┐
│ NAV (sticky, blur)                       │
│   [CV] Claudiu Vladau    Despre · Serv · Cum · [Contact]  │
├─────────────────────────────────────────┤
│ HERO                                     │
│   [Tag mic]                              │
│   Titlu mare (cu accent pe „oamenii potriviți") │
│   Subtitlu                              │
│   [CTA primary] [CTA ghost]              │
│   ────────────  ┌────────────┐           │
│   (grid bg)     │ Profil card │           │
│                 │  Avatar     │           │
│                 │  Stats      │           │
│                 │  Tags       │           │
│                 └────────────┘           │
├─────────────────────────────────────────┤
│ DESPRE                                   │
│   Label · Titlu · Subtitlu               │
│   [Bloc Filozofie] (quote-style)         │
│   [Bloc Ce fac concret]                  │
├─────────────────────────────────────────┤
│ CUM LUCREZ (proces orizontal)            │
│   01 ─── 02 ─── 03 ─── 04                │
│   Consultare · Matching · Execuție · Închidere │
├─────────────────────────────────────────┤
│ SERVICII (grid 3x2)                      │
│   [01 Escrow] [02 Matching] [03 PM]      │
│   [04 Advisory][05 Blocaje] [06 Distanță] │
├─────────────────────────────────────────┤
│ DE CE EU (grid 3x2)                      │
│   ✓ Recomandări  ✓ Rețea  ✓ Transparență │
│   ✓ Responsab.   ✓ Reput. ✓ Disponibil   │
├─────────────────────────────────────────┤
│ TESTIMONIALE (3 card-uri statice)        │
│   „..."        „..."        „..."        │
│   — Adrian M.  — Maria T.   — Ion G.      │
├─────────────────────────────────────────┤
│ FAQ (accordion)                          │
│   > Cât costă?                           │
│   > Ce tip de proiecte?                  │
│   > Lucrezi doar cu români?              │
│   > Cum garantezi escrow-ul?             │
│   > Răspunzi repede?                     │
│   > Dacă nu vreau să continui?           │
│   > Confidențialitate?                   │
├─────────────────────────────────────────┤
│ CONTACT (block central, cu glow)         │
│   Label · Titlu · Subtitlu               │
│   [Apel] [Email] [Video]                 │
│   [CTA mare: Trimite-mi un mesaj]        │
│   Notă: răspund în 24h                   │
├─────────────────────────────────────────┤
│ FOOTER (minimal)                         │
│   [CV] Claudiu Vladau    © 2026 ...      │
└─────────────────────────────────────────┘
```

---

## Ierarhia de scroll (ce vede vizitatorul în primele 3 ecrane)

- **Ecran 1 (hero)**: cine ești, ce faci, cum te contactez. Suficient pentru ~30% din vizitatori care vor da imediat tap pe telefon.
- **Ecran 2 (despre + cum lucrez)**: confirmarea seriozității + proces clar.
- **Ecran 3 (servicii + de ce eu)**: convingerea ezitanților.
- **Ecran 4+ (testimoniale, FAQ, contact)**: răspuns la obiecții finale + conversie.

---

## Reguli de ierarhie vizuală

1. **Un singur H1 pe pagină** — în hero.
2. **Section label** (uppercase, mic, albastru) precede fiecare titlu de secțiune. E ancora cognitivă.
3. **Titlurile de secțiune (H2)** sunt mari, cu break manual de linie unde e logic.
4. **Subtitlurile** sunt scurte (1-2 fraze), gri (muted), max-width 680px pentru lectură confortabilă.
5. **Conținutul** (card-uri, blocuri) începe la spacing generos de subtitlu.

---

## Spațiere între secțiuni

- Padding vertical per secțiune: **96px desktop / 64px mobile**
- Divider subțire (1px, semi-transparent) între secțiuni majore — discreet
- Secțiunile alternative (Servicii, De ce eu) au background ușor diferit (`--navy-2`) pentru ritm vizual

---

## Variante de ordine (dacă designerul vrea să propună A/B)

**Default**: Despre → Cum lucrez → Servicii → De ce eu → Testimoniale → FAQ → Contact

**Variantă „direct la treabă"** (pentru o iterație viitoare):
Hero → Servicii (concret) → Cum lucrez → Despre (filozofie) → Testimoniale → FAQ → Contact

— rămâne la default pentru prima versiune; varianta se poate testa ulterior.

---

## Anchor links (pentru nav și CTA)

- `#despre`
- `#proces`
- `#servicii`
- `#de-ce-eu`
- `#testimoniale`
- `#faq`
- `#contact`
