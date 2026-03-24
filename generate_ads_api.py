#!/usr/bin/env python3

import anthropic

# Initialize the Anthropic client
client = anthropic.Anthropic()

# System prompt optimized for copywriting
system_prompt = """Tu ești un expert în copywriting și marketing pentru social media. 
Specializarea ta: reclame puternice pentru produse de lux și cadouri Valentine's Day.

Reguli:
- Scrie NATURAL, cum vorbesc oamenii pe rețelele de socializare (cuvinte scurte, construcții simple, tone conversațional)
- Fiecare text trebuie să aibă HOOK emoțional/viral la început (1-2 linii MAX)
- DESCRIEREA trebuie să fie exact 50 DE CUVINTE (numără meticulos!)
- Evită la tot costul clicheele, superlativele exagerate, tonul corporate
- Fii AUTHENTIC - scrie ca și cum ai vinde prietenului ți-o cadou
- Include detalii concrete despre produs (funcționalitate, durabilitate, impact emoțional)
- Fii PERSUASIV fără a forța vânzarea - lasă produsul să vorbească

Tonalitate pe variante:
1. CASUAL & CONVERSATIONAL - pentru Gen Z, relaxat
2. FUNNY & SELF-AWARE - cu umor, self-deprecating
3. GENUINE & STORYTELLING - emoție autentică
4. NATURAL NARRATIVE - cum explici unui prieten
5. DIRECT & CONFIDENT - no-filter, straight to the point

Produs: SET Valentine's Day compus din:
- Ceas elegant
- Brățară frumoasă  
- Trandafir criogenat (durează 3 ani fără apă)

OUTPUT FORMAT:
Pentru FIECARE variantă trebuie să returnezi în format Markdown:

## VARIANTA [NUMĂR] - [NUME STIL]

**Hook:**
[Text 1-2 linii MAX]

**Descriere:**
[Exact 50 cuvinte]

---
"""

user_prompt = """Genereaza 5 reclame DIFERITE pentru setul Valentine's Day (ceas + brățară + trandafir criogenat vândute TOGETHER ca set).

Cerințe stricte:
- 5 variante cu stiluri COMPLET DIFERITE
- Hook SCURT la fiecare (1-2 linii, emoțional sau viral)
- Descriere de EXACT 50 CUVINTE la fiecare
- Natural, authentic, conversațional
- Fiecare trebuie să convingă în mod diferit de cealaltă

Variante:
1. Casual & Conversational
2. Funny & Self-Aware  
3. Genuine & Emotional Storytelling
4. Natural Narrative (cum explici unui prieten)
5. Direct & Confident (no bullshit)

Genereaza DOAR textele, în format Markdown curat, gata de copiat."""

print("🚀 Generating Valentine's Day ads using Claude API...")
print("=" * 60)
