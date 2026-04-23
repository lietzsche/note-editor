# gstack 사용법 가이드

`gstack`은 Codex/Claude가 특정 작업을 더 체계적으로 수행하도록 돕는 스킬 묶음입니다. 단순한 CLI 명령어라기보다, 브라우저 QA, 디버깅, 계획 리뷰, 배포 검증, 문서화 같은 작업을 위한 워크플로우 프리셋에 가깝습니다.

## 큰 분류

### `$gstack`

`$gstack`은 브라우저 QA와 dogfooding에 쓰는 본체 기능입니다. headless Chromium을 열어 실제 사이트를 탐색하고, 버튼을 누르고, 폼을 입력하고, 콘솔 에러와 네트워크 실패를 확인하며, 스크린샷을 남길 수 있습니다.

주요 용도:

- 페이지 열기와 화면 확인
- 버튼, 링크, 입력창, 업로드 등 실제 UI 조작
- 콘솔 에러와 네트워크 실패 요청 확인
- 모바일, 태블릿, 데스크톱 반응형 스크린샷 촬영
- 로그인, 노트 작성, 저장 같은 사용자 플로우 dogfooding
- 배포된 페이지가 정상 동작하는지 검증

예시 요청:

```text
$gstack으로 로컬 앱 열어서 노트 작성 플로우 테스트해줘
```

```text
$gstack으로 모바일 화면 스크린샷 찍고 레이아웃 깨지는지 봐줘
```

```text
$gstack으로 배포 페이지 콘솔 에러랑 네트워크 실패 확인해줘
```

이 저장소에서는 보통 `npm run dev` 또는 `npm run dev:watch`로 로컬 앱을 띄운 뒤 `http://localhost:8788` 같은 주소를 gstack 브라우저로 열어 검증합니다.

### `$gstack-*`

`$gstack-*`는 특정 목적의 작업별 스킬입니다. 예를 들어 버그 조사, CEO 관점 계획 리뷰, 보안 감사, 디자인 리뷰, 배포 검증처럼 정해진 절차가 있는 작업을 실행합니다.

## 설치 방법

gstack은 사용하는 AI 코딩 도구에 따라 설치 위치가 다릅니다. Claude Code는 gstack 전체 저장소를 하나의 스킬 폴더로 읽고, Codex는 각 스킬을 `gstack-*` 폴더로 나눠 읽습니다.

### 공통 요구사항

- Git
- Bun v1.0 이상
- Windows에서는 Node.js도 필요합니다.
- Windows에서 `./setup`을 실행할 때는 Git Bash, WSL, 또는 bash를 실행할 수 있는 터미널을 사용하는 편이 안전합니다.

### Claude Code에 설치

Claude Code는 gstack을 아래 위치에 둡니다.

```text
~/.claude/skills/gstack
```

Windows 경로로는 보통 다음과 같습니다.

```text
C:\Users\<사용자>\.claude\skills\gstack
```

설치 명령:

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack
./setup
```

설치 후 스킬 파일은 다음 구조에 있습니다.

```text
~/.claude/skills/gstack/SKILL.md
~/.claude/skills/gstack/qa/SKILL.md
~/.claude/skills/gstack/review/SKILL.md
~/.claude/skills/gstack/investigate/SKILL.md
```

즉 Claude의 경우 “그 파일”, 예를 들어 `SKILL.md`는 gstack 저장소 내부의 각 스킬 폴더에 둡니다. 프로젝트 단위로 팀에 공유하려면 저장소 루트에서 team mode를 설정할 수 있습니다.

```bash
(cd ~/.claude/skills/gstack && ./setup --team) && ~/.claude/skills/gstack/bin/gstack-team-init required
```

이 방식은 gstack 전체를 프로젝트에 복사하지 않고, 프로젝트 설정만 추가해서 팀원이 같은 gstack 스킬을 쓰도록 유도합니다.

### OpenAI Codex CLI에 설치

Codex는 gstack 런타임과 각 스킬을 아래 위치에 설치합니다.

```text
~/.codex/skills/gstack
~/.codex/skills/gstack-*/
```

Windows 경로로는 보통 다음과 같습니다.

```text
C:\Users\<사용자>\.codex\skills\gstack
C:\Users\<사용자>\.codex\skills\gstack-*
```

설치 명령:

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/gstack
cd ~/gstack
./setup --host codex
```

설치 후 스킬 파일은 다음 구조에 있습니다.

```text
~/.codex/skills/gstack/SKILL.md
~/.codex/skills/gstack-openclaw-ceo-review/SKILL.md
~/.codex/skills/gstack-openclaw-investigate/SKILL.md
~/.codex/skills/gstack-upgrade/SKILL.md
```

`~/.codex/skills/gstack`은 gstack 본체와 실행에 필요한 런타임 자산을 담는 위치입니다. 개별 작업 스킬은 보통 `~/.codex/skills/gstack-<스킬이름>/SKILL.md` 형태로 들어갑니다.

즉 Codex의 경우 “그 파일”, 예를 들어 특정 스킬의 `SKILL.md`는 전역으로 쓰려면 `~/.codex/skills/<스킬이름>/SKILL.md`에 둡니다. 이 프로젝트에서처럼 프로젝트 전용 스킬을 함께 두고 싶다면 저장소 내부의 `.agents/skills/` 아래에 둘 수도 있습니다.

```text
프로젝트 전용 위치:
C:\coding\note-editor\.agents\skills\<스킬이름>\SKILL.md
```

현재 이 저장소의 vendored gstack은 다음처럼 들어 있습니다.

```text
C:\coding\note-editor\.agents\skills\gstack\SKILL.md
C:\coding\note-editor\.agents\skills\gstack\openclaw\skills\gstack-openclaw-investigate\SKILL.md
```

전역으로 모든 Codex 세션에서 쓰려면 `C:\Users\<사용자>\.codex\skills\`를 쓰고, 이 저장소에서만 쓰려면 `.agents\skills\`를 쓰는 식으로 구분하면 됩니다.

### 설치 위치 요약

| 대상 | 전역 설치 위치 | 스킬 파일 위치 예시 |
| --- | --- | --- |
| Claude Code | `~/.claude/skills/gstack` | `~/.claude/skills/gstack/qa/SKILL.md` |
| OpenAI Codex CLI | `~/.codex/skills/gstack`, `~/.codex/skills/gstack-*/` | `~/.codex/skills/gstack-openclaw-investigate/SKILL.md` |
| 이 저장소 전용 | `.agents/skills/` | `.agents/skills/gstack/SKILL.md` |

설치 후 Claude나 Codex 세션을 새로 열면 스킬 목록에 gstack 명령어가 잡힙니다. 이미 열려 있는 세션에서는 스킬 목록이 갱신되지 않을 수 있으므로 새 세션에서 확인하는 것이 좋습니다.

## 주요 명령어

| 명령어 | 기능 |
| --- | --- |
| `$gstack` | headless browser로 사이트를 열고 QA, 스크린샷, 콘솔/네트워크 검사, 반응형 테스트를 수행합니다. |
| `$gstack-openclaw-ceo-review` | 계획을 CEO/제품 관점에서 검토합니다. 문제 정의, 범위, 대안, 리스크를 따집니다. 구현은 하지 않습니다. |
| `$gstack-openclaw-investigate` | 버그나 에러의 원인을 조사합니다. 재현, 코드 추적, 최근 변경 확인, 가설 검증 후에만 수정합니다. |
| `$gstack-openclaw-office-hours` | 새 아이디어나 제품 방향을 브레인스토밍하고 만들 가치가 있는지 검토합니다. |
| `$gstack-openclaw-retro` | 최근 커밋과 작업 흐름을 기반으로 회고를 작성합니다. |
| `$gstack-upgrade` | gstack 자체를 최신 버전으로 업데이트합니다. |
| `$benchmark` | 페이지 속도, Web Vitals, 번들 크기 같은 성능 회귀를 확인합니다. |
| `$canary` | 배포 후 프로덕션을 감시하며 콘솔 에러, 성능 문제, 화면 실패를 확인합니다. |
| `$careful` | 삭제, reset, force push 같은 위험한 명령어 전에 안전 경고를 강화합니다. |
| `$guard` | `$careful`과 디렉터리 수정 제한을 결합한 강한 안전 모드입니다. |
| `$freeze` | 수정 가능한 범위를 특정 폴더로 제한합니다. |
| `$context-save` | 현재 작업 상태, git 상태, 결정 사항, 남은 작업을 저장합니다. |
| `$context-restore` | 이전에 저장한 작업 맥락을 복원합니다. |
| `$cso` | 보안 감사입니다. secrets, 의존성, OWASP, CI/CD, AI 보안 등을 봅니다. |
| `$design-consultation` | 새 UI나 제품의 디자인 시스템, 색상, 타이포그래피, 브랜드 방향을 잡습니다. |
| `$design-shotgun` | 여러 디자인 시안을 빠르게 만들고 비교합니다. |
| `$design-html` | 승인된 디자인을 HTML/CSS 구현으로 만듭니다. |
| `$design-review` | 실제 UI를 보고 spacing, hierarchy, responsive, 시각적 완성도 문제를 찾고 고칩니다. |
| `$devex-review` | 문서, onboarding, CLI, API 흐름을 실제로 테스트해 개발자 경험을 점검합니다. |
| `$document-release` | 배포 후 README, CHANGELOG, 운영 문서 등을 실제 변경사항에 맞게 업데이트합니다. |
| `$health` | 타입체크, 테스트, 린트 등으로 코드베이스 건강 상태를 점검합니다. |
| `$investigate` | 일반 디버깅 스킬입니다. `$gstack-openclaw-investigate`와 비슷하게 원인 조사 중심으로 동작합니다. |
| `$land-and-deploy` | PR merge, 배포, 배포 검증까지 이어서 진행합니다. |
| `$learn` | gstack이 과거 세션에서 저장한 프로젝트 학습 내용을 조회합니다. |
| `$make-pdf` | markdown 문서를 PDF로 변환합니다. |
| `$office-hours` | 제품 아이디어나 방향성을 검토하고 브레인스토밍합니다. |
| `$open-gstack-browser` | 눈에 보이는 실제 Chromium 브라우저를 띄워 사람이 과정을 볼 수 있게 합니다. |
| `$pair-agent` | 다른 AI 에이전트에게 브라우저 접근 권한을 공유합니다. |
| `$plan-ceo-review` | 구현 전 계획을 CEO 관점에서 리뷰합니다. `$gstack-openclaw-ceo-review`와 비슷한 계열입니다. |
| `$plan-design-review` | 구현 전 디자인 계획을 리뷰합니다. |
| `$plan-devex-review` | 구현 전 API, SDK, CLI, 문서 같은 개발자 경험 계획을 리뷰합니다. |
| `$autoplan` | CEO, 디자인, 엔지니어링, DX 리뷰를 자동으로 순서대로 실행하는 전체 계획 리뷰 파이프라인입니다. |
| `$codex` | Codex에게 코드 리뷰, 반박, second opinion을 요청합니다. |

## 자주 쓰는 요청 예시

```text
$gstack으로 로컬 앱 QA 해줘
```

```text
$gstack-openclaw-investigate 저장 버튼 에러 원인 찾아줘
```

```text
$gstack-openclaw-ceo-review 이 기능 계획 리뷰해줘
```

```text
$design-review 화면이 어색한지 봐줘
```

```text
$health 코드베이스 상태 점검해줘
```

```text
$context-save 지금 작업 상태 저장해줘
```

## 언제 어떤 걸 쓰면 좋은가

버그가 있으면 `$gstack-openclaw-investigate`나 `$investigate`를 사용합니다. 이 스킬은 빠른 땜빵보다 원인 재현과 검증을 우선합니다.

브라우저에서 실제 동작을 확인하고 싶으면 `$gstack`을 사용합니다. 특히 UI 플로우, 콘솔 에러, 네트워크 실패, 반응형 화면 확인에 적합합니다.

기능을 만들기 전에 방향이 맞는지 따지고 싶으면 `$gstack-openclaw-ceo-review`, `$plan-ceo-review`, `$autoplan`을 사용합니다.

UI가 어색하거나 디자인 품질을 높이고 싶으면 `$design-review`, 새 디자인 방향을 잡고 싶으면 `$design-consultation`이나 `$design-shotgun`을 사용합니다.

작업을 끊었다가 이어가야 하면 `$context-save`와 `$context-restore`를 사용합니다.

## 요약

`$gstack`은 브라우저 테스트 본체이고, `$gstack-*`는 특정 작업을 위한 고정 워크플로우입니다. 그냥 답변을 받는 것보다 정해진 절차, 체크리스트, 검증 단계를 따라가야 할 때 사용하면 좋습니다.
