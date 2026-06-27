import os
import sys

fn = r'd:\FinalSTR\Goldenrich-STR\frontend\src\App.js'
if not os.path.exists(fn):
    print("Error: App.js not found")
    sys.exit(1)

content = open(fn, 'r', encoding='utf-8').read()

# 1. Add lazy import
target_import = 'const SsoCallback = lazy(() => import("./pages/SsoCallback"));'
replacement_import = """const SsoCallback = lazy(() => import("./pages/SsoCallback"));
const SupportPage = lazy(() => import("./pages/SupportPage"));"""

if target_import not in content:
    print("Error: target import not found")
    sys.exit(1)
content = content.replace(target_import, replacement_import)

# 2. Add Route
target_route = '<Route path="/property/:id" element={<PropertyDetail />} />'
replacement_route = """<Route path="/property/:id" element={<PropertyDetail />} />
              <Route path="/support" element={<SupportPage />} />"""

if target_route not in content:
    print("Error: target route not found")
    sys.exit(1)
content = content.replace(target_route, replacement_route)

open(fn, 'w', encoding='utf-8').write(content)
print("Successfully registered SupportPage route in App.js.")
