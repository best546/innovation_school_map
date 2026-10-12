# 자료 출처와 수집 범위

수집일: 2026-10-13. 수록 데이터는 전국 전수 목록이 아니며 지정 명단과 위치 자료의 출처를 별도로 기록합니다.

## 출처

- **서울교육청 · 2026 혁신미래학교 운영 기본 계획 (참고 6)** — 기준 2026-03-01. [원문](https://www.sen.go.kr/user/bbs/BD_selectBbs.do?q_bbsSn=1155&q_bbsDocNo=20260209153427680)
- **교육청 · 2026 빛고을혁신학교 지정 현황** — 기준 2026. [원문](https://www.gen.go.kr/sub/page.php?page_code=doc_22_02)
- **경남교육청 · 2026 행복학교·행복나눔학교 현황** — 기준 2026. [원문](https://www.gne.go.kr/haengbok/happy/map.jsp)
- **교육청 · 전남혁신학교 현황** — 기준 2026-06-04. [원문](https://www.jne.go.kr/innosc/cm/cntnts/cntntsView.do?cntntsId=612&mi=1764)
- **제주교육청 · 제주형 자율학교 운영 현황 (다혼디배움학교만)** — 기준 2026-03-01. [원문](https://www.jje.go.kr/index.jje?menuCd=DOM_000000106002011001)
- **울산교육청 · 서로나눔학교 운영 현황** — 기준 2026. [원문](https://use.go.kr/nanum/nanumschool/operate.jsp)
- **나무위키 혁신학교/목록 (공개 미러 열람)** — 기준 기준일 미상 · 미러 문서 수정 2026-07-19. [원문](https://namu.wiki/w/혁신학교/목록) · [실제 열람한 미러](https://m.namu.moe/w/혁신학교/목록)
- **한국교육시설안전원 · 초중등학교위치** — 기준 2026-10-01. [원문](https://schoolzone.emac.kr/publicData/publicDataList.do) · [공공데이터포털](https://www.data.go.kr/data/15021148/standard.do)
- **한국교육시설안전원 · 초등학교 통학구역 및 학교-학구도 연계정보** — 기준 2026-09-20. [원문](https://schoolzone.emac.kr/publicData/publicDataList.do)

## 지역별 수록 범위

| 지역 | 수록 수 | 지정 자료 |
|---|---:|---|
| 서울 | 253 | 교육청 공식 2026 명단 |
| 부산 | 42 | 참고 목록 일부 · 현재 지정 미확인 |
| 대구 | — | 명단 미확보 |
| 인천 | 1 | 참고 목록 일부 · 현재 지정 미확인 |
| 광주권 | 67 | 교육청 공식 2026 명단 |
| 대전 | — | 명단 미확보 |
| 울산 | 19 | 교육청 공식 2026 명단 |
| 세종 | 3 | 참고 목록 일부 · 현재 지정 미확인 |
| 경기 | 471 | 참고 목록 일부 · 현재 지정 미확인 |
| 강원 | — | 명단 미확보 |
| 충북 | — | 명단 미확보 |
| 충남 | 5 | 참고 목록 일부 · 현재 지정 미확인 |
| 전북 | 2 | 참고 목록 일부 · 현재 지정 미확인 |
| 전남권 | 17 | 교육청 공식 2026 명단 |
| 경북 | — | 명단 미확보 |
| 경남 | 172 | 교육청 공식 2026 명단 |
| 제주 | 28 | 교육청 공식 2026 명단 |

광주권·전남권은 자료 비교를 위해 종전 지역 범위로 구분했습니다. 위치 원자료는 2026년 10월 1일 기준이며 당시 원자료의 학교명·주소를 사용했습니다. 경남 행복학교와 행복나눔학교만 포함하고 행복맞이학교·연구회는 제외했습니다. 제주 다혼디배움학교만 포함하고 다른 자율학교 사업은 합치지 않았습니다. 울산은 공식 표에서 지정 종료로 표시한 학교를 제외했습니다.

## 통학구역 가공

[학구도 공공데이터 목록](https://schoolzone.emac.kr/publicData/publicDataList.do)의 2026.09.20 초등학교 통학구역 Shapefile과 같은 날짜 학교-학구도 연계 CSV를 사용했습니다. 학교 ID로 수록 초등학교에 연결한 918개 구역(601개 학교)을 추렸습니다. 원본 좌표계는 Korea 2000 Central Belt 2010(EPSG:5186)이며 EPSG:4326 경위도로 변환했습니다. 위상 보존 방식으로 3m 허용 오차를 적용해 표시용 경계를 단순화했습니다. 경계에 걸친 동·필지의 배정은 이 간략 지도에서 판정하지 않습니다.

`build_zones.py`를 실행하려면 Python의 pyshp, pyproj, shapely가 필요합니다. 웹사이트 실행에는 필요하지 않습니다.

```sh
python3 -m pip install pyshp pyproj shapely
python3 scripts/build_zones.py --shapefile /path/to/초등학교통학구역.shp --links /path/to/학교학구도연계정보.csv
node scripts/validate.cjs
```

## 데이터 이용 조건

- 나무위키 참고 목록과 이에 기초한 가공 데이터: [CC BY-NC-SA 2.0 KR](https://creativecommons.org/licenses/by-nc-sa/2.0/kr/). 출처 표시, 비영리, 동일조건 변경허락. 나무위키 기여자에게 출처를 귀속합니다. 학교 ID·주소·좌표 연결, 공식 명단 우선 대체, 중복 제거, 일부 교명 정정, 폐교·개편 자료 제외를 수행했습니다. 혼합 데이터 재배포 시 원자료별 조건을 함께 보존하세요.
- 교육청 지정 자료, 학교알리미·교육청의 교명/폐교 확인 근거: 각 원문의 공공저작물 이용 표시를 따릅니다. 출처와 확인 근거를 보존했습니다.
- 한국교육시설안전원 위치·통학구역 공개 자료: 다운로드 원문과 공공데이터포털의 이용허락 조건을 확인하고 출처를 보존하세요. 원자료 전체의 별도 라이선스를 임의로 부여하지 않았습니다.
- OpenStreetMap 지도 데이터: [ODbL 및 출처 표시](https://www.openstreetmap.org/copyright). 타일 사용은 [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)도 따릅니다.
- Leaflet 1.9.4: BSD-2-Clause, `vendor/leaflet/LICENSE` 동봉.
- Leaflet.markercluster 1.5.3: MIT, `vendor/markercluster/LICENSE` 동봉.
