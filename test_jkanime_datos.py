import requests
from bs4 import BeautifulSoup
import re
import json

url = "https://jkanime.net/sword-art-online-ii/1/"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

r = requests.get(url, headers=headers, timeout=15)
soup = BeautifulSoup(r.text, 'html.parser')

print("=== BÚSQUEDA DE NOMBRES DE EPISODIO ===\n")

# 1. Buscar en JSON embebido
scripts = soup.find_all('script')
for script in scripts:
    if script.string and 'episodes' in script.string.lower():
        print("Script con 'episodes':")
        print(script.string[:2000])
        print("---")

# 2. Buscar en meta tags
print("\n=== META TAGS ===")
for meta in soup.find_all('meta'):
    if meta.get('name') or meta.get('property'):
        content = meta.get('content', '')
        if content and ('sword' in content.lower() or 'episodio' in content.lower()):
            print(f"{meta.get('name') or meta.get('property')}: {content[:200]}")

# 3. Buscar en h1, h2, h3
print("\n=== HEADERS ===")
for tag in ['h1', 'h2', 'h3']:
    for h in soup.find_all(tag):
        texto = h.get_text(strip=True)
        if texto and len(texto) > 5:
            print(f"{tag}: {texto[:150]}")

# 4. Buscar enlaces a otros episodios (por si tienen títulos)
print("\n=== ENLACES DE EPISODIOS ===")
links = soup.find_all('a', href=re.compile(r'/sword-art-online-ii/\d+/'))
for link in links[:5]:
    print(f"  {link.get_text(strip=True)[:100]} → {link.get('href')}")

# 5. Buscar en el título del documento
print("\n=== TITLE ===")
print(soup.title.string if soup.title else 'N/A')

# 6. Buscar datos estructurados (JSON-LD)
print("\n=== JSON-LD ===")
for script in soup.find_all('script', type='application/ld+json'):
    if script.string:
        try:
            data = json.loads(script.string)
            print(json.dumps(data, indent=2)[:1000])
        except:
            print(script.string[:500])
