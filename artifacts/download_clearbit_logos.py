import os
import urllib.request

domains = {
    "booking.png": "booking.com",
    "makemytrip.png": "makemytrip.com",
    "trip.png": "trip.com",
    "expedia.png": "expedia.com",
    "hotels.png": "hotels.com",
    "airbnb.png": "airbnb.com"
}

output_dir = r"c:\Users\Legend\Desktop\Goldenrich-STR\frontend\public\images\logos"
os.makedirs(output_dir, exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
}

print("Downloading logos from Clearbit API...")
for name, domain in domains.items():
    url = f"https://logo.clearbit.com/{domain}?size=200"
    dest_path = os.path.join(output_dir, name)
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            with open(dest_path, "wb") as f:
                f.write(response.read())
        print(f"SUCCESS: Downloaded {name} from {url}")
    except Exception as e:
        print(f"FAILED to download {name} from {url}: {e}")
