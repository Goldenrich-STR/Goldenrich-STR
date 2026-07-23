import os
import urllib.request

output_dir = r"c:\Users\Legend\Desktop\Goldenrich-STR\frontend\public\images\logos"
os.makedirs(output_dir, exist_ok=True)

logos = {
    "booking.svg": "https://upload.wikimedia.org/wikipedia/commons/b/be/Booking.com_logo.svg",
    "airbnb.svg": "https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_B%C3%A9lo.svg"
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/svg+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
}

print("Downloading official horizontal logos from Wikipedia...")
for name, url in logos.items():
    dest_path = os.path.join(output_dir, name)
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            content = response.read()
            with open(dest_path, "wb") as f:
                f.write(content)
        print(f"SUCCESS: Overwrote local {name} (size: {len(content)} bytes)")
    except Exception as e:
        print(f"FAILED to download {name}: {e}")
