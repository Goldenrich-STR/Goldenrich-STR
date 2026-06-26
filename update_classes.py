import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements
    replacements = [
        (r'rounded-\[2rem\]', 'rounded-2xl'),
        (r'rounded-\[2\.5rem\]', 'rounded-3xl'),
        (r'shadow-2xl', 'shadow-elevated'),
        (r'shadow-xl', 'shadow-premium'),
        (r'shadow-lg', 'shadow-premium'),
        (r'shadow-md', 'shadow-subtle'),
        (r'border-sand-200\/50', 'border-gray-100'),
        (r'border-sand-200', 'border-gray-100'),
        (r'border-sand-300', 'border-gray-200'),
        (r'bg-sand-50', 'bg-stone'),
        (r'bg-sand-100', 'bg-gray-50'),
        (r'text-sand-900', 'text-gray-800'),
        (r'font-black', 'font-bold tracking-tight'),
        (r'font-extrabold', 'font-semibold tracking-tight'),
        # Fix specific aggressive hovers
        (r'hover:-translate-y-2', 'hover:-translate-y-1'),
        (r'hover:scale-105', 'hover:scale-[1.02]'),
        (r'hover:scale-110', 'hover:scale-[1.03]'),
    ]

    new_content = content
    for pattern, repl in replacements:
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
