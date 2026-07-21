import urllib.request
import urllib.error

base_url = "https://www.skyscanner.co.in/images/websites/"

candidates = [
    # Booking.com candidates
    "d_ba.png", "h_ba.png", "d_bk.png", "h_bk.png", "h_bo.png", "d_bo.png", "d_booking.png", "h_booking.png",
    # Expedia candidates
    "d_xp.png", "h_xp.png", "d_ex.png", "h_ex.png", "h_ep.png", "d_ep.png", "d_expedia.png", "h_expedia.png",
    # Trip.com candidates
    "d_ct.png", "h_ct.png",
    # MakeMyTrip candidates
    "h_mq.png", "d_mq.png",
    # Hotels.com candidates
    "h_hc.png", "d_hc.png", "h_he.png", "d_he.png",
    # Airbnb candidates
    "h_ab.png", "d_ab.png"
]

req_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
}

print("Probing Skyscanner logo URLs...")
for cand in candidates:
    url = base_url + cand
    req = urllib.request.Request(url, headers=req_headers)
    try:
        with urllib.request.urlopen(req) as res:
            if res.status == 200:
                print(f"FOUND 200 OK: {cand} -> {url}")
    except urllib.error.HTTPError as e:
        # Ignore failed ones
        pass
    except Exception as e:
        print(f"Error checking {cand}: {e}")
