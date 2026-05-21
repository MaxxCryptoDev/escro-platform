# 08 — Strategie Call to Action

## Principiul de bază

**Un singur CTA primar pe toată pagina: „Hai să vorbim" → contact direct.**

Nu funnel. Nu newsletter. Nu „programează un call". Nu „descarcă ghidul gratuit". Vizitatorul are deja contextul (vine pe recomandare), nu trebuie încălzit — trebuie doar să-i facem pasul ușor.

---

## Ce este și ce nu este un CTA aici

| ✅ CTA valide | ❌ CTA care NU trebuie să apară |
|---|---|
| Hai să vorbim (→ #contact) | Programează demo |
| Trimite-mi un mesaj (→ mailto) | Înscrie-te la newsletter |
| WhatsApp acum (→ wa.me link) | Descarcă brochure |
| Sună acum (→ tel:) | Începe gratuit |
| Vezi cum lucrez (→ #proces, secundar) | Creează cont |

---

## Distribuția CTA pe pagină

### Hero (primary + secundar)
- **Primary**: `Hai să vorbim` → `#contact`
- **Secundar (ghost)**: `Vezi cum lucrez` → `#proces`

### Nav (sticky)
- **Primary mic**: `Contact` → `#contact`
- Constant vizibil, mereu accesibil cu un click.

### După secțiunea „Cum lucrez"
- **Inline soft CTA**: o frază + buton secundar.
  > „Ți se pare logic? Hai să vorbim concret despre ce ai tu de făcut." [`Începe o discuție`]

### După secțiunea „De ce eu"
- Nimic. Lasă vizitatorul să respire înainte de testimoniale.

### După testimoniale
- **Inline soft CTA** (variantă):
  > „Vrei să fii următorul care recomandă mai departe?" [`Hai să discutăm`]

### Contact (block dedicat)
- **CTA mare**: `Trimite-mi un mesaj` (mailto, btn-lg)
- Plus cele 3 opțiuni egale: telefon, email, video call

### Sticky bar mobile (după 60% scroll)
- 3 iconițe egale: 📞 Sună · 💬 WhatsApp · ✉️ Email
- Toate deschid acțiunea directă (fără confirmare intermediară)

---

## Reguli pentru micro-copy CTA

### ✅ Folosește
- **Verbul la imperativ familiar** („Hai", „Spune-mi", „Trimite")
- **Persoana I sau a II-a singular** (relație 1-la-1, nu corporate)
- **Maxim 4 cuvinte** pe buton
- **Verbe acționale**, nu substantive abstracte („Sună acum" > „Contact telefonic")

### ❌ Evită
- „Începe", „Lansează" (sună a SaaS)
- „Cere o ofertă" (formal, rece)
- „Apasă aici" (slab — nu spune ce se întâmplă)
- „Submit", „Send" (în engleză când restul e română)

---

## Link-uri concrete (pentru implementare)

```html
<!-- WhatsApp direct cu mesaj pre-completat -->
<a href="https://wa.me/40764345782?text=Salut%20Claudiu%2C%20am%20auzit%20de%20tine%20și%20aș%20vrea%20să%20discutăm%20despre...">
  Scrie pe WhatsApp
</a>

<!-- Telefon -->
<a href="tel:+40764345782">+40 (764) 345-782</a>

<!-- Email cu subject -->
<a href="mailto:vladau.claudiu95@gmail.com?subject=Solicitare%20discu%C8%9Bie%20-%20de%20pe%20site">
  Trimite-mi un mesaj
</a>
```

**De ce mesaj pre-completat pe WhatsApp**: scade friction-ul. Vizitatorul nu trebuie să gândească „cum încep". Începutul e deja scris.

---

## Ce trebuie să se întâmple DUPĂ click pe CTA

### Pe mobile (>50% trafic)
- Click pe „WhatsApp" → deschide direct chat-ul cu mesaj pre-completat. Zero pași intermediari.
- Click pe „Sună" → declanșează dialer. Zero confirmări.
- Click pe „Email" → deschide app email-ului default cu subject.

### Pe desktop
- Click pe „WhatsApp" → deschide WhatsApp Web (sau app, dacă instalată).
- Click pe „Sună" → unele sisteme deschid Skype/Teams. OK, e fallback acceptabil.
- Click pe „Email" → mailto: deschide Outlook/Gmail/Apple Mail.

**Niciodată** un modal „Cum vrei să-l contactezi?" — alegerile sunt deja în secțiunea contact.

---

## Tracking (opțional, dacă vrei analytics ușor)

Adaugă `data-cta` pe fiecare CTA pentru a vedea care convertește:

```html
<a href="..." data-cta="hero-primary">Hai să vorbim</a>
<a href="..." data-cta="contact-whatsapp">WhatsApp</a>
<a href="..." data-cta="sticky-mobile-call">Sună</a>
```

Apoi în Plausible / Umami / GA: event = `cta_click`, prop = valoarea din `data-cta`.

**Nu** Google Analytics dacă nu ai consimțământ — pune Plausible (self-hosted sau cloud, fără cookies).

---

## Test mental final

Înainte de a publica pagina, pune-te în locul unui vizitator care:
1. A primit link-ul pe WhatsApp acum 30 de secunde.
2. Scrollează rapid pe telefon, în timp ce stă la o ședință.
3. Vrea să decidă în 60 de secunde dacă „are sens" să-l contacteze pe Claudiu.

**Întrebare-cheie**: într-un singur swipe + un singur tap, poate trimite un mesaj?

Dacă răspunsul e DA → CTA-ul e corect calibrat. Dacă e NU → simplifică.
