# Codex Guide for note-editor

이 디렉터리는 Codex가 이 프로젝트에서 반복적으로 수행하는 “작업 유형”별 skill을 둔다. 기준은 소스 위치가 아니라 의도다. 예를 들어 API 파일을 보더라도 목적이 코드 리뷰면 `$note-editor-code-review`를 쓰고, 디자인 제안을 실제 구현하는 목적이면 `$note-editor-apply-feedback`을 쓴다.

루트 `AGENTS.md`의 저장소 규칙이 항상 우선이며, 여기의 skill은 작업 방식과 산출물 형식을 정하는 보조 지침이다.

## Skill 목록

| Skill | 언제 쓰는가 |
| --- | --- |
| `$note-editor-product-planning` | 새 기능을 기획하거나 요구사항, 범위, 수용 기준, 백로그 승격을 정리할 때 |
| `$note-editor-design-brainstorm` | UI/UX 방향을 여러 개 발산하고 장단점과 구현 난이도를 비교할 때 |
| `$note-editor-design-review` | 구현된 UI나 디자인 제안을 사용성, 접근성, 반응형, 디자인 시스템 기준으로 검토할 때 |
| `$note-editor-code-review` | diff, PR, 구현 코드를 보고 버그, 회귀, 보안, 테스트 누락을 찾을 때 |
| `$note-editor-apply-feedback` | 코드 리뷰, 디자인 리뷰, 브레인스토밍, 기획에서 선택된 내용을 실제 코드/테스트/문서에 반영할 때 |
| `$note-editor-qa-review` | 테스트 범위, 수동 QA, 릴리즈 준비, `verify` 실패, 배포 전 체크리스트를 점검할 때 |

## 사용법

요청에 skill 이름을 직접 적으면 Codex가 해당 절차를 먼저 따른다. 여러 목적이 섞이면 여러 skill을 같이 적어도 된다.

예를 들어 “리뷰하고 바로 고쳐줘”는 실제로 두 단계다. 먼저 `$note-editor-code-review`로 문제를 찾고, 이어서 `$note-editor-apply-feedback`으로 반영한다. 한 번에 요청하려면 두 skill을 같이 적는다.

코드를 건드리지 않고 아이디어만 원하면 “코드는 수정하지 말고”라고 명시한다. 특히 기획, 브레인스토밍, 리뷰 요청은 기본적으로 분석과 제안이 중심이고, 적용 요청이 있을 때만 코드를 바꾼다.

## 사용 예시

제품 기획:

```text
$note-editor-product-planning을 사용해서 노트 공유 링크 만료 기능의 요구사항, 비범위, 수용 기준을 정리해줘. 아직 코드는 수정하지 마.
```

디자인 브레인스토밍:

```text
$note-editor-design-brainstorm을 사용해서 모바일 노트 전환 UX를 개선할 수 있는 방향을 3가지 제안해줘.
```

디자인 리뷰:

```text
$note-editor-design-review를 사용해서 현재 노트 편집 화면의 빈 상태와 저장 상태 피드백을 검토해줘. 접근성 문제도 같이 봐줘.
```

코드 리뷰:

```text
$note-editor-code-review를 사용해서 최근 변경사항을 리뷰해줘. 데이터 유실, 계정 격리, 자동 저장 회귀 위험을 우선 봐줘.
```

리뷰 반영:

```text
$note-editor-apply-feedback을 사용해서 방금 코드 리뷰에서 나온 High/Medium 지적사항만 수정하고 필요한 테스트를 추가해줘.
```

브레인스토밍 결과 적용:

```text
$note-editor-apply-feedback을 사용해서 디자인 브레인스토밍에서 제안한 2번 방향을 실제 UI에 적용해줘.
```

QA/릴리즈 점검:

```text
$note-editor-qa-review를 사용해서 이번 변경의 배포 전 체크리스트와 수동 QA 시나리오를 만들어줘.
```

## 추천 흐름

| 상황 | 추천 흐름 |
| --- | --- |
| 새 기능을 처음 논의 | `$note-editor-product-planning` -> 필요 시 `$note-editor-design-brainstorm` |
| UI 방향을 정하고 구현 | `$note-editor-design-brainstorm` -> `$note-editor-design-review` -> `$note-editor-apply-feedback` |
| 구현 완료 후 품질 확인 | `$note-editor-code-review` -> `$note-editor-apply-feedback` -> `$note-editor-qa-review` |
| 리뷰 지적사항만 빠르게 처리 | `$note-editor-apply-feedback` |
| 배포 전 최종 점검 | `$note-editor-qa-review` |

## 체인 명령어

체인 명령어는 여러 skill을 한 요청 안에서 순서대로 실행하도록 지정하는 프롬프트 패턴이다. 왼쪽에서 오른쪽으로 진행하며, `$note-editor-apply-feedback`이 포함된 체인은 코드, 테스트, 문서 변경까지 수행할 수 있다.

분석만 원하면 체인 끝에 `아직 코드는 수정하지 마`를 붙인다. 반대로 바로 반영하려면 `발견한 High/Medium은 바로 수정해줘`처럼 적용 범위를 명시한다.

| 상황 | 체인 명령어 | 기대 산출물 |
| --- | --- | --- |
| 새 기능을 기획부터 구현까지 진행 | `$note-editor-product-planning -> $note-editor-apply-feedback -> $note-editor-qa-review` | 요구사항/수용 기준 확인, 코드/테스트/문서 반영, QA 체크 |
| UI 개선 방향을 정하고 반영 | `$note-editor-design-brainstorm -> $note-editor-design-review -> $note-editor-apply-feedback` | 2~4개 대안 비교, 선택안 검토, UI 구현 |
| 구현된 UI를 검토하고 고침 | `$note-editor-design-review -> $note-editor-apply-feedback -> $note-editor-qa-review` | 접근성/반응형/상태 피드백 finding 수정, 수동 QA 시나리오 |
| 전반 소스 리뷰 후 안전한 범위만 수정 | `$note-editor-code-review -> $note-editor-apply-feedback -> $note-editor-qa-review` | High/Medium 결함 수정, 회귀 테스트, 릴리즈 리스크 |
| 배포 전 최종 품질 게이트 | `$note-editor-code-review -> $note-editor-qa-review` | 수정 없이 위험 점검, 검증 공백과 배포 전 체크리스트 |
| 기획 문서와 테스트 계획 동기화 | `$note-editor-product-planning -> $note-editor-qa-review -> $note-editor-apply-feedback` | FEATURE/TEST 기준 정렬, 누락 문서 반영 |
| 리뷰 지적사항만 빠르게 반영 | `$note-editor-apply-feedback -> $note-editor-qa-review` | 확정된 피드백 구현, 필요한 검증 명령 제안 |

## 체인 명령어 예시

기능 기획부터 반영:

```text
$note-editor-product-planning -> $note-editor-apply-feedback -> $note-editor-qa-review 체인으로 공유 링크 만료일 설정 기능을 기획하고 구현한 뒤 검증까지 해줘.
```

UI 개선:

```text
$note-editor-design-brainstorm -> $note-editor-design-review -> $note-editor-apply-feedback 체인으로 모바일 노트 전환 UX를 개선해줘. 브레인스토밍 후 가장 안전한 방향을 선택해서 반영해줘.
```

소스 리뷰 후 수정:

```text
$note-editor-code-review -> $note-editor-apply-feedback -> $note-editor-qa-review 체인으로 프로젝트 전반을 리뷰하고 High/Medium 결함만 수정한 뒤 npm run verify까지 실행해줘.
```

문서만 정리:

```text
$note-editor-product-planning -> $note-editor-qa-review -> $note-editor-apply-feedback 체인으로 FEATURE 문서와 TEST_PLAN의 수용 기준이 어긋난 부분만 정리해줘. 코드는 수정하지 마.
```

배포 전 점검:

```text
$note-editor-code-review -> $note-editor-qa-review 체인으로 현재 변경사항을 배포해도 되는지 점검해줘. 수정은 하지 말고 findings와 residual risk만 보고해줘.
```

## 체인 선택 기준

- 시작점이 아이디어면 `$note-editor-product-planning`을 먼저 둔다.
- 시작점이 화면 경험이면 `$note-editor-design-brainstorm` 또는 `$note-editor-design-review`를 먼저 둔다.
- 시작점이 구현 품질이면 `$note-editor-code-review`를 먼저 둔다.
- 이미 확정된 피드백을 반영하는 요청이면 `$note-editor-apply-feedback`부터 시작한다.
- 배포, 테스트, 릴리즈 판단이 필요하면 마지막에 `$note-editor-qa-review`를 둔다.
- 코드 변경 없이 판단만 필요하면 `$note-editor-apply-feedback`을 빼거나 `코드는 수정하지 마`를 명시한다.

## 산출물 기준

| 작업 유형 | 기본 산출물 |
| --- | --- |
| 기획 | 문제 정의, 범위, 비범위, 사용자 시나리오, 수용 기준, 오픈 이슈 |
| 디자인 브레인스토밍 | 2~4개 방향, 장단점, 구현 난이도, 추천안 |
| 디자인 리뷰 | 심각도별 UI/UX/접근성 finding, 수정 방향, open question |
| 코드 리뷰 | 심각도별 bug/regression/security finding, 파일/라인, residual risk |
| 피드백 반영 | 반영 항목, 수정 내용, 추가/갱신 테스트, 남은 항목 |
| QA 검토 | 자동화 범위, 수동 QA 시나리오, 배포 전 확인, 남은 리스크 |

## 유지보수

새 반복 패턴이 생기면 `.agents/skills/<skill-name>/SKILL.md`를 갱신한다. Skill에는 작업 방식만 간결하게 두고, 제품/운영/테스트의 상세 기록은 기존 `docs/`의 canonical 문서에 남긴다.
