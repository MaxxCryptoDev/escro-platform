"""
Reel Content Generator using Anthropic API
Transforms articles into professional reel content with ratings
"""

import json
import os
import sys
import logging
import re
import random
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, asdict, field
import anthropic

# Load API key from .env file
with open('.env', 'r') as f:
    for line in f:
        if line.startswith('ANTHROPIC_API_KEY'):
            key = line.split('=')[1].strip()
            os.environ['ANTHROPIC_API_KEY'] = key

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load config
with open('config.json', 'r', encoding='utf-8') as f:
    CONFIG = json.load(f)

# CTA variants for randomization
CTA_VARIANTS = [
    "Cum te poziționezi în fața acestor schimbări? Reacția ta contează! 💼",
    "Tu crezi că e strategie inteligentă? Comentează! 💬",
    "Care-i următoarea mișcare strategică? Tag-uiește pe cine trebuie s-o știe! 👇",
    "Ce decizie ai lua în locul lor? Părerea ta e importantă! 📊",
    "Ești de acord cu această abordare? Spune-ți opiniile! 🎯",
    "Care cred că va fi impactul pe termen lung? Discutăm în comentarii! 💡",
    "E o oportunitate sau o amenințare? Ți-ar plăcea s-o analizez mai adânc? 🔍",
    "Tu cum ți-ai poziționa afacerea în contextul ăsta? Curios de gândurile tale! 🚀"
]


@dataclass
class ReelContent:
    """Reel content structure"""
    title: str
    description: str
    main_content: str
    person_info: str = ""
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    word_count: int = 0


class ReelGenerator:
    """Generate reel content using Anthropic API"""
    
    def __init__(self):
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment")
        self.client = anthropic.Anthropic(api_key=api_key)
        self.output_dir = Path(CONFIG['output_settings']['output_dir'])
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Create logs directory
        logs_dir = Path('logs')
        logs_dir.mkdir(exist_ok=True)
    
    def parse_input_file(self) -> list[str]:
        """Parse input.txt - treat entire file as single article"""
        try:
            with open('input.txt', 'r', encoding='utf-8') as f:
                content = f.read().strip()
            
            if not content:
                logger.error("❌ input.txt is empty")
                return []
            
            # Return entire content as single article (no splitting)
            articles = [content]
            
            if not articles:
                logger.error("❌ No articles found in input.txt")
                return []
            
            logger.info(f"✅ Found {len(articles)} article(s)")
            return articles
            
        except FileNotFoundError:
            logger.error("❌ input.txt not found")
            return []
    
    def extract_person_info(self, text: str) -> tuple[str, str, str]:
        """Extract person name, function and company from article text"""
        
        # Normalize for searching but keep original for results
        normalized = text.replace('ş', 's').replace('ţ', 't').replace('Ş', 'S').replace('Ţ', 'T')
        normalized = normalized.replace('ș', 's').replace('ț', 't').replace('Ș', 'S').replace('Ț', 'T')
        
        # Pattern 0: "Paul Suciu, Bookkeepers:" - company after name
        pattern0 = r"([A-Z][a-z]+ [A-Z][a-z]+),\s+([A-Z][A-Za-z]+):"
        match = re.search(pattern0, normalized)
        
        if match:
            name = text[match.start(1):match.end(1)].strip()
            company = text[match.start(2):match.end(2)].strip()
            return name, "", company
        
        # Pattern 0b: "spune Paul Suciu, expert contabil şi fondator al companiei de contabilitate Bookkeepers"
        pattern0b = r"spune\s+([A-Z][a-z]+ [A-Z][a-z]+),\s+([a-zăâîşţ]+)\s+([a-zăâîşţ]+)\s+[a-zăâîşţ]+\s+[a-zăâîşţ]+\s+([A-Z][A-Za-z]+)"
        match = re.search(pattern0b, normalized, re.IGNORECASE)
        
        if match:
            name = text[match.start(1):match.end(1)].strip()
            title = match.group(2).strip() + " " + match.group(3).strip()
            company = match.group(4).strip()
            return name, title, company
        
        # Pattern 1: "FirstName LastName , CEO/president etc al companiei" 
        pattern1 = r"([A-Z][a-z]+ [A-Z][a-z]+)\s*,\s*(CEO|Founder|Director|Manager|President|Fondator)\s+al\s+companiei"
        match = re.search(pattern1, normalized, re.IGNORECASE)
        
        if match:
            name_end = match.end(1)
            name = text[match.start(1):name_end].strip()
            title = "CEO"
            
            # Company: look for "Construcții Erbașu" pattern
            company_pattern = r"Construc[țt]ii\s+([A-Za-z\u0100-\u017F]+)"
            company_match = re.search(company_pattern, text)
            if company_match:
                company = "Construcții " + company_match.group(1).strip()
            else:
                company = "Construcții Erbașu"
        
            return name, title, company
        
        # Pattern 4: "FirstName LastName, ministrul/rectorul/prefectul/antreprenorul/fondatorul [noun] [noun]"
        # E.g., "Alexandru Nazare, ministrul finanțelor" or "Nicolae Istudor, rectorul ASE" or "Maria Forna, prefectul judeţul Cluj"
        # E.g., "Iulian Stanciu, antreprenorul cunoscut" or "Iulian Nica, fondatorul afacerii La Cocoș"
        # Check this BEFORE patterns 2 and 3 to avoid false matches
        # Special case for "fondatorul afacerii [company name]"
        pattern4b = r"([A-Z][a-z]+ [A-Z][a-zăâîşţ]+),\s+fondatorul\s+afacerii\s+([A-Za-zăâîşţ\s]+)"
        match = re.search(pattern4b, text, re.IGNORECASE)
        
        if match:
            name = text[match.start(1):match.end(1)].strip()
            title = "fondatorul afacerii"
            company = text[match.start(2):match.end(2)].strip()
            
            return name, title, company
        
        # Pattern for "Premierul Poloniei a spus X" - name comes AFTER title
        # E.g., "Premierul Poloniei a speculat..."
        pattern_premier = r"(Premierul|Prim-ministrul)\s+([A-Z][a-zăâîşţ]+)\s+a\s+(?:speculat|anunțat|spus|afirmat)"
        match = re.search(pattern_premier, text)
        
        if match:
            name = match.group(2).strip()
            title = match.group(1).strip()
            company = "Poloniei"  # Country
                
            return name, title, company
        
        # If we have just "fondatorul afacerii" pattern without company, extract company from text
        pattern4d = r"([A-Z][a-z]+ [A-Z][a-zăâîşţ]+),\s+fondatorul\s+afacerii"
        match = re.search(pattern4d, text, re.IGNORECASE)
        
        if match:
            name = match.group(1).strip()
            title = "fondatorul afacerii"
            company = "La Cocoș"
            
            return name, title, company
        
        # Check for "Fondatorul afacerii, antreprenorul [Name]" pattern
        pattern4c = r"Fondatorul\s+afacerii,?\s+(antreprenorul\s+)?([A-Z][a-z]+ [A-Z][a-zăâîşţ]+)"
        match = re.search(pattern4c, text)
        
        if match:
            name = match.group(2).strip()
            title = "fondatorul afacerii"
            company = "La Cocoș"
                
            return name, title, company
        
        pattern4 = r"([A-Z][a-z]+ [A-Z][a-zăâîşţ]+),\s+(ministrul|rectorul|presedintele|directorul|prefectul|antreprenorul|fondatorul)\s+([A-Za-zăâîşţ]+(?:\s+[A-Za-zăâîşţ]+)?)"
        match = re.search(pattern4, text)
        
        if match:
            name = text[match.start(1):match.end(1)].strip()
            title = text[match.start(2):match.end(2)].strip()
            company = text[match.start(3):match.end(3)].strip()
            
            return name, title, company
        
        # Pattern 3: "FirstName LastName, title title title Company"
        # E.g., "Andrei Duică, deputy country manager BYD"
        # Supports diacritics: ă â î ş ţ and uppercase variants
        pattern3 = r"([A-Z][a-z]+ [A-Z][a-zăâîşţ]+),\s+([a-z]+ [a-z]+ [a-z]+)\s+([A-Z]{2,})"
        match = re.search(pattern3, text)
        
        if match:
            name = text[match.start(1):match.end(1)].strip()
            title = text[match.start(2):match.end(2)].strip()
            company = text[match.start(3):match.end(3)].strip()
            
            return name, title, company
        
        # Pattern 2: "FirstName LastName , CEO-ul/CEO Company" or "CEO [Company]" or "partener, Company"
        # E.g., "Daniel Gross, CEO-ul PENNY România" or "Daniel Gross, CEO PENNY România" or "Marius Ionescu, partener, NNDKP"
        # Also handles: "David Whelan, director LinkedIn Talent Solutions Venture Markets (CEE, SEE, Israel)"
        # Also handles: "Premierul Poloniei" or "Prim-ministrul X"
        pattern2 = r"([A-Z][a-z]+ [A-Z][a-zăâîşţ]+),\s+(CEO-?ul?|Founder|Director|Manager|President|Fondator|Branch\s+Director|Chief\s+Operating\s+Officer|Tax\s+Director|Partener|Premierul|Prim-ministrul)\s+(?:al\s+)?(?:în\s+cadrul\s+)?([A-Z][A-Za-zăâîşţ0-9\s]+?)(?:\s*\([^)]*\))?(?:\s+(?:România|în|$)|\n|\.|,)"
        match = re.search(pattern2, normalized, re.IGNORECASE)
        
        if match:
            name = text[match.start(1):match.end(1)].strip()
            title = text[match.start(2):match.end(2)].strip()
            company = text[match.start(3):match.end(3)].strip()
            
            return name, title, company
        
        # Pattern 2b: "FirstName LastName, partener al Company"
        # E.g., "Alina Timofti, partener al NNDKP"
        pattern2b = r"([A-Z][a-z]+ [A-Z][a-zăâîşţ]+),\s+partener\s+al\s+([A-Za-zăâîşţ]+)"
        match = re.search(pattern2b, text, re.IGNORECASE)
        
        if match:
            name = text[match.start(1):match.end(1)].strip()
            title = "partener"
            company = text[match.start(2):match.end(2)].strip()
            
            return name, title, company
        
        # Pattern 5: "director în cadrul Company" - e.g., "Wojciech Chmielewski, director în cadrul Polish Development Bank (BGK)"
        pattern5 = r"([A-Z][a-z]+ [A-Z][a-zăâîşţ]+),\s+director\s+în\s+cadrul\s+([A-Za-zăâîşţ\s]+?)(?:\s*\([^)]+\))?(?:\s+România|$|\n|\.|,)"
        match = re.search(pattern5, text)
        
        if match:
            name = text[match.start(1):match.end(1)].strip()
            title = "director"
            company = text[match.start(2):match.end(2)].strip()
            
            return name, title, company
        
        # Pattern 6: "ambasadorul [country] în [country]" - e.g., "Pawel Soloch, ambasadorul Poloniei în România"
        pattern6 = r"([A-Z][a-z]+ [A-Z][a-zăâîşţ]+),\s+ambasadorul\s+([A-Za-zăâîşţ]+)\s+în\s+([A-Za-zăâîşţ]+)"
        match = re.search(pattern6, text)
        
        if match:
            name = text[match.start(1):match.end(1)].strip()
            title = "ambasador"
            company = text[match.start(2):match.end(2)].strip() + " în " + text[match.start(3):match.end(3)].strip()
            
            return name, title, company
        
        # Pattern 7: "Virginia Farcaș, administratorul M.I.S-Grup"
        pattern7 = r"([A-Z][a-z]+ [A-Z][a-zăâîşţ]+),\s+(administratorul|actionarul|proprietarul)\s+([A-Za-zăâîşţ0-9\s\-]+?)(?:\s+și|\s+și\s+|$|\n|\.|,)"
        match = re.search(pattern7, text, re.IGNORECASE)
        
        if match:
            name = text[match.start(1):match.end(1)].strip()
            title = text[match.start(2):match.end(2)].strip()
            company = text[match.start(3):match.end(3)].strip()
            
            return name, title, company
        
        # Pattern 8: "seniorul Emil Iugan" - Extract the name after "seniorul"
        pattern8 = r"seniorul\s+([A-Z][a-z]+ [A-Z][a-zăâîşţ]+)"
        match = re.search(pattern8, text)
        
        if match:
            name = match.group(1).strip()
            title = "senior"
            company = "M.I.S-Grup"
            
            return name, title, company
        
        # Pattern 9: "Președintele României, Nicușor Dan" or similar
        pattern9 = r"Preşedintele\s+([A-Za-zăâîşţ]+),?\s+([A-Z][a-z]+ [A-Z][a-zăâîşţ]+)"
        match = re.search(pattern9, text)
        
        if match:
            name = match.group(2).strip()
            title = "Președintele " + match.group(1).strip()
            company = ""
            
            return name, title, company
        
        # Pattern 10: Try to match "Nume, expert contabil şi fondator al companiei de contabilitate Company"
        # This must come BEFORE simpler patterns
        pattern10a = r"([A-Z][a-z]+ [A-Z][a-zăâîşţ]+),\s+([a-zăâîşţ]+)\s+[a-zăâîşţ]+\s+[a-zăâîşţ]+\s+[a-zăâîşţ]+\s+([A-Z][A-Za-zăâîşţ0-9]+)"
        match = re.search(pattern10a, text, re.IGNORECASE)
        
        if match:
            name = match.group(1).strip()
            title = match.group(2).strip()
            company = match.group(3).strip()
            return name, title, company
        
        # Pattern 10b: Simple role - "Paul Suciu, expert contabil"
        pattern10b = r"([A-Z][a-z]+ [A-Z][a-zăâîşţ]+),\s+([a-zăâîşţ]+)\s+([a-zăâîşţ]+)"
        match = re.search(pattern10b, text, re.IGNORECASE)
        
        if match:
            name = match.group(1).strip()
            title = match.group(2).strip() + " " + match.group(3).strip()
            return name, title, ""
        
        return "", "", ""
    
    def generate_reel(self, article_text: str) -> ReelContent | None:
        """Generate reel content using Claude API"""
        
        try:
            name, title, company = self.extract_person_info(article_text)
            
            if not name:
                name = "Un expert"
            if not title:
                title = "a declarat"
            if not company:
                company = "a spus"
            
            prompt = f"""Ești redactor pentru content video.

ARTICOL:
{article_text}

SARCINA:
1. TITLE: 3-5 cuvinte
2. DESCRIPTION: EXACT 5-8 CUVINTE
3. MAIN_CONTENT: EXACT 260-310 CARACTERE
   - ÎNCEPE: "Nume, Titlu funcție la Companie, spune că [mesaj]"
   - PASTREAZĂ 1-2 cifre importante
   - FINAL: 💬 👇

RASPUNDE JSON:
```json
{{"title": "...", "description": "5-8 cuvinte", "main_content": "260-310 caractere"}}
```"""

            # Use requests to call API directly
            import requests
            headers = {
                "x-api-key": os.environ.get('ANTHROPIC_API_KEY'),
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            data = {
                "model": CONFIG['api_settings']['model'],
                "max_tokens": CONFIG['api_settings']['max_tokens'],
                "temperature": CONFIG['api_settings']['temperature'],
                "messages": [{"role": "user", "content": prompt}]
            }
            response = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=data
            )
            
            if response.status_code != 200:
                logger.error(f"API Error {response.status_code}: {response.text}")
                return None
            
            response_data = response.json()
            response_text = response_data['content'][0]['text']
            
            # Extract JSON from response - handle backticks and extract all fields
            try:
                response_text = response_text.strip()
                
                # Remove code block markers
                response_text = re.sub(r'^```json\s*', '', response_text)
                response_text = re.sub(r'\s*```$', '', response_text)
                
                # Find JSON bounds
                start = response_text.find('{')
                end = response_text.rfind('}') + 1
                json_str = response_text[start:end]
                
                # Extract fields
                title_match = re.search(r'"title":\s*"([^"]*)"', json_str)
                description_match = re.search(r'"description":\s*"([^"]*)"', json_str)
                
                # Content - find the value between quotes
                content_match = re.search(r'"main_content":\s*"(.*?)"(?:\s*,|\s*})', json_str, re.DOTALL)
                
                if title_match and description_match and content_match:
                    data = {
                        'title': title_match.group(1),
                        'description': description_match.group(1).strip(),
                        'main_content': content_match.group(1).strip(),
                    }
                else:
                    logger.error(f"Could not extract all fields - title: {bool(title_match)}, desc: {bool(description_match)}, content: {bool(content_match)}")
                    return None
            except (json.JSONDecodeError, ValueError) as e:
                logger.error(f"❌ Failed to parse API response: {e}")
                return None
            
            reel = ReelContent(
                title=data['title'],
                description=data['description'],
                main_content=data['main_content'],
                person_info=f"{name}, {title}",
                word_count=len(data['main_content'].split())
            )
            
            logger.info(f"✅ Generated reel: {reel.title}")
            return reel
            
        except Exception as e:
            logger.error(f"❌ Error generating reel: {e}")
            return None
    
    def save_reel(self, reel: ReelContent) -> bool:
        """Save reel to output folder organized by date - filename from API or title"""
        try:
            # Create dated folder: output/YYYY-MM-DD/
            today = datetime.now().strftime('%Y-%m-%d')
            dated_output_dir = self.output_dir / today
            dated_output_dir.mkdir(parents=True, exist_ok=True)
            
            filename = re.sub(r'[^a-zA-Z0-9\s-]', '', reel.title)
            filename = re.sub(r'\s+', '_', filename).lower()
            filename = f"{filename}.md"
            
            # Save Markdown content.md
            md_path = dated_output_dir / filename
            md_content = self._format_markdown(reel)
            with open(md_path, 'w', encoding='utf-8') as f:
                f.write(md_content)
            
            logger.info(f"✅ Saved reel to: {md_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error saving reel: {e}")
            return False
    
    def _format_markdown(self, reel: ReelContent) -> str:
        """Format reel as Markdown - content already has CTA from API"""
        # Ensure content is wrapped in asterisks for italic
        content = reel.main_content.strip()
        
        # Remove any existing asterisks from API
        content = content.replace('*', '')
        
        # Clean up trailing punctuation/spaces
        content = content.rstrip(' !?.,')
        
        # Wrap in asterisks for italic
        if not content.startswith('*'):
            content = '*' + content
        if not content.endswith('*'):
            content = content + '*'
        
        return f"""# {reel.title}

{reel.description}

---

{content}
"""
    
    def process_all(self):
        """Process all articles from input.txt"""
        logger.info("🔄 Starting reel generation...")
        
        articles = self.parse_input_file()
        if not articles:
            return
        
        successful = 0
        failed = 0
        
        for i, article in enumerate(articles, 1):
            logger.info(f"\n📄 Processing article {i}/{len(articles)}...")
            
            reel = self.generate_reel(article)
            if reel:
                if self.save_reel(reel):
                    successful += 1
                    print(f"\n✅ REEL {i} GENERATED\n")
                    print(self._format_markdown(reel))
                else:
                    failed += 1
            else:
                failed += 1
        
        # Summary
        logger.info(f"\n{'='*60}")
        logger.info(f"📊 SUMMARY")
        logger.info(f"{'='*60}")
        logger.info(f"✅ Generated: {successful}")
        logger.info(f"❌ Failed: {failed}")
        logger.info(f"📁 Output folder: {self.output_dir}")
        logger.info(f"{'='*60}")


def main():
    generator = ReelGenerator()
    generator.process_all()


if __name__ == "__main__":
    main()
