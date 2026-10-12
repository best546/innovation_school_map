import sys,pathlib,json,csv,collections
import shapefile
from pyproj import Transformer
from shapely.geometry import shape,mapping
from shapely.ops import transform
import argparse
p=argparse.ArgumentParser(description='공식 초등 통학구역을 수록 학교 ID와 연결합니다.')
p.add_argument('--shapefile',type=pathlib.Path,required=True)
p.add_argument('--links',type=pathlib.Path,required=True)
a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]
schools=json.loads((root/'data/schools.json').read_text());ids={s['id'] for s in schools if s['level']=='초등학교'}
links=list(csv.DictReader(a.links.open(encoding='utf-8-sig')))
zone_schools=collections.defaultdict(set)
for l in links:
 if l['학교급구분']=='초등학교' and l['학교ID'] in ids:zone_schools[l['학구ID']].add(l['학교ID'])
reader=shapefile.Reader(str(a.shapefile),encoding='euc-kr')
project=Transformer.from_crs('EPSG:5186','EPSG:4326',always_xy=True).transform
result=[]
for r in reader.iterShapeRecords():
 data=r.record.as_dict();zid=data['HAKGUDO_ID']
 if zid not in zone_schools:continue
 geom=shape(r.shape.__geo_interface__)
 if not geom.is_valid:geom=geom.buffer(0)
 geom=transform(project,geom.simplify(3,preserve_topology=True))
 # Round to ~0.1m; display geometry is simplified by 3m, not used to decide individual apartment assignment.
 geom=json.loads(json.dumps(mapping(geom)),parse_float=lambda n:round(float(n),6))
 result.append({'type':'Feature','geometry':geom,'properties':{'id':zid,'name':data['HAKGUDO_NM'],'type':data['HAKGUDO_GB'],'schoolIds':sorted(zone_schools[zid]),'date':data['BASE_DT']}})
(root/'data/elementary-zones.geojson').write_text(json.dumps({'type':'FeatureCollection','features':result},ensure_ascii=False,separators=(',',':')))
print('통학구역',len(result),'학교',len({i for r in result for i in r['properties']['schoolIds']}),'bytes',(root/'data/elementary-zones.geojson').stat().st_size)

p=root/'data/metadata.json'
m=json.loads(p.read_text())
m['catchments']={'features':len(result),'schools':len({i for r in result for i in r['properties']['schoolIds']}),'simplificationMeters':3,'date':max(r['properties']['date'] for r in result)}
m['sources']['zones']['date']=m['catchments']['date']
p.write_text(json.dumps(m,ensure_ascii=False,indent=2))
