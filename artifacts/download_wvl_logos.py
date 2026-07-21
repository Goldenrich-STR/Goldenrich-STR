import os
import urllib.request

logos = {
    "booking.svg": "https://cdn.worldvectorlogo.com/logos/bookingcom-1.svg",
    "makemytrip.svg": "https://cdn.worldvectorlogo.com/logos/makemytrip.svg",
    "trip.svg": "https://cdn.worldvectorlogo.com/logos/trip-com.svg",
    "expedia.svg": "https://cdn.worldvectorlogo.com/logos/expedia-1.svg",
    "hotels.svg": "https://cdn.worldvectorlogo.com/logos/hotels-com.svg",
    "airbnb.svg": "https://cdn.worldvectorlogo.com/logos/airbnb-2.svg"
}

output_dir = r"c:\Users\Legend\Desktop\Goldenrich-STR\frontend\public\images\logos"
os.makedirs(output_dir, exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
}

print("Downloading brand logos locally...")
for name, url in logos.items():
    dest_path = os.path.join(output_dir, name)
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            with open(dest_path, "wb") as f:
                f.write(response.read())
        print(f"SUCCESS: Downloaded {name} to {dest_path}")
    except Exception as e:
        print(f"FAILED to download {name} from {url}: {e}")
