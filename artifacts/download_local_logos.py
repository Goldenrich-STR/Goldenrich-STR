import os
import urllib.request

logos = {
    "booking.svg": "https://upload.wikimedia.org/wikipedia/commons/b/be/Booking.com_logo.svg",
    "makemytrip.svg": "https://upload.wikimedia.org/wikipedia/commons/3/3c/MakeMyTrip_Logo.svg",
    "trip.svg": "https://upload.wikimedia.org/wikipedia/commons/e/e8/Trip.com_logo.svg",
    "expedia.svg": "https://upload.wikimedia.org/wikipedia/commons/d/df/Expedia_logo.svg",
    "hotels.svg": "https://upload.wikimedia.org/wikipedia/commons/8/87/Hotels.com_logo.svg",
    "airbnb.svg": "https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_B%C3%A9lo.svg"
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
