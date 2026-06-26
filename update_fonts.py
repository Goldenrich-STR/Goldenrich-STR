import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements
    replacements = [
        (r'\sfont-outfit\b', ''),
        (r'\sfont-manrope\b', ''),
        (r'\sfont-sans\b', ''), # Let body handle it, except where needed. Actually keep font-sans.
    ]

    new_content = content
    for pattern, repl in replacements:
        if pattern != r'\sfont-sans\b': # Let's skip removing font-sans
            new_content = re.sub(pattern, repl, new_content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

def main():
    frontend_src = os.path.join('frontend', 'src')
    for root, _, files in os.walk(frontend_src):
        for file in files:
            if file.endswith('.js') or file.endswith('.jsx'):
                process_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
