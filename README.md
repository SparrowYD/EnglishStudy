> 이 저장소에는 두 개의 프로젝트가 있습니다.
> **ShadowDict**(아래) — 안드로이드 영어 학습 앱 ·
> [**바둑 100**](baduk/README.md) — 100단계로 배우는 웹 바둑 학습 게임 (`cd baduk && npm start`)

# ShadowDict

시트콤/영상 대사를 하루 10문장씩 **4단계(듣기 → 뜻 → 받아쓰기 → 각인)** 로 학습해
완전히 체득하는 안드로이드 앱. 서버 없이 전부 온디바이스(Room + DataStore)로 동작합니다.

> 원본 사양서: `ShadowDict_프로젝트_사양서.md` 참고. 이 저장소는 그 사양의 구현입니다.

## 아키텍처

멀티모듈로 구성해 **핵심 로직을 Android SDK 없이도 단위 테스트로 검증**할 수 있게 했습니다.

| 모듈 | 성격 | 내용 |
|---|---|---|
| **`:core`** | 순수 Kotlin/JVM | 받아쓰기 채점 엔진(§6), 자막 파서(§10), 청크 분할(§4). **의존성은 JUnit뿐 → 헤드리스 CI에서도 테스트 가능** |
| **`:app`** | Android (Compose) | Room 데이터층, DataStore 설정, Media3 구간 반복, WorkManager 알림, ViewModel + Compose 화면 |

- Kotlin · Jetpack Compose (Material 3) · MVVM + Repository · 단일 Activity + Navigation Compose
- Room(스키마 export) · DataStore · Media3(ExoPlayer) · WorkManager · Coroutines/Flow
- DI는 프레임워크 없이 `AppContainer`로 수동 구성(단일 사용자 앱)

`settings.gradle.kts`는 **Android SDK가 없으면 `:app`을 자동으로 제외**하고 `:core`만 구성합니다.
덕분에 SDK가 없는 환경에서도 `./gradlew :core:test`로 채점 엔진을 검증할 수 있습니다.

## 빌드 / 테스트

```bash
# 핵심 로직 테스트 (Android SDK 불필요)
./gradlew :core:test

# 전체 앱 빌드 (Android SDK 필요 — Android Studio 또는 ANDROID_HOME 설정)
./gradlew :app:assembleDebug
```

앱을 빌드하려면 `local.properties`에 `sdk.dir=...` 를 두거나 `ANDROID_HOME` 을 설정하세요.
그 순간부터 `:app` 모듈이 빌드에 포함됩니다.

## 받아쓰기 채점 엔진 (`:core`, 사양 §6)

받아쓰기의 핵심은 **단어 단위 색상 피드백**입니다. 통짜 문자열 비교(`==`)는 절대 쓰지 않고
Levenshtein DP로 정렬한 뒤 토큰마다 유형을 판정합니다.

- `CORRECT`(초록) / `TYPO`(주황) / `WRONG`(빨강) / `EXTRA`(회색, 취소선) / `MISSING`(파랑, `___`)
- 정규화: 소문자화, 스마트 아포스트로피 통일, 문장부호 제거, **축약형 확장**(`I'm`→`i am`)
- `I'm` ↔ `Im` ↔ `I am` 을 동일하게 처리, 대소문자/문장부호 차이는 통과를 막지 않음

사양 §6.5의 7개 수용 케이스를 포함해 **28개 유닛 테스트 전부 통과**합니다.

### 사양 의사코드 대비 의도적 보정 2가지

구현하면서 사양의 의사코드가 **자기 수용 케이스와 모순되는 두 지점**을 발견해, 테스트를
통과하도록 보정했습니다(코드 주석에도 명시):

1. **축약형은 답안·입력 양쪽에 확장 적용**하고 아포스트로피 없는 변형(`Im`,`dont`)도 인식.
   의사코드처럼 한쪽만 확장하면 토큰 수가 어긋나 케이스 1(`I'm fine.`/`Im fine` → 통과)이 깨집니다.
   단, 일반 단어와 충돌하는 변형(`its`,`were`,`ill`,`id`,`lets`)은 제외했습니다.
2. **오타(TYPO) 판정의 길이 조건을 `3·d ≤ maxLen` 으로 강화.**
   의사코드의 `d ≤ maxLen/2` 는 케이스 6(`their`/`they`, 거리 2, 짧은 단어)을 TYPO로 잘못 분류합니다.
   보정하면 `receive`/`recieve`(거리 2, 7글자)는 TYPO, `their`/`they`(거리 2, 5글자)는 WRONG이 됩니다.
3. 통과 판정에 `TYPO == 0` 조건을 추가(§6.4 "TYPO는 통과 불가"와 케이스 3에 맞춤).

## 마일스톤 진행 상황

| M | 범위 | 상태 |
|---|---|---|
| **M1** | Room 스키마 + SRT/VTT 파서 + 로컬 구간 반복 | ✅ 구현 (`:core` 파서 테스트 완료) |
| **M2** | 받아쓰기 채점 엔진 + 유닛 테스트 | ✅ **테스트 통과 검증 완료** |
| **M3** | 4단계 학습 루프 UI + 진행 상태 저장 | ✅ 구현 (`StudyScreen`/`StudyViewModel`) |
| **M4** | 힌트 사다리 + 청크 분할 | ✅ 구현 (`HintLadder`, `ChunkSplitter` + 테스트) |
| **M5** | 스트릭 + WorkManager 알림 + 홈 | ✅ 구현 (self-rescheduling workers) |
| **M6** | 유튜브 소스 | 🟡 videoId 추출·저장까지. 임베드 플레이어 위젯은 미연동 |
| **M7** | SRS 복습 큐 + 통계 | ✅ 구현 (SRS 스케줄러 + 잔디 캘린더/마스터 수) |
| **M8** | 위젯 + 백업/복원 | ⬜ 미착수 (Glance 의존성만 준비) |

## 남은 작업 (다음 단계)

- **YouTube 임베드 플레이어 연동** — `androidyoutubeplayer` 뷰를 `StudyScreen`에 붙이고
  구간 반복(seek 정밀도 ±0.5s 감안). 현재 YouTube 소스는 TTS 폴백으로만 재생됩니다.
- **통계 꺾은선** — 첫 시도 정확도 추이 그래프(현재는 잔디 캘린더/마스터 수까지).
- **Glance 위젯 / JSON 백업·복원** (M8).
- **계측 테스트** — Room DAO, 4단계 진행 상태 복원(`SavedStateHandle`) 검증.
- **첫 실행 온보딩** — `POST_NOTIFICATIONS` 권한 요청 + 배터리 최적화 예외 안내 플로우
  (설정 화면에 예외 요청 버튼은 이미 있음).

## 안드로이드 실전 함정 반영 (사양 §11)

- 받아쓰기 입력창: `autoCorrectEnabled = false`, `KeyboardType.Ascii` — **키보드 자동완성 차단**
- IME 가림 방지: `imePadding()` + 제출/재생 버튼 하단 고정
- SAF `takePersistableUriPermission()` 로 재부팅 후에도 로컬 파일 접근 유지
- Media3 `SeekParameters.EXACT` + 50ms 폴링으로 정확한 구간 반복
- 채점 색상 라이트/다크 별도 팔레트(`ScoringColors`)
- 정확 알람 대신 WorkManager self-rescheduling(±15분 허용), `BOOT_COMPLETED` 재예약
