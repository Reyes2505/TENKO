import requests
from bs4 import BeautifulSoup
import re

url = "https://jkanime.net/sword-art-online-ii/1/"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

r = requests.get(url, headers=headers, timeout=15)
soup = BeautifulSoup(r.text, 'html.parser')

print(f"Status: {r.status_code}")
print(f"Título: {soup.title.string if soup.title else 'N/A'}")

# Buscar información del episodio
h1 = soup.find('h1')
if h1:
    print(f"H1: {h1.text.strip()}")

# Buscar fecha
fecha = soup.find('span', class_='date') or soup.find('div', class_='date')
if fecha:
    print(f"Fecha: {fecha.text.strip()}")

# Buscar metadatos
meta_desc = soup.find('meta', {'name': 'description'})
if meta_desc:
    print(f"Descripción: {meta_desc.get('content', '')[:200]}")
