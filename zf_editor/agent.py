"""
ZF Auto-Agent v3
- Filters articles from YESTERDAY only
- Sorts by view count
- Takes top 10 most viewed relevant articles
"""

import json
import os
import re
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dataclasses import dataclass, field
import requests
from xml.etree import ElementTree as ET

SCRIPT_DIR = Path(__file__).parent
os.chdir(SCRIPT_DIR)

with open('config.json', 'r', encoding='utf-8') as f:
    CONFIG = json.load(f)

OUTPUT_DIR = Path(CONFIG['output_settings']['output_dir'])


@dataclass
class Article:
    title: str
    url: str
    pub_date: str
    keywords: str
    category: str
    view_count: int = 0


class ZFAgent:
    
    def __init__(self):
        self.base_url = "https://www.zf.ro"
        self.sitemap_url = f"{self.base_url}/sitemap.xml"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
        self.relevant_keywords = [
            'românia', 'romania', 'român', 'române', 'bucurești', 'bucuresti',
            'iași', 'iasi', 'cluj', 'timișoara', 'timisoara', 'constanța', 'constanta',
            'craiova', 'brașov', 'brasov', 'sibiu', 'oradea', 'arad', 'ploiesti',
            'business', 'economie', 'economic', 'bani', 'afaceri',
            'companii', 'companie', 'firmă', 'firma', 'antreprenor', 'antreprenori',
            'investiție', 'investitie', 'investiții', 'investitii', 'investitor',
            'creștere', 'crestere', 'scădere', 'scadere', 'profit', 'venit',
            'cifră', 'cifra', 'cifre', 'lei', 'euro', 'milion', 'miliard',
            'energie', 'electric', 'petrol', 'gaze', 'telecom', 'it', 'tech',
            'transport', 'logistic', 'agrobusiness', 'agricultur', 'food',
            'real estate', 'imobiliar', 'construcții', 'constructii',
            'farmacie', 'health', 'sănătate', 'sanatate', 'educație', 'educatie',
            'job', 'jobs', 'angajare', 'angaja', 'salariu', 'salarii',
            'carieră', 'cariera', 'recrutare', 'loc de muncă',
            'piață', 'piata', 'bursă', 'bursa', 'acțiuni', 'actiuni',
            'tranzacție', 'tranzactie', 'vânzări', 'vanzari', 'export', 'import',
            'ue', 'uniunea europeană', 'uniunea europeana', 'europa', 'european',
            'gen z', 'tineri', 'tânăr', 'tanar', 'student', 'studenți',
            'absolvent', 'absolvenți', 'next gen', 'generația',
        ]
        
        self.exclude_keywords = [
            'iran', 'ucraina', 'rusia', 'china', 'india', 'brazilia',
            'orientul mijlociu', 'trump', 'biden', 'putin',
            'argentina', 'japonia', 'australia', 'canada', 'taiwan',
        ]
        
        self.romania_mentions = ['românia', 'romania', 'român', 'române', 'bucurești']

    def fetch_sitemap(self) -> list[Article]:
        print("🔄 Fetching sitemap...")
        
        try:
            response = self.session.get(self.sitemap_url, timeout=30)
            response.raise_for_status()
            
            root = ET.fromstring(response.content)
            
            ns = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
                  'news': 'http://www.google.com/schemas/sitemap-news/0.9'}
            
            articles = []
            
            for url_elem in root.findall('.//ns:url', ns):
                loc = url_elem.find('ns:loc', ns)
                if loc is None or not loc.text:
                    continue
                    
                url = loc.text
                
                skip_patterns = ['/autor/', '/eveniment/', '/conferinte/', '/anuare/', 
                                '/podcasturi/', '/curs-valutar/', '/newsletter-abonare',
                                '/fonduri-mutuale/', '/zfcorporate', '/businessmagazin',
                                '/fanatik', '/m.', '/#', 'index', 'sitemap']
                if any(p in url for p in skip_patterns):
                    continue
                    
                if not url.startswith('https://www.zf.ro/'):
                    continue
                    
                news_elem = url_elem.find('news:news', ns)
                if news_elem is None:
                    continue
                    
                title_elem = news_elem.find('news:title', ns)
                title = title_elem.text if title_elem is not None and title_elem.text else ""
                
                date_elem = news_elem.find('news:publication_date', ns)
                pub_date = date_elem.text if date_elem is not None and date_elem.text else ""
                
                kw_elem = news_elem.find('news:keywords', ns)
                keywords = kw_elem.text if kw_elem is not None and kw_elem.text else ""
                
                category = ""
                url_path = url.replace('https://www.zf.ro/', '')
                if '/' in url_path:
                    category = url_path.split('/')[0]
                
                if title and pub_date:
                    articles.append(Article(
                        title=title[:200],
                        url=url,
                        pub_date=pub_date,
                        keywords=keywords or "",
                        category=category
                    ))
            
            articles.sort(key=lambda x: x.pub_date, reverse=True)
            print(f"✅ Found {len(articles)} articles in sitemap")
            return articles
            
        except Exception as e:
            print(f"❌ Error fetching sitemap: {e}")
            return []
    
    def parse_pub_date(self, pub_date_str: str) -> datetime:
        try:
            pub_date_str = pub_date_str.strip()
            if '+03:00' in pub_date_str:
                dt = datetime.fromisoformat(pub_date_str.replace('+03:00', '+03:00'))
                return dt.astimezone(timezone.utc)
            elif '+02:00' in pub_date_str:
                dt = datetime.fromisoformat(pub_date_str.replace('+02:00', '+02:00'))
                return dt.astimezone(timezone.utc)
            else:
                return datetime.fromisoformat(pub_date_str)
        except:
            return datetime.min.replace(tzinfo=timezone.utc)
    
    def get_yesterday_range(self) -> tuple[datetime, datetime]:
        yesterday = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=1)
        tomorrow = yesterday + timedelta(days=1)
        return yesterday, tomorrow
    
    def is_from_yesterday(self, pub_date_str: str) -> bool:
        pub_dt = self.parse_pub_date(pub_date_str)
        yesterday_start, yesterday_end = self.get_yesterday_range()
        return yesterday_start <= pub_dt < yesterday_end
    
    def is_relevant(self, article: Article) -> bool:
        text = (article.title + ' ' + article.keywords + ' ' + article.category).lower()
        
        should_exclude = any(kw in text for kw in self.exclude_keywords)
        if should_exclude:
            has_romania = any(kw in text for kw in self.romania_mentions)
            if not has_romania:
                return False
        
        return any(kw in text for kw in self.relevant_keywords)
    
    def fetch_view_count(self, article: Article) -> int:
        try:
            response = self.session.get(article.url, timeout=15)
            html = response.text
            
            patterns = [
                r'([\d.]+)\s*(?:vizualizări|views|accesări|citiri)',
                r'([\d.]+)\s*viz',
                r'vizualizări[^<]*?([\d.]+)',
                r'views[^<]*?([\d.]+)',
                r'"interactionCount"\s*:\s*"[^"]*?([\d]+)[^"]*?"',
                r'data-views=["\']([^"\']+)',
                r'class="[^"]*views[^"]*">\s*([\d.,]+)',
            ]
            
            for pattern in patterns:
                match = re.search(pattern, html, re.IGNORECASE)
                if match:
                    view_str = match.group(1).replace('.', '').replace(',', '')
                    try:
                        return int(view_str)
                    except:
                        pass
            
            numbers = re.findall(r'\b(\d{4,})\b', html)
            for num_str in numbers:
                try:
                    num = int(num_str)
                    if 1000 <= num <= 10000000:
                        return num
                except:
                    pass
                    
            return 0
            
        except Exception as e:
            return 0
    
    def fetch_view_count_browser(self, url: str) -> int:
        """Try to fetch view count using browser. Returns 0 if unavailable."""
        try:
            from playwright.sync_api import sync_playwright
            
            with sync_playwright() as p:
                browser = p.firefox.launch(headless=True)
                page = browser.new_page(viewport={'width': 1280, 'height': 800})
                
                page.goto(url, timeout=30000)
                page.wait_for_load_state('domcontentloaded', timeout=10000)
                page.wait_for_timeout(8000)
                
                html = page.content()
                browser.close()
                
                patterns = [
                    r'(\d{3,6})\s*vizualiz',
                    r'(\d{3,6})\s*views',
                    r'viziuni[^>]*?(\d{3,6})',
                ]
                
                for pattern in patterns:
                    match = re.search(pattern, html, re.IGNORECASE)
                    if match:
                        return int(match.group(1))
                
                return 0
        except Exception as e:
            return 0
    
    def fetch_view_counts_parallel(self, articles: list[Article], max_workers: int = 5) -> list[Article]:
        print(f"\n🔍 Fetching view counts for {len(articles)} articles...")
        
        def fetch_single(article: Article) -> tuple[str, int]:
            views = self.fetch_view_count(article)
            return article.url, views
        
        results = {}
        completed = 0
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(fetch_single, art): art for art in articles}
            
            for future in as_completed(futures):
                completed += 1
                url, views = future.result()
                results[url] = views
                article_title = futures[future].title[:50]
                print(f"   [{completed}/{len(articles)}] {views:,} views - {article_title}...")
                time.sleep(0.3)
        
        for article in articles:
            article.view_count = results.get(article.url, 0)
        
        return articles
    
    def filter_yesterday_articles(self, articles: list[Article]) -> list[Article]:
        print("🔍 Filtering articles from YESTERDAY...")
        
        yesterday_articles = []
        yesterday_start, yesterday_end = self.get_yesterday_range()
        
        for article in articles:
            if self.is_from_yesterday(article.pub_date):
                yesterday_articles.append(article)
        
        print(f"   📅 From yesterday ({yesterday_start.strftime('%Y-%m-%d')}): {len(yesterday_articles)}/{len(articles)}")
        return yesterday_articles
    
    def filter_relevant_articles(self, articles: list[Article]) -> list[Article]:
        print("🔍 Filtering by relevance (Romania, companies, experts)...")
        
        relevant = [a for a in articles if self.is_relevant(a)]
        print(f"   ✅ Relevant: {len(relevant)}/{len(articles)}")
        return relevant
    
    def sort_by_views(self, articles: list[Article]) -> list[Article]:
        articles.sort(key=lambda x: x.view_count, reverse=True)
        return articles
    
    def is_already_generated(self, article: Article) -> bool:
        output_dirs = OUTPUT_DIR.glob('*')
        title_slug = self._slugify(article.title[:50])
        
        for output_dir in output_dirs:
            if not output_dir.is_dir():
                continue
            for md_file in output_dir.glob('*.md'):
                filename_slug = md_file.stem.lower()
                if title_slug[:20] in filename_slug or filename_slug[:20] in title_slug:
                    return True
        return False
    
    def _slugify(self, text: str) -> str:
        text = text.lower()
        text = text.replace('ă', 'a').replace('â', 'a').replace('î', 'i')
        text = text.replace('ș', 's').replace('ț', 't')
        text = re.sub(r'[^a-z0-9\s-]', '', text)
        text = re.sub(r'\s+', '-', text)
        return text[:50]
    
    def fetch_article_content(self, url: str) -> str:
        try:
            response = self.session.get(url, timeout=30)
            html = response.text
            
            content = ""
            
            match = re.search(r'"articleBody"\s*:\s*"([^"]*(?:\\.[^"]*)*)"', html, re.DOTALL)
            if match:
                content = match.group(1)
                content = content.encode().decode('unicode_escape')
            
            if not content:
                soup = __import__('bs4').BeautifulSoup(html, 'html.parser')
                json_ld_scripts = soup.find_all('script', type='application/ld+json')
                for json_ld in json_ld_scripts:
                    try:
                        if not json_ld or not json_ld.string:
                            continue
                        json_str = json_ld.string
                        json_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', json_str)
                        data = json.loads(json_str)
                        
                        if isinstance(data, dict):
                            if data.get('@type') in ['NewsArticle', 'Article']:
                                if data.get('articleBody'):
                                    content = data['articleBody']
                                    break
                                elif data.get('description'):
                                    content = data['description']
                                    break
                            if data.get('articleBody'):
                                content = data['articleBody']
                                break
                            if '@graph' in data:
                                for item in data['@graph']:
                                    if isinstance(item, dict) and item.get('articleBody'):
                                        content = item['articleBody']
                                        break
                    except:
                        continue
            
            if not content:
                soup = __import__('bs4').BeautifulSoup(html, 'html.parser')
                article_body = soup.find('article')
                if article_body:
                    paragraphs = article_body.find_all('p')
                    content = ' '.join(p.get_text(strip=True) for p in paragraphs)
            
            content = re.sub(r'\s+', ' ', content)
            content = content.strip()
            
            return content[:5000]
            
        except Exception as e:
            return ""
    
    def process_article(self, article: Article) -> bool:
        print(f"\n📄 Processing: {article.title[:60]}...")
        
        content = self.fetch_article_content(article.url)
        if not content:
            print(f"❌ Could not fetch article content")
            return False
        
        full_content = f"{article.title}\n\n{content}"
        
        input_file = SCRIPT_DIR / 'input.txt'
        with open(input_file, 'w', encoding='utf-8') as f:
            f.write(full_content)
        
        try:
            result = subprocess.run(
                ['python3', 'generator.py'],
                cwd=SCRIPT_DIR,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode == 0:
                print(f"✅ Generated successfully")
                return True
            else:
                print(f"❌ Generator error: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error running generator: {e}")
            return False
    
    def run(self, max_articles: int = 10, max_workers: int = 5):
        print("=" * 60)
        print("🚀 ZF AUTO-AGENT v3 - TOP VIEWS MODE")
        print("=" * 60)
        
        yesterday_start, yesterday_end = self.get_yesterday_range()
        print(f"📅 Target date: YESTERDAY ({yesterday_start.strftime('%Y-%m-%d')})")
        
        all_articles = self.fetch_sitemap()
        if not all_articles:
            print("❌ No articles found")
            return
        
        yesterday_articles = self.filter_yesterday_articles(all_articles)
        
        relevant_articles = self.filter_relevant_articles(yesterday_articles)
        
        articles_with_views = self.fetch_view_counts_parallel(relevant_articles, max_workers=max_workers)
        
        sorted_articles = self.sort_by_views(articles_with_views)
        
        zero_views_count = sum(1 for a in sorted_articles if a.view_count == 0)
        if zero_views_count > len(sorted_articles) * 0.7:
            print(f"⚠️ Most articles returned 0 views, using sitemap order...")
            sorted_articles = sorted(articles_with_views, key=lambda x: x.pub_date, reverse=True)
        
        new_articles = [a for a in sorted_articles if not self.is_already_generated(a)]
        print(f"\n📊 Total relevant from yesterday: {len(sorted_articles)}")
        print(f"📊 New (not yet generated): {len(new_articles)}")
        
        to_process = new_articles[:max_articles]
        
        if not to_process:
            print("✅ No new articles to process")
            return
        
        print("\n" + "=" * 60)
        print(f"🏆 TOP {len(to_process)} MOST VIEWED ARTICLES (Yesterday):")
        print("=" * 60)
        for i, a in enumerate(to_process, 1):
            print(f"{i}. [{a.view_count:,} views] {a.title[:65]}")
        print("=" * 60)
        
        successful = 0
        failed = 0
        
        for article in to_process:
            if self.process_article(article):
                successful += 1
            else:
                failed += 1
        
        print("\n" + "=" * 60)
        print("📊 SUMMARY")
        print("=" * 60)
        print(f"✅ Successfully generated: {successful}")
        print(f"❌ Failed: {failed}")
        print(f"📁 Output: {OUTPUT_DIR}")
        print("=" * 60)


def main():
    import sys
    
    max_articles = 10
    max_workers = 5
    
    if '--url' in sys.argv:
        url_idx = sys.argv.index('--url')
        if url_idx + 1 < len(sys.argv):
            url = sys.argv[url_idx + 1]
            agent = ZFAgent()
            article = Article(
                title="Custom URL",
                url=url,
                pub_date=datetime.now().isoformat(),
                keywords="",
                category=""
            )
            if agent.process_article(article):
                print("✅ URL processed successfully!")
            else:
                print("❌ Failed to process URL")
            return
    
    if '--urls' in sys.argv:
        urls_idx = sys.argv.index('--urls')
        if urls_idx + 1 < len(sys.argv):
            urls_file = sys.argv[urls_idx + 1]
            agent = ZFAgent()
            try:
                with open(urls_file, 'r') as f:
                    urls = [line.strip() for line in f if line.strip()]
                
                for i, url in enumerate(urls, 1):
                    print(f"\n📄 Processing URL {i}/{len(urls)}: {url[:60]}...")
                    article = Article(
                        title=f"Custom URL {i}",
                        url=url,
                        pub_date=datetime.now().isoformat(),
                        keywords="",
                        category=""
                    )
                    agent.process_article(article)
                print(f"\n✅ Processed {len(urls)} URLs")
            except Exception as e:
                print(f"❌ Error reading URLs file: {e}")
            return
    
    if len(sys.argv) > 1:
        try:
            max_articles = int(sys.argv[1])
        except:
            pass
    
    if len(sys.argv) > 2:
        try:
            max_workers = int(sys.argv[2])
        except:
            pass
    
    agent = ZFAgent()
    agent.run(max_articles=max_articles, max_workers=max_workers)


if __name__ == "__main__":
    main()
