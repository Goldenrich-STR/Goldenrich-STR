import urllib.request
import urllib.error

base_url = "https://cdn.worldvectorlogo.com/logos/"
candidates = [
    "booking-com.svg", "booking-com-1.svg", "booking-com-2.svg", "booking-com-3.svg", "booking-com-4.svg",
    "bookingcom.svg", "bookingcom-1.svg", "bookingcom-2.svg", "bookingcom-3.svg"
]

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
}

print("Probing WVL for Booking.com logo...")
for cand in candidates:
    url = base_url + cand
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print(f"FOUND: {cand} -> {url}")
    except Exception as e:
        pass
