# 전국 혁신학교 현황

교육청 지정 명단과 참고 목록에 수록된 학교를 지도에서 조회하는 정적 웹사이트입니다. 학교 이름·지역·주소 검색, 학교급과 자료 출처 필터, 학교 상세 정보, CSV 내려받기를 제공합니다. 모바일에서는 지도와 목록을 전환합니다.

**전국 전수 목록이 아닙니다.** 2026년 10월 13일 수집 기준 12개 지역 1,080개를 수록했습니다. 556개는 교육청 공식 지정 명단이며 나머지는 현재 지정 여부를 확인하지 못한 참고 목록입니다. 공식 주소·좌표와 연결한 1,035개만 지도에 표시합니다. 공식 좌표가 있다고 현재 혁신학교 지정이 확인된 것은 아닙니다.

- 유치원·특수학교 44개와 교명을 대조하지 못한 일반 학교 1개는 위치 미확인입니다. 유치원·특수학교의 추가 위치 조사는 요청 범위에서 제외했습니다.
- 폐교·개편 등으로 옛 지정 명단을 현재 학교에 그대로 연결할 수 없는 6개는 제외하고, [제외 사유와 확인 근거](data/excluded.json)를 남겼습니다.
- 참고 목록의 ‘부산반송중학교’는 공식 교명 ‘반송중학교’로, 옛 ‘조치원여자중학교’는 ‘세종중학교’로 연결했습니다. 교명 확인과 현재 혁신학교 지정 여부 확인은 서로 다릅니다.
- ‘숭지초등학교’는 공식 위치 명단에서 확인하지 못했습니다. 시흥 ‘승지초등학교’의 오기일 가능성이 있지만 동일 학교로 단정해 좌표를 부여하지 않았습니다.
- 지정 기준일은 출처별로 다르며 실시간 갱신하지 않습니다. 미확보 지역을 혁신학교가 없는 지역으로 해석하면 안 됩니다.

## 지도와 아파트 배정

무료 공개 지도인 [OpenStreetMap](https://www.openstreetmap.org/copyright)과 Leaflet을 사용합니다. API 키와 실행 서버, 별도 빌드 과정은 필요 없습니다. 지도 라이브러리는 동봉했으며 배경 타일은 인터넷으로 불러옵니다.

초등학교 상세의 **‘초등학교 통학구역 표시’** 버튼은 해당 학교와 연결된 공식 구역을 표시합니다. 2026년 9월 20일 기준 918개 구역, 601개 학교의 연계 정보를 수록했습니다. 3m 허용 오차로 단순화한 표시용 경계이며 개별 아파트의 배정을 판정하는 데 사용하지 않습니다. 공동통학구역은 복수 학교와 연결됩니다.

**배정 아파트 자동 목록은 아직 수록하지 않았습니다.** 학교 상세의 **‘아파트 주소로 배정학교 확인’**은 한국교육시설안전원의 [공식 학구도 지도](https://schoolzone.emac.kr/gis/gis.do)로 연결됩니다. 아파트의 정확한 주소를 입력해 확인할 수 있습니다. 중학교 학교군은 여러 학교를 묶어 추첨 배정할 수 있으며 학교별·지역별 예외가 있습니다. 실제 배정은 해당 연도 교육청 고시를 확인해야 합니다. [공식 배정 방식 설명](https://schoolzone.emac.kr/guide/faq.do)

OpenStreetMap 공용 타일은 유료 API 계약 없이 사용할 수 있지만 무제한 트래픽 보장 서비스는 아닙니다. [타일 이용 정책](https://operations.osmfoundation.org/policies/tiles/)에 따라 출처를 유지하고 대량 다운로드·미리 받기를 하지 않습니다. 이용 규모가 커지면 `config.js`의 타일 URL과 저작권 표기를 다른 서비스로 함께 변경하세요.

## GitHub Pages

저장소: [best546/innovation_school_map](https://github.com/best546/innovation_school_map)

1. 이 폴더의 **내용 전체**를 저장소의 `main` 브랜치 루트에 넣습니다. 저장소 루트에 `index.html`과 `data/`가 함께 있어야 합니다.
2. GitHub 저장소에서 **Settings → Pages → Build and deployment**를 엽니다.
3. **Source: Deploy from a branch**, **Branch: main**, **Folder: /(root)**를 선택해 저장합니다.
4. 배포가 완료되면 `https://best546.github.io/innovation_school_map/`에서 엽니다.

모든 파일 경로를 상대 경로로 작성해 저장소 이름이 붙는 프로젝트 Pages에서도 동작합니다. `.nojekyll` 파일을 포함했습니다. [GitHub 공식 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 접속 통계

접속 통계는 `index.html`의 Google Analytics 태그로 수집합니다. 측정 ID는 `G-11XE7ZHEBP`입니다. 태그 스크립트는 Google에서 비동기로 불러옵니다. 분석 계정을 바꾸려면 태그 URL과 `gtag('config', ...)`의 ID를 함께 수정하세요.

## 로컬 미리보기

폴더 안에서 다음 명령을 실행하고 `http://localhost:8765/`를 엽니다.

```sh
python3 -m http.server 8765
```

종료는 `Ctrl+C`입니다. `index.html`을 파일로 직접 열면 브라우저의 보안 제한 때문에 JSON을 불러오지 못할 수 있습니다.

## 데이터 수정과 검증

- `data/designations.json`: 확인한 지정 명단. `source`는 출처 메타데이터의 키입니다.
- `data/metadata.json`: 출처 URL, 기준일, 수집 범위 및 통계.
- `data/locations.csv`: 공식 전국 위치 자료 중 일치한 학교의 부분집합.
- `data/schools.json`: 웹사이트가 실제 사용하는 통합 결과.
- `data/elementary-zones.geojson`: 수록 초등학교에 연결된 표시용 통학구역.
- `data/excluded.json`: 참고 명단에서 제외한 내역과 근거.

새 명단은 `designations.json`에 반영하고 지정 출처를 `metadata.json`에 등록합니다. 위치 재대조에는 공식 다운로드 페이지의 최신 전국 CSV를 사용하세요. 명단 확인일과 각 출처 기준일은 실제 확인한 날짜로 따로 기록해야 합니다.

```sh
# 동봉한 위치 부분집합으로 같은 학교 JSON 재생성 (Python 표준 라이브러리만 사용)
python3 scripts/build_data.py

# 최신 공식 위치 CSV를 사용하는 경우
python3 scripts/build_data.py --locations /path/to/official-locations.csv --collected-at YYYY-MM-DD

# 데이터의 중복·좌표·출처 및 검색·CSV 기능 검증
node scripts/validate.cjs
```

학교명과 지역을 대조하며 동명이교가 여러 개면 시·군·구로 한 번 더 좁힙니다. 그래도 한 학교로 확정되지 않으면 지도에 표시하지 않습니다. 시청·읍면 중심점 등을 대체 좌표로 사용하지 않습니다.

통학구역 재생성 절차와 출처는 [DATA_SOURCES.md](DATA_SOURCES.md)에 있습니다. 통학구역 데이터가 바뀌면 해당 학교와 연결한 학교-학구도 연계정보도 함께 갱신해야 합니다.

## 이용 조건

직접 작성한 웹 코드에는 [MIT License](LICENSE)를 적용했습니다. **데이터와 동봉한 라이브러리는 각각의 이용 조건을 따릅니다.** 나무위키 기반 참고 데이터는 **CC BY-NC-SA 2.0 KR**로, 출처 표시·비영리·동일조건 변경허락을 지켜야 합니다. 소스 코드가 MIT라고 해서 전체 데이터까지 상업적으로 자유 이용할 수 있는 것은 아닙니다. 자세한 출처와 조건은 [DATA_SOURCES.md](DATA_SOURCES.md)를 확인하세요.
