"""BIS官方季度表→年末实质住宅价格与同比；无Q4就不生成该年。"""
import csv
import hashlib
import io
import json
import math
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
def code(s):
    return s.split(':', 1)[0].strip()
source = ROOT / 'data/bis/WS_SPP_csv_flat.20261112.zip'
roster = ROOT / 'src/gen/data.js'
text = roster.read_text()
data = json.loads(text.split('=', 1)[1].strip().rstrip(';'))
ids = {r[0] for r in data['rows']}
country_file = ROOT / 'data/worldbank/_countries_en.json'
iso = {r['iso2Code']: r['id'] for r in json.loads(country_file.read_text())[1] if r['id'] in ids}
out = {}
with zipfile.ZipFile(source) as archive:
    # 读取已知CSV，不把ZIP路径解压到工作区。
    rows = csv.DictReader(io.TextIOWrapper(archive.open('WS_SPP_csv_flat.csv'), encoding='utf-8-sig'))
    for row in rows:
        id = iso.get(code(row['REF_AREA:Reference area']))
        period = row['TIME_PERIOD:Time period or range']
        if not id or code(row['FREQ:Frequency']) != 'Q' or code(row['VALUE:Value']) != 'R' or not period.endswith('-Q4'):
            continue
        year = int(period[:4])
        if year < 1960 or year > 2025 or not row['OBS_VALUE:Observation Value']:
            continue
        value = float(row['OBS_VALUE:Observation Value'])
        if not math.isfinite(value):
            continue
        unit = code(row['UNIT_MEASURE:Unit of measure'])
        if unit not in ['628', '771']:
            continue
        entry = out.setdefault(id, {}).setdefault(str(year), {})
        entry['index' if unit == '628' else 'change'] = round(value if unit == '628' else value / 100, 8)
out = {id: dict(sorted(years.items())) for id, years in sorted(out.items())}
payload = {'v': 1, 'through': 2025, 'source': 'BIS Selected residential property prices', 'units': {'index': '年末实质指数，2010=100', 'change': 'Q4同比小数，非房租或绝对房价'}, 'urbanOnly': True, 'C': out}
js = '/* tools/build_housing.py；来源及覆盖见 data/bis/COVERAGE.json */\nwindow.NL_HOUSING=' + json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + ';\n'
coverage = {'source': {'file': str(source.relative_to(ROOT)), 'sha256': sha(source)}, 'mappingSHA256': sha(country_file), 'rosterSHA256': sha(roster), 'policy': '只取官方Q4实质指数与同比，不从缺测年份插值，不延长到2026；保守仅接入城市住房模型。住房覆盖不等于全国每种住宅，租金仍是游戏配置。', 'countries': {id: {'indexFirst': min(int(y) for y, v in years.items() if 'index' in v), 'indexLast': max(int(y) for y, v in years.items() if 'index' in v), 'indexYears': sum('index' in v for v in years.values()), 'changeYears': sum('change' in v for v in years.values())} for id, years in out.items()}, 'missing': sorted(ids - out.keys()), 'generatedSHA256': hashlib.sha256(js.encode()).hexdigest()}
target = ROOT / 'src/gen/housing.js'
record = ROOT / 'data/bis/COVERAGE.json'
if '--check' in sys.argv:
    assert target.read_text() == js
    assert json.loads(record.read_text()) == coverage
else:
    target.write_text(js)
    record.write_text(json.dumps(coverage, ensure_ascii=False, indent=2) + '\n')
print('BIS housing:', len(out), 'places;', sum(len(v) for v in out.values()), 'annual records;', len(js.encode()), 'bytes')
