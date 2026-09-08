"""Build compact, offline WOFF2 faces from the included OFL font sources.

Requires fonttools[woff] (fonttools + brotli). Install dependencies from requirements.txt. Re-run after adding UI text.
"""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
from fontTools import subset
from fontTools.ttLib import TTFont

directory = ROOT / 'vendor' / 'fonts'
texts = [ROOT / 'src/ui/template.html', *sorted(p for p in (ROOT / 'src').rglob('*') if p.suffix in {'.js', '.cjs'} and 'generated' not in p.parts)]
codepoints = set(range(32, 127))
for source in texts:
    codepoints.update(map(ord, source.read_text(encoding='utf-8')))
codepoints.update(map(ord, '月序月面聚落设计研究空间重构展示工作台房间楼层初始终态前后比较示范断开落座可达隐藏恢复节点米平方米秒'))
report = {'sources': {}, 'textFiles': [p.relative_to(ROOT).as_posix() for p in texts], 'characters': len(codepoints)}

for original, family, output, required in [
    ('SourceHanSerifSC-Bold', 'Lunaris Serif', 'lunaris-serif-bold.woff2', codepoints),
    ('SpaceGrotesk', 'Lunaris Display', 'lunaris-display.woff2', set(range(32, 592)) | set(range(8192, 8304))),
]:
    source = directory / 'sources' / (original + ('.otf' if original == 'SourceHanSerifSC-Bold' else '.ttf'))
    font = TTFont(source)
    supported = set(font.getBestCmap())
    options = subset.Options()
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.layout_features = ['*']
    options.recalc_timestamp = False
    worker = subset.Subsetter(options=options)
    worker.populate(unicodes=required & supported)
    worker.subset(font)
    # A derivative family name keeps the original names reserved to upstream.
    names = font['name']
    style = 'Bold' if original == 'SourceHanSerifSC-Bold' else 'Regular'
    replacement = {1: family, 2: style, 3: family.replace(' ', '') + '-UI-Subset',
                   4: family, 6: family.replace(' ', ''), 16: family, 17: style,
                   25: family.replace(' ', '')}
    for record in names.names:
        if record.nameID in replacement:
            record.string = replacement[record.nameID].encode(record.getEncoding())
    font.flavor = 'woff2'
    destination = directory / output
    font.save(destination)
    report['sources'][original] = {
        'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'family': family, 'output': output, 'bytes': destination.stat().st_size,
        'glyphCodepoints': len(required & supported),
        'missingCjk': [chr(c) for c in sorted(required - supported) if 0x4E00 <= c <= 0x9FFF],
    }
    font.close()
assert not report['sources']['SourceHanSerifSC-Bold']['missingCjk'], 'UI contains unsupported Chinese text'
(directory / 'build-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report['sources'], ensure_ascii=False, indent=2))
