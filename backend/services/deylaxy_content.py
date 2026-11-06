"""Map the vendor's Markdown articles to the existing X-Space360 blog fields."""
import re
from datetime import datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30))
FAQ_HEADING = re.compile(r'^##\s+(?:faqs?|frequently asked questions|common questions)\s*[:?]?\s*$', re.I)


def plain(markdown):
    text = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', markdown)
    text = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', text)
    text = re.sub(r'[*_`>]', '', text)
    return re.sub(r'\s+', ' ', text).strip()


def _outside_fences(lines):
    """Do not mistake code examples for real FAQ/table content."""
    fence = None
    outside = []
    for line in lines:
        marker = re.match(r'^\s*(`{3,}|~{3,})', line)
        if marker:
            token = marker.group(1)
            if fence is None:
                fence = token
            elif token[0] == fence[0] and len(token) >= len(fence):
                fence = None
            outside.append(False)
        else:
            outside.append(fence is None)
    return outside


def split_faqs(markdown):
    lines = markdown.splitlines()
    outside = _outside_fences(lines)
    start = next((i for i, line in enumerate(lines) if outside[i] and FAQ_HEADING.match(line.strip())), -1)
    if start < 0:
        return markdown, []
    end = next((i for i in range(start + 1, len(lines)) if outside[i] and re.match(r'^#{1,2}\s', lines[i].strip())), len(lines))
    faqs, question, answers = [], None, []

    def push():
        if question and answers:
            faqs.append({'question': question[:300], 'answer': plain(' '.join(answers))[:1000]})

    for i in range(start + 1, end):
        line = lines[i].strip()
        heading = (re.match(r'^###\s+(.+)$', line) or re.match(r'^\*\*(.+\?)\*\*$', line)) if outside[i] else None
        if heading:
            push()
            question, answers = plain(heading.group(1)), []
        elif question and line:
            answers.append(line)
    push()
    if not faqs:
        return markdown, []
    return '\n'.join(lines[:start] + lines[end:]).strip(), faqs


def _cells(line):
    return [plain(cell.replace(r'\|', '|')) for cell in re.split(r'(?<!\\)\|', line.strip().strip('|'))]


def split_table(markdown):
    lines = markdown.splitlines()
    outside = _outside_fences(lines)
    for i in range(len(lines) - 1):
        if not outside[i] or not outside[i + 1] or not lines[i].strip().startswith('|'):
            continue
        separators = _cells(lines[i + 1])
        headers = _cells(lines[i])
        if len(separators) != len(headers) or not separators or not all(re.fullmatch(r':?-{2,}:?', cell) for cell in separators):
            continue
        end = i + 2
        while end < len(lines) and outside[end] and lines[end].strip().startswith('|'):
            end += 1
        rows = [(cells + [''] * len(headers))[:len(headers)] for cells in map(_cells, lines[i + 2:end])]
        title = ''
        for previous in reversed(lines[:i]):
            if not previous.strip():
                continue
            if previous.lstrip().startswith('#'):
                title = plain(previous.lstrip().lstrip('#'))
            break
        return '\n'.join(lines[:i] + lines[end:]).strip(), {'title': title, 'headers': headers, 'rows': rows}
    return markdown, {'title': '', 'headers': [], 'rows': []}


def reading_time(markdown):
    return f'{max(1, round(len(plain(markdown).split()) / 200))} min read'


def date_label(now=None):
    value = (now or datetime.now(timezone.utc)).astimezone(IST)
    return f'{value.day} {value.strftime("%B %Y")}'
