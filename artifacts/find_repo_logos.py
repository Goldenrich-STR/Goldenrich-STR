import urllib.request
import json
import re

url = "https://api.github.com/repos/gilbarbara/logos/contents/logos"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        files = json.loads(response.read().decode('utf-8'))
        for file in files:
            name = file['name']
            if 'booking' in name.lower() or 'airbnb' in name.lower():
                print(f"FOUND FILE: {name} -> {file['download_url']}")
except Exception as e:
    print(f"Error fetching repo contents: {e}")
