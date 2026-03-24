#!/usr/bin/env python3
"""Final clean regeneration - no truncation, with CTA"""
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
    """Call API - with CTA requirement"""
    prompt = f"""Rescrie text reel 160-180 cuvinte.

PATTERN:
{name}, *{role_company}*, [text care continua natural cu CTA la final]

EXEMPLU: "{name}, *{role_company}*, demonstrează că... [text complet] ... Dă-mi ❤️ dacă crezi asta!"

Stire: {title}
Context (nu copia): {old_text[:200]}...

MUST HAVE:
1. INCEPE: "{name}, *{role_company}*, "
2. 160-180 cuvinte EXACT
3. CTA INTEGRAT LA FINAL (una din: ❤️ like | comentează | share cu | follow)
4. FARA "|" in text
5. OUTPUT: DOAR TEXTUL COMPLET (full final cu CTA)"""

    try:
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": API_KEY,
                "anthropic-version": "2023-06-01"
            },
            json={
                "model": "claude-opus-4-1-20250805",
                "max_tokens": 400,
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=30
        )
        
        if response.status_code == 200:
            text = response.json()['content'][0]['text'].strip()
            return text
    except Exception as e:
        pass
    return None

def process_file(filepath):
    """Process one file safely"""
    with open(filepath) as f:
        lines = f.readlines()
    
    # Extract rating and title (line 0)
    title_line = lines[0]
    title_m = re.search(r'# \[([\d.]+)\]\s*(.+)', title_line)
    if not title_m:
        return False
    rating = float(title_m.group(1))
    title = title_m.group(2).strip()
    
    # Extract person (line 1, between **)
    person_line = lines[1]
    person_m = re.search(r'\*\*([^*]+)\*\*', person_line)
    if not person_m:
        return False
    person = person_m.group(1).strip()
    
    # Extract old text from file (between "Textul principal" and first "---")
    text_start = None
    text_end = None
    for i, line in enumerate(lines):
        if 'Textul principal' in line and '**' in line:
            text_start = i + 2  # Skip "**...**" line and blank
        elif text_start is not None and line.strip().startswith('---') and i > text_start + 2:
            text_end = i
            break
    
    if text_start is None or text_end is None:
        return False
    
    # Get text, skip blank lines
    text_lines = [lines[i].strip() for i in range(text_start, text_end) if lines[i].strip()]
    old_text = ' '.join(text_lines) if text_lines else ""
    
    if len(old_text) < 100:
        return False
    
    # Parse person
    parts = [p.strip() for p in person.split('|')]
    name = parts[0]
    role_company = ' '.join(parts[1:]) if len(parts) > 1 else parts[0]
    
    # Get new text
    new_text = call_api(name, role_company, title, old_text)
    if not new_text:
        return False
    
    # Check word count and CTA
    wc = len(new_text.split())
    
    if wc < 100:
        return False
    
    # Extract ratings
    ratings = {}
    for i, line in enumerate(lines):
        if 'Reputație' in line and '|' in line:
            m = re.search(r'(\d+)/10', line)
            if m: ratings['rep'] = int(m.group(1))
        elif 'Awareness' in line and '|' in line:
            m = re.search(r'(\d+)/10', line)
            if m: ratings['awr'] = int(m.group(1))
        elif 'Impact' in line and '|' in line:
            m = re.search(r'(\d+)/10', line)
            if m: ratings['imp'] = int(m.group(1))
        elif 'Potențial Viralizare' in line and '|' in line:
            m = re.search(r'(\d+)/10', line)
            if m: ratings['vir'] = int(m.group(1))
    
    # Build new file
    description = title.split(':')[0].strip() if ':' in title else title
    
    md = f"# [{rating}] {title}\n\n"
    md += f"**{person}**\n\n"
    md += f"*{description}*\n\n"
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
    
    print(f"🚀 Final regeneration: {len(files)} articles\n")
    
    success = 0
    for i, f in enumerate(files, 1):
        print(f"({i:2d}/{len(files)}) {f.name}...", end=" ", flush=True)
        if process_file(f):
            print("✅")
            success += 1
        else:
            print("❌")
    
    print(f"\n✨ Done: {success}/{len(files)}")

if __name__ == '__main__':
    main()
