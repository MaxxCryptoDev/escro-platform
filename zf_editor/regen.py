#!/usr/bin/env python3
"""Minimal cost-efficient API regeneration"""
import re
import requests
from pathlib import Path

API_KEY = None
with open('.env') as f:
    for line in f:
        if 'ANTHROPIC_API_KEY' in line:
            API_KEY = line.split('=')[1].strip()
            break

def call_api(title, person, old_text):
    """One call per article - minimal tokens"""
    # Extract name and role from "Name | Role | Company"
    parts = [p.strip() for p in person.split('|')]
    name = parts[0]
    role_company = ' '.join(parts[1:]) if len(parts) > 1 else parts[0]
    
    prompt = f"""Rescrie COMPLET textul cu alt stil, nu rescrie ce exista deja.

INCEPE: {name}, *{role_company}*, [continuare...]
FARA PIPE-URI IN TEXT, CURSIV ROLEUL.

Exemplu: "Ion Popescu, *director general Acme Corp*, vine cu vești..."

Old text (rescrie DIFERIT): {old_text[:200]}...

STRICT:
1. Incepe exact: "{name}, *{role_company}*, [text nou]"
2. 140-180 cuvinte
3. STIL SI CONTINUT COMPLET DIFERIT
4. O actiune CTA final (smart choice)
5. FARA "|" in text
6. Output: DOAR TEXTUL NOU"""

    response = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": API_KEY,
            "anthropic-version": "2023-06-01"
        },
        json={
            "model": "claude-opus-4-1-20250805",
            "max_tokens": 300,
            "messages": [{"role": "user", "content": prompt}]
        },
        timeout=30
    )
    
    if response.status_code == 200:
        return response.json()['content'][0]['text'].strip()
    return None

def regenerate(filepath):
    """Parse, regenerate, save"""
    with open(filepath) as f:
        content = f.read()
    
    # Extract title with rating
    title_match = re.search(r'# \[([\d.]+)\]\s*(.+)', content)
    rating = float(title_match.group(1)) if title_match else 8.0
    title = title_match.group(2) if title_match else ""
    
    # Extract person info (between ** **)
    person_match = re.search(r'\*\*([^*]+)\*\*', content)
    person = person_match.group(1).strip() if person_match else ""
    
    # Extract old text (between ** and ---)
    text_match = re.search(r'\*\*Textul principal[^\*]*\*\*\s*\n\n(.*?)\n\n---', content, re.DOTALL)
    old_text = text_match.group(1).strip() if text_match else ""
    
    if not old_text or not title:
        return False
    
    # Regenerate
    new_text = call_api(title, person, old_text)
    if not new_text:
        return False
    
    # Validate word count
    word_count = len(new_text.split())
    if word_count < 140:
        return False
    if word_count > 190:
        words = new_text.split()
        new_text = ' '.join(words[:185])
    
    # Extract ratings from table
    ratings = {}
    for key, pattern in [
        ('rep', r'\|\s*\*\*Reputație\*\*\s*\|\s*(\d+)'),
        ('awr', r'\|\s*\*\*Awareness\*\*\s*\|\s*(\d+)'),
        ('imp', r'\|\s*\*\*Impact\*\*\s*\|\s*(\d+)'),
        ('vir', r'\|\s*\*\*Potențial Viralizare\*\*\s*\|\s*(\d+)')
    ]:
        m = re.search(pattern, content)
        if m:
            ratings[key] = int(m.group(1))
    
    if not rating and ratings:
        rating = sum(ratings.values()) / len(ratings)
    
    # Build markdown CORRECT format
    md = f"# [{rating}] {title}\n\n"
    md += f"**{person}**\n\n"
    md += f"*Articol despre {title.split(':')[0].strip() if ':' in title else title}*\n\n"
    md += "---\n\n"
    md += f"**Textul principal pentru video ({len(new_text.split())} cuvinte):**\n\n"
    md += f"{new_text}\n\n"
    md += "---\n\n"
    md += "| Criteriu | Rating |\n|----------|--------|\n"
    md += f"| **Reputație** | {ratings.get('rep', 8)}/10 |\n"
    md += f"| **Awareness** | {ratings.get('awr', 8)}/10 |\n"
    md += f"| **Impact** | {ratings.get('imp', 8)}/10 |\n"
    md += f"| **Potențial Viralizare** | {ratings.get('vir', 8)}/10 |\n\n"
    md += f"**RATING OVERALL: {rating}/10**"
    
    with open(filepath, 'w') as f:
        f.write(md)
    return True

def main():
    output_dir = Path('/home/maxx/Desktop/work/zf_editor/output/2026-02-02')
    files = sorted(output_dir.glob('*.md'))
    
    print(f"🚀 Regenerating all {len(files)} articles...\n")
    
    success = 0
    for i, f in enumerate(files, 1):
        print(f"({i}/{len(files)}) {f.name}...", end=" ", flush=True)
        if regenerate(f):
            print("✅")
            success += 1
        else:
            print("❌")
    
    print(f"\n✨ Done: {success}/{len(files)}")

if __name__ == '__main__':
    main()
