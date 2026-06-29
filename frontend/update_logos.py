import os
import glob
import re

def update_logos():
    src_dir = r"c:\Users\Legend\Desktop\Goldenrich-STR\frontend\src"
    for root, _, files in os.walk(src_dir):
        for file in files:
            if file.endswith((".js", ".jsx")):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if 'logo.png' in content:
                    # Look for <img src="/logo.png" ... className="... " ... />
                    # We will append brightness-0 (black) by default. 
                    # If it's the landing page navbar or footer, we handle it separately.
                    
                    # For now, let's just make sure ALL logos have a specific base class like 'brand-logo-img' 
                    # But it's easier to just add 'brightness-0' to all, and then manually fix the dark ones.
                    pass
                    
if __name__ == "__main__":
    update_logos()
