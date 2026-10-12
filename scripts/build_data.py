#!/usr/bin/env python3
"""Join curated designation lists to official school locations, using only Python's standard library."""
import argparse
import collections
import csv
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
ALIASES = {
    '전남여상': '전남여자상업고등학교', '광주여상': '광주여자상업고등학교',
    '송원미래인재고': '송원미래인재고등학교', '청원남산초': '창원남산초등학교',
    '홍제중': '동국대학교사범대학부속홍제중학교', '서귀산과고': '서귀포산업과학고등학교',
}
PROVINCES = {
    '서울': ('서울',), '경기': ('경기도',), '부산': ('부산',), '인천': ('인천',),
    '세종': ('세종',), '충남': ('충청남도',), '전북': ('전북', '전라북도'),
    '경남': ('경상남도',), '울산': ('울산',), '제주': ('제주',),
    '대구': ('대구',), '대전': ('대전',), '강원': ('강원',),
    '충북': ('충청북도',), '경북': ('경상북도',),
}
GWANGJU_DISTRICTS = {'광산구', '북구', '남구', '동구', '서구'}


def name_key(name):
    name = re.sub(r'\s+', '', name)
    for full, short in [('초등학교', '초'), ('여자중학교', '여중'), ('여자고등학교', '여고'),
                        ('중학교', '중'), ('고등학교', '고'), ('유치원', '유')]:
        name = name.replace(full, short)
    return name


def same_region(location, region):
    parts = (location['소재지도로명주소'] or location['소재지지번주소']).split()
    if not parts:
        return False
    province, district = parts[0], parts[1] if len(parts) > 1 else ''
    if region == '광주권':
        return province.startswith('광주') or (province.startswith('전남광주') and district in GWANGJU_DISTRICTS)
    if region == '전남권':
        return province.startswith(('전라남도', '전남')) and not (province.startswith('전남광주') and district in GWANGJU_DISTRICTS)
    return province.startswith(PROVINCES.get(region, (region,)))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--locations', type=pathlib.Path, default=ROOT / 'data/locations.csv', help='공식 전국 위치 CSV 또는 동봉한 일치 학교 부분집합')
    parser.add_argument('--collected-at', help='목록을 실제 확인한 수집일 YYYY-MM-DD')
    args = parser.parse_args()
    designations = json.loads((ROOT / 'data/designations.json').read_text())
    metadata = json.loads((ROOT / 'data/metadata.json').read_text())
    with args.locations.open(encoding='utf-8-sig', newline='') as handle:
        locations = list(csv.DictReader(handle))
    index = collections.defaultdict(list)
    for location in locations:
        if location['운영상태'] == '운영':
            index[name_key(location['학교명'])].append(location)
    result = {}
    for designation in designations:
        row = dict(designation)
        name = ALIASES.get(row['name'], row['name'])
        candidates = [s for s in index[name_key(name)] if same_region(s, row['region'])]
        if len(candidates) > 1:
            districts = re.split(r'[/／]', row['district'])
            candidates = [s for s in candidates if any(d and d in s['소재지도로명주소'] for d in districts)]
        if len(candidates) == 1:
            school = candidates[0]
            address = school['소재지도로명주소']
            row.update(id=school['학교ID'], name=school['학교명'], address=address,
                       lat=float(school['위도']) if school['위도'] else None,
                       lng=float(school['경도']) if school['경도'] else None,
                       locationDate=school['데이터기준일자'], locationSource='locations',
                       locationMatch='학교명·지역 일치',
                       district=address.split()[1] if len(address.split()) > 1 else row['district'])
        else:
            identity = row['region'] + row['district'] + row['name']
            row.update(id='unlocated-' + hashlib.sha256(identity.encode()).hexdigest()[:12],
                       lat=None, lng=None, address='', locationDate='', locationSource='',
                       locationMatch='공식 위치자료 대조 실패')
        if row['id'] in result:
            raise ValueError(f"중복 학교: {row['name']} ({row['id']})")
        if row['source'] not in metadata['sources']:
            raise ValueError(f"알 수 없는 출처: {row['source']}")
        result[row['id']] = row
    schools = sorted(result.values(), key=lambda row: (row['region'], row['name']))
    dates = sorted({s['locationDate'] for s in schools if s['locationDate']})
    metadata.update(total=len(schools), mapped=sum(s['lat'] is not None and s['lng'] is not None for s in schools),
                    official=sum(metadata['sources'][s['source']]['kind'] == 'official' for s in schools),
                    byRegion=dict(collections.Counter(s['region'] for s in schools)),
                    locationDate=dates[-1] if dates else '')
    if args.collected_at:
        metadata['collectedAt'] = args.collected_at
    metadata['sources']['locations']['date'] = metadata['locationDate']
    for filename, value in [('schools.json', schools), ('metadata.json', metadata)]:
        (ROOT / 'data' / filename).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"수록 {metadata['total']} · 교육청 {metadata['official']} · 위치 확인 {metadata['mapped']} · 위치 미확인 {metadata['total'] - metadata['mapped']}")


if __name__ == '__main__':
    main()
