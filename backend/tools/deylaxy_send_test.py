"""Send signed test messages to localhost only; never to production.

Run from backend: python tools/deylaxy_send_test.py
For an article: python tools/deylaxy_send_test.py --payload path/to/message.json
"""
import argparse
import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8001/api/deylaxy/posts')
    parser.add_argument('--payload', type=Path, help='JSON event; non-ping messages can change local blog data')
    args = parser.parse_args()
    parsed = urlsplit(args.url)
    if parsed.hostname not in {'127.0.0.1', 'localhost', '::1'} or parsed.scheme not in {'http', 'https'}:
        parser.error('This test tool only permits loopback URLs')
    load_dotenv(Path(__file__).resolve().parents[1] / '.env')
    secret = os.getenv('DEYLAXY_BLOG_SECRET', '')
    if not secret:
        parser.error('Set DEYLAXY_BLOG_SECRET in the local backend/.env first')
    raw = args.payload.read_bytes() if args.payload else b'{"event":"ping"}'
    json.loads(raw)
    ts = str(int(time.time()))
    signature = 'sha256=' + hmac.new(secret.encode(), ts.encode() + b'.' + raw, hashlib.sha256).hexdigest()
    request = urllib.request.Request(args.url, data=raw, method='POST', headers={
        'Content-Type': 'application/json', 'X-Deylaxy-Timestamp': ts,
        'X-Deylaxy-Signature': signature})
    # Refuse redirects as well; a local redirect must never forward this signed request remotely.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *unused):
            return None
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=15) as response:
            print('HTTP', response.status)
            print(response.read(4096).decode())
    except urllib.error.HTTPError as exc:
        print('HTTP', exc.code)
        print(exc.read(4096).decode())
        raise SystemExit(1)


if __name__ == '__main__':
    main()
