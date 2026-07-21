import os
import re

file_path = r"c:\Users\Legend\Desktop\Goldenrich-STR\frontend\src\pages\LandingPage.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Locate the hilltop-retreats block (now second in PREMIUM_COLLECTIONS)
old_block = """  {
    id: 'hilltop-retreats',
    label: 'Hilltop & Nature Retreats',
    subtitle: 'Escape the city into the mountains & forests',
    detail: 'Nestled in Coorg, Munnar, Lonavala & Ooty, these serene retreats offer forest canopy views, bonfire evenings, yoga decks & waterfalls right at your doorstep. Zero connectivity, 100% peace.',
    tag: 'Signature Series',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=900',
    query: 'residential',
    property_type: 'resort'
  }"""

new_block = """  {
    id: 'hilltop-retreats',
    label: 'Signature Series',
    subtitle: 'The ultimate pinnacle of private luxury stays',
    detail: 'A curated portfolio of India’s most exclusive private estates, featuring infinity pools, personalized butler service, master chefs, and unparalleled tranquility.',
    tag: 'Signature Series',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=900',
    query: 'residential',
    property_type: 'resort'
  }"""

# Use regex or simple replace
content = content.replace(old_block, new_block)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Signature Series card text successfully updated in LandingPage.js!")
