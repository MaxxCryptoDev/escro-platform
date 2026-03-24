#!/usr/bin/env python3
"""Final regeneration - clean, no errors"""
import re
import requests
from pathlib import Path

API_KEY = None
with open('.env') as f:
    for line in f:
        if 'ANTHROPIC_API_KEY' in line:
            API_KEY = line.split('=')[1].strip()
            break

def call_api(name, role_company, title, old_text):
    """Call API for new text"""
    prompt = f"""Rescrie COMPLET textul pentru reel social media.

STRICT PATTERN:
Incepe: {name}, *{role_company}*, [continuare]
Exemplu: "Ion Popescu, *CEO Acme Corp*, demonstrează că..."

Stire: {title}
Text vechi (pentru context, nu rescrie literal): {old_text[:250]}...

REGULI:
1. INCEPE: "{name}, *{role_company}*, [text]" - EXACT asta
2. 140-180 cuvinte total
3. Fara PIPE-URI (|) in text
4. O actiune CTA final (like/comment/share/follow - pick best for context)
5. Output: DOAR TEXTUL (nimic altceva)"""

    try:
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
            text = response.json()['content'][0]['text'].strip()
            return text
    except Exception as e:
        print(f"    API error: {e}")
    return None

def process_file(filepath):
    """Process one file"""
    with open(filepath) as f:
        content = f.read()
    
    # Extract data
    title_m = re.search(r'# \[([\d.]+)\]\s*(.+)', content)
    rating = float(title_m.group(1)) if title_m else 8.0
    title = title_m.group(2) if title_m else ""
    
    person_m = re.search(r'\*\*([^*]+)\*\*', content)
    person = person_m.group(1).strip() if person_m else ""
    
    text_m = re.search(r'\*\*Textul principal[^\*]*\*\*\s*\n\n(.*?)\n\n---', content, re.DOTALL)
    old_text = text_m.group(1).strip() if text_m else ""
    
    if not all([person, title, old_text]):
        return False
    
    # Parse person
    parts = [p.strip() for p in person.split('|')]
    name = parts[0]
    role_company = ' '.join(parts[1:]) if len(parts) > 1 else parts[0]
    
    # Get new text
    new_text = call_api(name, role_company, title, old_text)
    if not new_text:
        return False
    
    # Validate word count
    wc = len(new_text.split())
    if wc < 130:
        return False
    
    # Get ratings
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
    
    # Build file
    md = f"# [{rating}] {title}\n\n"
    md += f"**{person}**\n\n"
    md += f"*{title.split(':')[0].strip() if ':' in title else title}*\n\n"
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
    
    print(f"🚀 Processing {len(files)} articles...\n")
    
    success = 0
    for i, f in enumerate(files, 1):
        print(f"({i}/{len(files)}) {f.name}...", end=" ", flush=True)
        if process_file(f):
            print("✅")
            success += 1
        else:
            print("❌")
    
    print(f"\n✨ Done: {success}/{len(files)}")

if __name__ == '__main__':
    main()
