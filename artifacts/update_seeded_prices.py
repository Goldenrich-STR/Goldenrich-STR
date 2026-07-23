import os
import re
import subprocess

file_path = r"c:\Users\Legend\Desktop\Goldenrich-STR\backend\seed_demo_properties.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Update Candolim Villa price to 52000
content = content.replace('"price_per_night": 22000,', '"price_per_night": 52000,')

# Update Udaipur Palace price to 65000
content = content.replace('"price_per_night": 45000,', '"price_per_night": 65000,')

# Update Karjat Glasshouse price to 58000
content = content.replace('"price_per_night": 26000,', '"price_per_night": 58000,')

# Update Bandra Sea-Facing price to 75000
content = content.replace('"price_per_night": 35000,', '"price_per_night": 75000,')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("seed_demo_properties.py updated with luxury pricing >= 50k!")
