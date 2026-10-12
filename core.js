(function (root) {
  'use strict';
  const hasCoordinates = s => Number.isFinite(s.lat) && Number.isFinite(s.lng) && s.lat >= 32 && s.lat <= 39.5 && s.lng >= 124 && s.lng <= 132;
  const normalized = s => String(s || '').normalize('NFC').toLowerCase().replace(/\s+/g, '');
  function filterSchools(schools, sources, state) {
    const tokens = state.query.trim().split(/\s+/).map(normalized).filter(Boolean);
    return schools.filter(s => {
      if (state.region && s.region !== state.region) return false;
      if (state.level === '기타' ? ['초등학교', '중학교', '고등학교'].includes(s.level) : state.level && s.level !== state.level) return false;
      const kind = sources[s.source]?.kind;
      if (state.verification === 'unlocated' ? hasCoordinates(s) : state.verification && state.verification !== kind) return false;
      const haystack = normalized([s.name, s.region, s.district, s.address, s.program].join(' '));
      return tokens.every(t => haystack.includes(t));
    });
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
  const api = { hasCoordinates, filterSchools, toCsv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SchoolCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
