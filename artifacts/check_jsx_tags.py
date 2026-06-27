fn = r'd:\FinalSTR\Goldenrich-STR\frontend\src\pages\HostDashboard.js'
content = open(fn, 'r', encoding='utf-8').read()

pos = content.rfind('onSubmit={handleVerifySubmit}')
if pos == -1:
    print("Could not find onSubmit={handleVerifySubmit}")
    # Let's search case insensitively or with different spacing
    import re
    m = re.search(r'onSubmit\s*=\s*{\s*handleVerifySubmit\s*}', content)
    if m:
        pos = m.start()
    else:
        print("Could not find form onSubmit using regex")
        exit(1)

# Find first <form before pos
start_pos = content.rfind('<form', 0, pos)
if start_pos == -1:
    print("Could not find <form before pos")
    exit(1)

end_pos = content.find('</form>', start_pos)
if end_pos == -1:
    print("Could not find </form>")
    exit(1)

form_content = content[start_pos:end_pos]
lines = form_content.split('\n')
open_divs = 0
stack = []
for i, line in enumerate(lines):
    import re
    matches = re.finditer(r'(<div|</div)', line)
    for m in matches:
        tag = m.group(1)
        if tag == '<div':
            open_divs += 1
            stack.append((i + 1, line.strip()))
        else:
            open_divs -= 1
            if stack:
                stack.pop()

print(f"Total unclosed divs in form: {open_divs}")
if open_divs != 0:
    print("Open stack:")
    for item in stack:
        print(f"Line {item[0]}: {item[1]}")
