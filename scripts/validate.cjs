// Run from any directory: node scripts/validate.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const schools = JSON.parse(fs.readFileSync(path.join(root, 'data/schools.json'), 'utf8'));
const meta = JSON.parse(fs.readFileSync(path.join(root, 'data/metadata.json'), 'utf8'));
const designations = JSON.parse(fs.readFileSync(path.join(root, 'data/designations.json'), 'utf8'));
const {hasCoordinates, filterSchools, suggestSchools, toCsv} = require('../core.js');
const state = {query:'', region:'', level:'', verification:''};
assert.equal(schools.length, meta.total);
assert.equal(designations.length, schools.length);
assert.equal(new Set(schools.map(s => s.id)).size, schools.length, 'duplicate school IDs');
assert.equal(schools.filter(hasCoordinates).length, meta.mapped);
assert.equal(schools.filter(s => meta.sources[s.source].kind === 'official').length, meta.official);
for (const s of schools) {
  assert.ok(meta.sources[s.source], 'missing source');
  assert.ok(['초등학교','중학교','고등학교','유치원','특수학교'].includes(s.level), 'unknown level');
  assert.ok(s.name && s.region && s.id);
  if (s.lat !== null || s.lng !== null) {
    assert.ok(hasCoordinates(s), `invalid coordinates: ${s.name}`);
    assert.ok(s.address && s.locationDate && s.locationSource === 'locations');
  } else assert.ok(!s.address && s.id.startsWith('unlocated-'));
}
for (const [region, count] of Object.entries(meta.byRegion)) {
  assert.equal(filterSchools(schools, meta.sources, {...state,region}).length, count);
}
const official = filterSchools(schools, meta.sources, {...state,verification:'official'});
const reference = filterSchools(schools, meta.sources, {...state,verification:'reference'});
assert.equal(official.length, meta.official);
assert.equal(official.length + reference.length, schools.length);
const missing = filterSchools(schools, meta.sources, {...state,verification:'unlocated'});
assert.equal(missing.length, schools.length - meta.mapped);
assert.ok(missing.every(s => !hasCoordinates(s)));
const target = schools.find(s => s.name === '서울관악초등학교');
assert.ok(target, 'known official school missing');
const search = filterSchools(schools, meta.sources, {...state, query:'서울 관악초등학교',region:'서울',verification:'official'});
assert.deepEqual(search.map(s => s.id), [target.id], 'multi-token search/combined filters');
for (const query of ['관악초교','서울관악초','서울시 관악 초등','ㅅㅇㄱㅇㅊ','ㄱㅇ초','청룡4길 49']) {
  assert.ok(filterSchools(schools,meta.sources,{...state,query}).some(s=>s.id===target.id), `search missed ${query}`);
}
const ranked = filterSchools(schools,meta.sources,{...state,query:'관악'});
assert.ok(ranked.slice(0,2).some(s=>s.id===target.id), 'school name must rank before district-only matches');
assert.equal(filterSchools(schools,meta.sources,{...state,query:'관악초교',region:'부산'}).length,0,'search must preserve selected filters');
assert.ok(filterSchools(schools,meta.sources,{...state,query:'세종 조치원여중'}).some(s=>s.name==='세종중학교'),'documented former name alias');
assert.ok(filterSchools(schools,meta.sources,{...state,query:'부산반송중'}).some(s=>s.name==='반송중학교'),'region + school abbreviation');
assert.ok(!filterSchools(schools,meta.sources,{...state,query:'승지초등학교'}).some(s=>s.name==='숭지초등학교'),'uncertain identity must not become an alias');
assert.equal(filterSchools(schools,meta.sources,{...state,query:'관아초교'}).length,0,'typo suggestions must not silently alter results');
const similar = suggestSchools(schools,meta.sources,{...state,query:'관아초교'});
assert.ok(similar.approximate && similar.schools.some(s=>s.id===target.id),'single-typo school suggestion');
assert.equal(similar.schools[0].id,target.id,'closest Hangul spelling should lead typo suggestions');
assert.ok(suggestSchools(schools,meta.sources,{...state,query:'서울관악초'}).schools[0].id===target.id,'autocomplete should rank the named school first');
assert.equal(filterSchools(schools, meta.sources, {...state,query:'존재하지않는검색어_991023'}).length, 0);
assert.ok(filterSchools(schools, meta.sources, {...state,level:'기타'}).every(s => ['유치원','특수학교'].includes(s.level)));
const csv = toCsv([target, {...target,name:'=SUM(1,2)"'}], meta.sources);
assert.ok(csv.startsWith('\uFEFF"학교ID"'));
assert.equal(csv.split('\r\n').length, 3);
assert.ok(csv.includes('"\'=SUM(1,2)"""'), 'CSV formula guard or quote escaping missing');
for (const source of Object.values(meta.sources)) assert.equal(new URL(source.url).protocol, 'https:');
console.log(`PASS · ${schools.length} schools · ${meta.official} official · ${meta.mapped} mapped · filters/CSV/data integrity`);
console.log('PASS · abbreviations/region aliases/initials/ranking/former names/typo suggestions');

const zones = JSON.parse(fs.readFileSync(path.join(root, 'data/elementary-zones.geojson'), 'utf8'));
assert.equal(zones.type, 'FeatureCollection');
assert.equal(zones.features.length, meta.catchments.features);
assert.equal(new Set(zones.features.map(z => z.properties.id)).size, zones.features.length);
const schoolIndex = new Map(schools.map(s => [s.id, s]));
const linkedIds = new Set();
for (const zone of zones.features) {
  assert.ok(['Polygon','MultiPolygon'].includes(zone.geometry.type));
  assert.ok(zone.properties.schoolIds.length);
  for (const id of zone.properties.schoolIds) {
    linkedIds.add(id);
    assert.equal(schoolIndex.get(id)?.level, '초등학교');
  }
  const inspect = coordinates => {
    if (typeof coordinates[0] === 'number') {
      assert.ok(hasCoordinates({lng:coordinates[0],lat:coordinates[1]}), 'invalid zone coordinate');
    } else coordinates.forEach(inspect);
  };
  inspect(zone.geometry.coordinates);
}
assert.equal(linkedIds.size, meta.catchments.schools);
const excluded = JSON.parse(fs.readFileSync(path.join(root,'data/excluded.json'),'utf8'));
assert.equal(excluded.length, meta.excluded);
assert.ok(excluded.every(s => s.reason && new URL(s.verificationUrl).protocol === 'https:'));
assert.ok(!schools.some(s => s.name === '청솔중학교' || s.name === '군서중학교'));
console.log(`PASS · ${zones.features.length} catchments · ${linkedIds.size} linked elementary schools · ${excluded.length} exclusions`);
