#!/usr/bin/env python3
"""Assemble a process-video page from a project folder.

Usage: python3 build.py <project_dir> <out.html>

<project_dir> holds:
  meta.json      title, eyebrow, lede, kinds{up,down}, summary_label, note
  scenes.js      scene draw functions + `const S=[...]` (see references/scene-cookbook.md)
  sections.html  optional: the "설비 검토" sections shown under the chapter list
"""
import html, json, pathlib, re, sys

SKILL = pathlib.Path(__file__).resolve().parent.parent
UNIT_RE = re.compile(r'(\d|~|≥|≤) (μm|nm|mm|cm|m|℃|°C|kOe|kA/m|g/cm³|W/kg|kWh|kW|kHz|Hz|spm|rpm|kN|kg|t|h|T|%|MPa|GPa|kV|kA|V|A|W|wt%|at%|ppm)(?=[\s<,.)·/]|$)')


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    proj, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    tpl = (SKILL / 'assets' / 'player-template.html').read_text(encoding='utf-8')
    meta = json.loads((proj / 'meta.json').read_text(encoding='utf-8'))
    scenes = (proj / 'scenes.js').read_text(encoding='utf-8')
    sec_path = proj / 'sections.html'
    sections = sec_path.read_text(encoding='utf-8') if sec_path.exists() else ''
    # keep numbers glued to units so Korean lines never split "75 / μm"
    sections = UNIT_RE.sub(lambda m: m.group(1) + '&nbsp;' + m.group(2), sections)

    if 'const S=[' not in scenes and 'const S = [' not in scenes:
        sys.exit('scenes.js must define `const S=[...]`')

    kinds = meta.get('kinds', {})
    up, down = kinds.get('up', '업스트림'), kinds.get('down', '다운스트림')
    legend = (f'<span><i style="background:var(--heat)"></i>{html.escape(up)}</span>'
              f'<span><i style="background:var(--accent)"></i>{html.escape(down)}</span>')
    kind_json = json.dumps({'up': up, 'down': down, 'sum': meta.get('summary_label', '요약')}, ensure_ascii=False)

    rep = {
        '{{TITLE}}': html.escape(meta['title']),
        '{{EYEBROW}}': html.escape(meta.get('eyebrow', '')),
        '{{LEDE}}': UNIT_RE.sub(lambda m: m.group(1) + '&nbsp;' + m.group(2), html.escape(meta.get('lede', ''))),
        '{{LEGEND}}': legend,
        '{{NOTE}}': html.escape(meta.get('note', '수치는 일반적인 산업 범위를 단순화한 값이며 공정과 제조사에 따라 다릅니다.')),
        '{{SECTIONS}}': sections.rstrip('\n'),
        '{{KIND_JSON}}': kind_json,
        '/*{{SCENES}}*/': scenes.rstrip('\n'),
    }
    for k, v in rep.items():
        if k not in tpl:
            sys.exit(f'template placeholder missing: {k}')
        tpl = tpl.replace(k, v)
    left = re.findall(r'\{\{[A-Z_]+\}\}', tpl)
    if left:
        sys.exit(f'unfilled placeholders: {left}')
    out.write_text(tpl, encoding='utf-8')
    print(f'built {out} ({len(tpl)//1024} KB)')


if __name__ == '__main__':
    main()
