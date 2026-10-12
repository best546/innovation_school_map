/* All school data is bundled. No API credentials, geocoding, or server are used at runtime. */
(async function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const {hasCoordinates, filterSchools, toCsv} = window.SchoolCore;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = value => {try {const u=new URL(value);return u.protocol==='https:'?u.href:'#';} catch {return '#';}};
  const colors = {'초등학교':'#258c70','중학교':'#477ec0','고등학교':'#d19b3a','유치원':'#916dad','특수학교':'#916dad'};
  const classes = {'초등학교':'elementary','중학교':'middle','고등학교':'high','유치원':'other','특수학교':'other'};
  const regions = ['서울','부산','대구','인천','광주권','대전','울산','세종','경기','강원','충북','충남','전북','전남권','경북','경남','제주'];
  const state = {query:'',region:'',level:'',verification:''};
  let schools=[],metadata={},filtered=[],map,cluster,selected='',visibleCount=60,markers=new Map(),geoMarker,zoneLayer,zonesPromise;
  let toastTimer;
  const toast = message => { $('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').hidden=true;},4500); };
  const isOfficial = s => metadata.sources[s.source].kind==='official';
  const nationalView = () => map && map.fitBounds([[32.9,125.0],[38.6,130.2]],{padding:[25,40],animate:false});
  function setView(view) {
    document.body.classList.toggle('list-view',view==='list');
    for(const v of ['map','list']) { $('show-'+v).classList.toggle('active',view===v);$('show-'+v).setAttribute('aria-pressed',String(view===v)); }
    if(view==='map' && map) requestAnimationFrame(()=>map.invalidateSize());
  }
  function setHash() {
    const p=new URLSearchParams();
    if(state.query)p.set('q',state.query);if(state.region)p.set('region',state.region);if(state.level)p.set('level',state.level);if(state.verification)p.set('source',state.verification);if(selected)p.set('school',selected);
    history.replaceState(null,'',location.pathname+location.search+(p.size?'#'+p.toString():''));
  }
  function fitResults() {
    if(!map)return;
    const points=filtered.filter(hasCoordinates).map(s=>[s.lat,s.lng]);
    if(points.length)map.fitBounds(points,{padding:[48,68],maxZoom:14,animate:false});
    else {nationalView();toast('이 조건에서 위치가 확인된 학교가 없습니다. 목록과 출처를 확인해 주세요.');}
  }
  function card(s) {
    return `<button class="school-card${selected===s.id?' selected':''}" data-school="${escape(s.id)}" aria-label="${escape(s.name)} 상세 보기"><span class="school-icon" aria-hidden="true">▤</span><span class="school-info"><strong class="school-name">${escape(s.name)}</strong><span class="school-tags"><span><i class="dot ${classes[s.level]||'other'}"></i>${escape(s.level)}</span><span>${escape(s.region)} · ${escape(s.district)}</span><span class="${isOfficial(s)?'official-badge':'reference-badge'}">${isOfficial(s)?'교육청 명단':'참고 목록'}</span>${!hasCoordinates(s)?'<span class="location-badge">위치 미확인</span>':''}</span><span class="school-address">${escape(s.address||s.program+' · 공식 위치자료 대조 필요')}</span></span><span class="card-arrow" aria-hidden="true">↗</span></button>`;
  }
  function renderList() {
    $('school-list').innerHTML=filtered.length?filtered.slice(0,visibleCount).map(card).join('')+(visibleCount<filtered.length?`<button class="more" id="load-more">학교 더 보기 (${Math.min(60,filtered.length-visibleCount)}개)</button>`:''):`<div class="empty"><strong>${state.region&&!metadata.byRegion[state.region]?'이 지역의 명단은 확보하지 못했습니다.':'검색 결과가 없습니다.'}</strong>${state.region&&!metadata.byRegion[state.region]?'학교가 없다는 뜻은 아닙니다. 자료 출처에서 수집 범위를 확인할 수 있습니다.':'검색어 또는 필터를 바꾸어 보세요.'}</div>`;
  }
  function renderMarkers() {
    if(!map)return;
    cluster.clearLayers();markers.clear();
    const items=[];
    for(const s of filtered.filter(hasCoordinates)) {
      const icon=L.divIcon({className:'map-marker',html:`<span class="pin${isOfficial(s)?'':' reference'}" style="--pin:${colors[s.level]||'#916dad'}"></span>`,iconSize:[22,26],iconAnchor:[11,23]});
      const marker=L.marker([s.lat,s.lng],{icon,title:s.name,alt:s.name});
      marker.on('click',()=>showDetail(s.id,false));
      items.push(marker);markers.set(s.id,marker);
    }
    cluster.addLayers(items);
  }
  function update(fit=false) {
    filtered=filterSchools(schools,metadata.sources,state);visibleCount=60;
    if(selected&&!filtered.some(s=>s.id===selected)){clearCatchment();selected='';$('detail').hidden=true;}
    const mapped=filtered.filter(hasCoordinates).length;
    $('result-count').textContent=filtered.length.toLocaleString('ko-KR');
    $('mobile-count').textContent=filtered.length.toLocaleString('ko-KR');
    $('result-summary').textContent=`지도 표시 ${mapped.toLocaleString('ko-KR')}개 · 위치 미확인 ${filtered.length-mapped}개`;
    $('map-count').textContent=`${state.region||'전국'} · ${mapped.toLocaleString('ko-KR')}개 학교 표시`;
    renderList();$('school-list').scrollTop=0;renderMarkers();setHash();if(fit)fitResults();
  }
  function clearCatchment() {
    if(zoneLayer && map)map.removeLayer(zoneLayer);zoneLayer=null;
  }
  async function toggleCatchment(id) {
    const button=$('catchment-toggle');
    if(zoneLayer){clearCatchment();if(button){button.textContent='초등학교 통학구역 표시';button.setAttribute('aria-pressed','false');}if($('catchment-status'))$('catchment-status').textContent='';return;}
    if(!map)return;
    if(button)button.disabled=true;
    try {
      if(!zonesPromise)zonesPromise=fetch('./data/elementary-zones.geojson').then(r=>{if(!r.ok)throw Error('통학구역 자료를 불러오지 못했습니다.');return r.json();}).catch(e=>{zonesPromise=null;throw e;});
      const data=await zonesPromise;
      if(selected!==id)return;
      const features=data.features.filter(f=>f.properties.schoolIds.includes(id));
      if(!features.length){$('catchment-status').textContent='이 학교와 연결된 통학구역은 확보하지 못했습니다. 아래 공식 주소 조회를 이용해 주세요.';return;}
      zoneLayer=L.geoJSON({type:'FeatureCollection',features},{style:()=>({color:'#ac573b',weight:2,fillColor:'#d99867',fillOpacity:.14,dashArray:'5 4'}),onEachFeature:(feature,layer)=>layer.bindTooltip(escape(feature.properties.name))}).addTo(map);
      map.fitBounds(zoneLayer.getBounds(),{padding:[45,45],maxZoom:16,animate:false});
      button.textContent='통학구역 숨기기';button.setAttribute('aria-pressed','true');if(matchMedia('(max-width:800px)').matches){document.body.classList.add('detail-collapsed');$('collapse-detail').textContent='상세 펼치기';$('collapse-detail').setAttribute('aria-expanded','false');}
      $('catchment-status').textContent=`연결된 구역 ${features.length}개 · 기준 ${metadata.catchments.date}. 공동통학구역도 포함하며, 경계는 표시용으로 단순화했습니다. 아파트 배정은 아래 공식 주소 조회에서 확인해 주세요.`;
    } catch(e) {toast(e.message);}
    finally {if(button)button.disabled=false;}
  }
  function showDetail(id,move=true) {
    const s=schools.find(s=>s.id===id);if(!s)return;
    clearCatchment();document.body.classList.remove('detail-collapsed');selected=id;setView('map');const source=metadata.sources[s.source];
    $('detail').innerHTML=`<div class="detail-top"><span>${escape(s.region)} · ${escape(s.level)}</span><span class="detail-top-actions"><button id="collapse-detail" aria-expanded="true">상세 접기</button><button class="close-detail" aria-label="학교 상세 닫기">×</button></span></div><h2>${escape(s.name)}</h2><span class="${isOfficial(s)?'official-badge':'reference-badge'}">${isOfficial(s)?'교육청 공식 명단 수록':'참고 목록 · 현재 지정 여부 미확인'}</span><p>${escape(s.address||'공식 위치자료에서 좌표를 확인하지 못했습니다.')}</p><dl><dt>사업명</dt><dd>${escape(s.program)}</dd><dt>지정 자료</dt><dd><a href="${safeUrl(source.url)}" target="_blank" rel="noopener">${escape(source.title)} ↗</a></dd><dt>자료 기준</dt><dd>${escape(source.date)}</dd><dt>위치 자료</dt><dd>${hasCoordinates(s)?`한국교육시설안전원 · ${escape(s.locationDate)}<br>${escape(s.locationMatch)}`:'위치 미확인 · 지도에 표시하지 않음'}</dd>${s.note?`<dt>참고</dt><dd>${escape(s.note)}${s.identitySourceUrl?`<br><a href="${safeUrl(s.identitySourceUrl)}" target="_blank" rel="noopener">교명 대조 근거 ↗</a>`:''}</dd>`:''}</dl>${!isOfficial(s)?'<p class="detail-notice">나무위키 참고 목록입니다. 현재 혁신학교 지정 여부는 해당 교육청에 확인해 주세요. 공식 좌표 연결은 지정 여부 확인을 의미하지 않습니다.</p>':''}${s.level==='초등학교'?'<button id="catchment-toggle" class="catchment-button" aria-pressed="false">초등학교 통학구역 표시</button><p id="catchment-status" class="catchment-status" role="status"></p>':''}${['초등학교','중학교','고등학교'].includes(s.level)?'<a class="assignment-link" href="https://schoolzone.emac.kr/gis/gis.do" target="_blank" rel="noopener">아파트 주소로 배정학교 확인 ↗</a>':''}<div class="detail-links"><a href="https://map.naver.com/p/search/${encodeURIComponent((s.address||s.region)+' '+s.name)}" target="_blank" rel="noopener">네이버 지도 ↗</a><a href="${safeUrl(source.url)}" target="_blank" rel="noopener">자료 원문 ↗</a></div>`;
    $('detail').hidden=false;renderList();setHash();
    const marker=markers.get(id);
    if(move && marker) cluster.zoomToShowLayer(marker,()=>map.panTo(marker.getLatLng(),{animate:!matchMedia('(prefers-reduced-motion: reduce)').matches}));
    if(!hasCoordinates(s))toast('이 학교는 좌표가 확인되지 않아 지도 표시를 생략했습니다.');
  }
  function renderSources() {
    const counts={};for(const s of schools)counts[s.source]=(counts[s.source]||0)+1;
    const status = r => ['서울','광주권','전남권','경남','제주','울산'].includes(r)?'2026 교육청 공식 명단':metadata.byRegion[r]?'참고 목록 일부 · 최신 지정 미확인':'명단 미확보';
    $('sources-content').innerHTML=`<p>교육청이 공개한 지정 명단을 우선 사용하고, 확보하지 못한 지역은 사용자가 제시한 나무위키 목록을 참고했습니다. 같은 학교의 지정 명단과 주소·좌표 자료는 서로 다른 출처입니다.</p><h3>지역별 수집 범위</h3><p>현재 수록 ${schools.length.toLocaleString('ko-KR')}개는 <b>전국 전체 학교 수가 아닙니다.</b> 명단이 없는 지역을 0개로 해석하지 마세요. 광주권·전남권은 자료 비교를 위해 종전 지역 범위로 나누었습니다.</p><table class="coverage-table"><thead><tr><th scope="col">지역</th><th scope="col">수록 학교</th><th scope="col">자료 상태</th></tr></thead><tbody>${regions.map(r=>`<tr><td>${escape(r)}</td><td>${metadata.byRegion[r]?(metadata.byRegion[r]+'개'):'—'}</td><td>${status(r)}</td></tr>`).join('')}</tbody></table><h3>지정 명단의 출처</h3>${Object.entries(metadata.sources).filter(([,source])=>['official','reference'].includes(source.kind)).map(([id,s])=>`<div class="source-item"><span class="source-tag">${s.kind==='official'?'교육청':'참고 목록'}</span><a href="${safeUrl(s.url)}" target="_blank" rel="noopener">${escape(s.title)} ↗</a><small>기준 ${escape(s.date)} · ${counts[id]||0}개 수록${s.mirror?` · <a href="${safeUrl(s.mirror)}" target="_blank" rel="noopener">열람한 공개 미러</a>`:''}</small></div>`).join('')}<h3>학교 위치와 지도</h3><div class="source-item"><a href="${safeUrl(metadata.sources.locations.portal)}" target="_blank" rel="noopener">한국교육시설안전원 · 전국초중등학교위치표준데이터 ↗</a><small>위치 기준 ${escape(metadata.locationDate)} · 학교명과 지역을 대조해 연결</small></div><p>유치원·특수학교 등 위치 자료에 없는 학교와 이름이 일치하지 않는 학교는 목록에만 표시합니다. 도심이나 시·군청 좌표를 대신 사용하지 않습니다. 경남 행복맞이학교·연구회, 제주 IB학교 등 다른 사업은 합치지 않았습니다. 울산은 지정 종료 표기가 있는 학교를 제외했습니다.</p><p>지도는 <a href="https://leafletjs.com/" target="_blank" rel="noopener">Leaflet</a>과 <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>을 사용합니다. 배경 지도는 인터넷 연결이 필요합니다. <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener">배경 지도 오류 제보 ↗</a></p><h3>아파트 주소와 학교 배정</h3><p>초등학교 상세에서 해당 학교에 연결된 통학구역을 표시할 수 있습니다. 2026.09.20 한국교육시설안전원 통학구역과 학교-학구도 연계정보를 사용하고, 경계는 표시용으로 3m 이내에서 단순화했습니다. 공동통학구역은 복수 학교에 연결될 수 있습니다. 현재 배정 아파트 목록은 수록하지 않았습니다. <a href="https://schoolzone.emac.kr/gis/gis.do" target="_blank" rel="noopener">공식 학구도 서비스에서 아파트 주소별 조회 ↗</a> · <a href="https://schoolzone.emac.kr/guide/faq.do" target="_blank" rel="noopener">배정 방식 설명</a></p><p>중학교 학교군은 여러 학교를 묶어 추첨 배정할 수 있어 한 아파트와 한 학교를 일대일로 표시할 수 없습니다. 세부 배정은 해당 연도 교육청 고시를 확인해야 합니다.</p><h3>목록 정리</h3><p>폐교·개편 확인과 옛 지정 이력을 신설 학교에 연결하지 않기 위해 참고 목록 ${metadata.excluded}개를 제외했습니다. <a href="./data/excluded.json" target="_blank">제외 내역과 확인 근거 ↗</a></p><h3>업데이트와 이용 조건</h3><p>수집일은 ${escape(metadata.collectedAt)}이며 실시간으로 갱신되지 않습니다. 최신 지정 여부는 학교별 원문을 확인해 주세요. 나무위키 기반 데이터는 <a href="https://creativecommons.org/licenses/by-nc-sa/2.0/kr/" target="_blank" rel="noopener">CC BY-NC-SA 2.0 KR</a> 조건(출처 표시·비영리·동일조건 변경허락)을 따릅니다. 교육청 자료의 이용 조건은 각 원문을 확인해 주세요.</p><p><a href="./data/metadata.json" target="_blank">출처 메타데이터 JSON ↗</a> · <a href="./data/schools.json" target="_blank">학교 데이터 JSON ↗</a></p>`;
  }
  $('filters').addEventListener('submit',e=>e.preventDefault());
  let searchTimer;
  $('search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{state.query=$('search').value;update(true);},180);});
  for(const id of ['region','verification'])$(id).addEventListener('change',()=>{state[id]=$(id).value;update(true);});
  $('levels').addEventListener('click',e=>{const b=e.target.closest('[data-level]');if(!b)return;state.level=b.dataset.level;for(const btn of $('levels').querySelectorAll('button')){const active=btn===b;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));}update(true);});
  $('school-list').addEventListener('click',e=>{const b=e.target.closest('[data-school]');if(b)showDetail(b.dataset.school);else if(e.target.closest('#load-more')){visibleCount+=60;renderList();}});
  $('detail').addEventListener('click',e=>{if(e.target.closest('#collapse-detail')){const collapsed=document.body.classList.toggle('detail-collapsed');$('collapse-detail').textContent=collapsed?'상세 펼치기':'상세 접기';$('collapse-detail').setAttribute('aria-expanded',String(!collapsed));}if(e.target.closest('#catchment-toggle'))toggleCatchment(selected);if(e.target.closest('.close-detail')){clearCatchment();$('detail').hidden=true;selected='';renderList();setHash();}});
  $('reset').addEventListener('click',()=>{clearTimeout(searchTimer);Object.assign(state,{query:'',region:'',level:'',verification:''});$('filters').reset();for(const b of $('levels').querySelectorAll('button')){const active=b.dataset.level==='';b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}clearCatchment();selected='';$('detail').hidden=true;update();nationalView();});
  $('fit').addEventListener('click',fitResults);
  $('locate').addEventListener('click',()=>{
    if(!navigator.geolocation){toast('이 브라우저에서는 내 위치를 사용할 수 없습니다.');return;}
    if(!map)return;toast('위치를 확인하고 있습니다.');
    navigator.geolocation.getCurrentPosition(p=>{const ll=[p.coords.latitude,p.coords.longitude];if(geoMarker)map.removeLayer(geoMarker);geoMarker=L.circleMarker(ll,{radius:7,color:'#fff',weight:3,fillColor:'#336eca',fillOpacity:1}).addTo(map).bindTooltip('내 위치');map.setView(ll,12);toast('현재 위치로 이동했습니다.');},()=>toast('위치를 확인하지 못했습니다. 브라우저의 위치 권한을 확인해 주세요.'),{timeout:12000,maximumAge:60000});
  });
  $('download').addEventListener('click',()=>{const blob=new Blob([toCsv(filtered,metadata.sources)],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='혁신학교_'+(state.region||'전국')+'_'+metadata.collectedAt+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(`현재 검색 결과 ${filtered.length.toLocaleString('ko-KR')}개를 내려받았습니다.`);});
  for(const id of ['sources-button','coverage-button'])$(id).addEventListener('click',()=>{$('sources-dialog').showModal();});
  for(const id of ['close-sources','close-sources-bottom'])$(id).addEventListener('click',()=>{$('sources-dialog').close();});
  $('sources-dialog').addEventListener('click',e=>{if(e.target===$('sources-dialog')){const r=$('sources-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('sources-dialog').close();}});
  $('show-map').addEventListener('click',()=>setView('map'));$('show-list').addEventListener('click',()=>setView('list'));
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!$('sources-dialog').open){e.preventDefault();$('search').focus();}if(e.key==='Escape'&&!$('sources-dialog').open){clearCatchment();$('detail').hidden=true;selected='';setHash();}});
  $('download').disabled=true;
  try {
    const responses=await Promise.all([fetch('./data/schools.json'),fetch('./data/metadata.json')]);
    if(responses.some(r=>!r.ok))throw Error('학교 데이터를 불러오지 못했습니다.');
    [schools,metadata]=await Promise.all(responses.map(r=>r.json()));
    $('collected-date').textContent=metadata.collectedAt.replaceAll('-','.');$('total').textContent=schools.length.toLocaleString('ko-KR');$('official-total').textContent=schools.filter(isOfficial).length.toLocaleString('ko-KR');$('region-total').textContent=Object.keys(metadata.byRegion).length;
    for(const region of regions){const o=document.createElement('option');o.value=region;o.textContent=region+(metadata.byRegion[region]?` (${metadata.byRegion[region]})`:' (명단 미확보)');$('region').appendChild(o);}
    const hash=new URLSearchParams(location.hash.slice(1));state.query=hash.get('q')||'';state.region=regions.includes(hash.get('region'))?hash.get('region'):'';state.level=['초등학교','중학교','고등학교','기타'].includes(hash.get('level'))?hash.get('level'):'';state.verification=['official','reference','unlocated'].includes(hash.get('source'))?hash.get('source'):'';
    $('search').value=state.query;$('region').value=state.region;$('verification').value=state.verification;
    for(const b of $('levels').querySelectorAll('button')){const active=b.dataset.level===state.level;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
    renderSources();
    if(window.L && L.markerClusterGroup){
      map=L.map('map',{zoomControl:true,minZoom:5,maxZoom:19,scrollWheelZoom:true});
      const config=window.MAP_CONFIG;
      const tiles=L.tileLayer(config.tileUrl,{attribution:config.attribution,maxZoom:config.maxZoom,keepBuffer:1}).addTo(map);
      let failures=0;tiles.on('tileerror',()=>{if(++failures>=3){$('map-warning').textContent='배경 지도를 불러오지 못했습니다. 학교 목록·검색·출처는 계속 사용할 수 있습니다.';$('map-warning').hidden=false;}});tiles.on('tileload',()=>{if(failures<3)$('map-warning').hidden=true;});
      cluster=L.markerClusterGroup({maxClusterRadius:46,showCoverageOnHover:false,spiderfyOnMaxZoom:true,animate:!matchMedia('(prefers-reduced-motion: reduce)').matches,iconCreateFunction:c=>{const n=c.getChildCount();return L.divIcon({className:'cluster-wrap',html:`<span class="cluster${n>=100?' large':''}">${n}</span>`,iconSize:[n>=100?42:34,n>=100?42:34]});}}).addTo(map);
      nationalView();
      new ResizeObserver(()=>map.invalidateSize()).observe($('map-panel'));
    } else {$('map-warning').hidden=false;$('map-warning').textContent='지도 라이브러리를 불러오지 못했습니다. 목록 보기를 이용해 주세요.';}
    update(Boolean(state.query||state.region||state.level||state.verification));$('download').disabled=false;
    const initial=hash.get('school');if(initial&&filtered.some(s=>s.id===initial))showDetail(initial);
  } catch(e) {
    $('result-summary').textContent='학교 데이터를 불러오지 못했습니다.';
    $('school-list').innerHTML='<div class="empty"><strong>자료를 불러오지 못했습니다.</strong>페이지를 새로고침해 주세요. 로컬 파일을 직접 연 경우 README의 미리보기 방법을 이용해 주세요.</div>';
    $('map-warning').textContent=e.message;$('map-warning').hidden=false;setView('list');
  }
})();
