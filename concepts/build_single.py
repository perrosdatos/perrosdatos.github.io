#!/usr/bin/env python3
"""Bundle a concept page into one self-contained HTML file.

Inlines every <script src> (CDN libraries + shared/world3d.js) and the data the
page would otherwise fetch at runtime (coastlines for the globe, 3D font).
Only Google Fonts stay external; without network the page falls back to system fonts.

usage: python3 build_single.py            -> writes dist/neon-run.html and dist/neural-lab.html
"""
import json, re, sys, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
CACHE = HERE / 'dist' / '.cache'
PAGES = {'1-cyberpunk.html': 'neon-run.html', '5-ai-robotics.html': 'neural-lab.html'}
DATA = {
    '__LAND_JSON': 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json',
    '__FONT_JSON': 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json',
}


def fetch(url: str) -> str:
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / re.sub(r'[^A-Za-z0-9._-]', '_', url)
    if not f.exists():
        with urllib.request.urlopen(url, timeout=60) as r:
            f.write_bytes(r.read())
    return f.read_text(encoding='utf-8')


def safe(js: str) -> str:
    # keep "</script>" inside inlined code from closing the tag early
    return js.replace('</script', '<\\/script')


def build(src: Path, out: Path) -> None:
    html = src.read_text(encoding='utf-8')

    def inline(m):
        url = m.group(1)
        code = fetch(url) if url.startswith('http') else (src.parent / url).read_text(encoding='utf-8')
        return f'<script>/* {url} */\n{safe(code)}\n</script>'

    html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
    links = 'window.__SWITCH_LINKS={neon:"neon-run.html",lab:"neural-lab.html"};'
    data = links + ''.join(f'window.{k}={json.dumps(json.loads(fetch(u)), separators=(",", ":"))};' for k, u in DATA.items())
    # data must exist before world3d.js runs, so put it right after <body>
    html = html.replace('<body>', f'<body>\n<script>{safe(data)}</script>', 1)
    out.write_text(html, encoding='utf-8')
    print(f'{out.relative_to(HERE)}  {out.stat().st_size / 1024:.0f} KB')


if __name__ == '__main__':
    (HERE / 'dist').mkdir(exist_ok=True)
    for src, dst in PAGES.items():
        build(HERE / src, HERE / 'dist' / dst)
    sys.exit(0)
