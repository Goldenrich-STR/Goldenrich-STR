import os
fn = r'd:\FinalSTR\Goldenrich-STR\backend\routes\cms_routes.py'
content = open(fn, 'r', encoding='utf-8').read()
content = content.replace('"section": "content"', '"section": "support_content"')
open(fn, 'w', encoding='utf-8').write(content)
print("Updated successfully")
