(function (root) {
  'use strict';
  const hasCoordinates = s => Number.isFinite(s.lat) && Number.isFinite(s.lng) && s.lat >= 32 && s.lat <= 39.5 && s.lng >= 124 && s.lng <= 132;
  const initials = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  const regionAliases = [
    [/서울특별시|서울시/g,'서울'], [/부산광역시|부산시/g,'부산'],
    [/대구광역시|대구시/g,'대구'], [/인천광역시|인천시/g,'인천'],
    [/광주광역시|광주시|광주권/g,'광주'], [/대전광역시|대전시/g,'대전'],
    [/울산광역시|울산시/g,'울산'], [/세종특별자치시|세종시/g,'세종'],
    [/경기도/g,'경기'], [/강원특별자치도|강원도/g,'강원'],
    [/충청북도|충북도/g,'충북'], [/충청남도|충남도/g,'충남'],
    [/전북특별자치도|전라북도|전북도/g,'전북'], [/전라남도|전남도|전남권/g,'전남'],
    [/경상북도|경북도/g,'경북'], [/경상남도|경남도/g,'경남'],
    [/제주특별자치도|제주도/g,'제주']
  ];
  function normalized(value) {
    let text = String(value || '').normalize('NFC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
    for (const [pattern, replacement] of regionAliases) text = text.replace(pattern, replacement);
    return text.replace(/여중$/,'여자중학교').replace(/여고$/,'여자고등학교')
      .replace(/(?:초등|초교|초)$/,'초등학교').replace(/(?:중등|중)$/,'중학교')
      .replace(/(?:고등|고)$/,'고등학교');
  }
  const initialOf = char => {
    const code = char.charCodeAt(0) - 0xac00;
    return code >= 0 && code < 11172 ? initials[Math.floor(code / 588)] : char;
  };
  function contains(text, token) {
    if (text.includes(token)) return true;
    if (![...token].some(char => initials.includes(char))) return false;
    const needle = [...token], haystack = [...text];
    for (let start = 0; start <= haystack.length - needle.length; start++) {
      if (needle.every((char, offset) => char === haystack[start + offset] ||
        (initials.includes(char) && char === initialOf(haystack[start + offset])))) return true;
    }
    return false;
  }
  const index = new WeakMap();
  function entry(school) {
    if (index.has(school)) return index.get(school);
    const prefix = (school.region || '').replace(/권$/,'');
    const names = [school.name];
    if (prefix && !school.name.startsWith(prefix)) names.push(prefix + school.name);
    // Only a documented former name is an alias; uncertain names in notes are excluded.
    const former = school.identitySourceUrl && school.note?.match(/옛 ([가-힣]+학교)/);
    if (former) names.push(former[1]);
    for (const name of [...names]) {
      if (prefix && name.startsWith(prefix)) names.push(name.slice(prefix.length));
    }
    const item = {
      names: [...new Set(names.map(normalized))],
      fields: [...names, school.region, school.district, school.address, school.program, school.level].map(normalized)
    };
    index.set(school, item);
    return item;
  }
  function inScope(s, sources, state) {
    if (state.region && s.region !== state.region) return false;
    if (state.level === '기타' ? ['초등학교', '중학교', '고등학교'].includes(s.level) : state.level && s.level !== state.level) return false;
    const kind = sources[s.source]?.kind;
    return !(state.verification === 'unlocated' ? hasCoordinates(s) : state.verification && state.verification !== kind);
  }
  function searchScore(item, tokens, phrase) {
    if (item.names.includes(phrase)) return 1000;
    if (item.names.some(name => name.startsWith(phrase))) return 800;
    if (item.names.some(name => contains(name, phrase))) return 600;
    if (tokens.every(token => item.names.some(name => contains(name, token)))) return 400;
    return 100 + tokens.filter(token => item.names.some(name => contains(name, token))).length * 50;
  }
  function filterSchools(schools, sources, state) {
    const tokens = String(state.query || '').trim().split(/[\s,·/]+/).map(normalized).filter(Boolean);
    const matches = schools.filter(s => inScope(s, sources, state) &&
      tokens.every(token => entry(s).fields.some(field => contains(field, token))));
    if (!tokens.length) return matches;
    const phrase = normalized(state.query);
    return matches.map(s => ({s, score:searchScore(entry(s), tokens, phrase)}))
      .sort((a,b) => b.score - a.score || a.s.name.localeCompare(b.s.name, 'ko'))
      .map(item => item.s);
  }
  function oneEditApart(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) {i++; j++; continue;}
      if (++edits > 1) return false;
      if (a.length >= b.length) i++;
      if (b.length >= a.length) j++;
    }
    return edits + (i < a.length || j < b.length ? 1 : 0) === 1;
  }
  function suggestSchools(schools, sources, state, limit = 5) {
    const exact = filterSchools(schools, sources, state);
    if (exact.length) return {schools:exact.slice(0,limit), approximate:false};
    const query = normalized(state.query);
    if (query.length < 3 || [...query].some(char => initials.includes(char))) return {schools:[], approximate:false};
    const cost = name => {
      if (name.length !== query.length) return 9;
      const position = [...name].findIndex((char,i) => char !== query[i]);
      const a = name.charCodeAt(position) - 0xac00, b = query.charCodeAt(position) - 0xac00;
      if (a < 0 || a >= 11172 || b < 0 || b >= 11172) return 8;
      return (Math.floor(a/588)!==Math.floor(b/588)?3:0) +
        (Math.floor(a%588/28)!==Math.floor(b%588/28)?2:0) + (a%28!==b%28?1:0);
    };
    const similar = [];
    for (const school of schools) {
      if (!inScope(school, sources, state)) continue;
      const variants = entry(school).names.filter(name => oneEditApart(name, query));
      if (variants.length) similar.push({school,cost:Math.min(...variants.map(cost))});
    }
    similar.sort((a,b) => a.cost-b.cost || a.school.name.localeCompare(b.school.name,'ko'));
    return {schools:similar.slice(0,limit).map(item=>item.school), approximate:similar.length > 0};
  }
  function csvCell(value) {
    let text = String(value ?? '');
    if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function toCsv(schools, sources) {
    const header = ['학교ID','학교명','지역','시군구','학교급','사업명','주소','위도','경도','자료구분','지정자료기준일','지정자료출처','출처URL','위치기준일','비고'];
    const rows = schools.map(s => {const source = sources[s.source]; return [s.id,s.name,s.region,s.district,s.level,s.program,s.address,s.lat,s.lng,source.kind==='official'?'교육청 명단':'참고 목록',source.date,source.title,source.url,s.locationDate,s.note];});
    return '\uFEFF' + [header,...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  }
  const api = { hasCoordinates, filterSchools, suggestSchools, toCsv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SchoolCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
