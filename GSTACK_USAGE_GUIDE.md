# gstack 사용 가이드

이 문서는 `note-editor` 프로젝트에서 gstack을 사용할 때의 기준을 정리합니다. 핵심 원칙은 간단합니다. gstack은 사용자 컴퓨터 전역 홈 디렉터리에 설치하지 않고, 이 프로젝트 안에만 설치해서 사용합니다.

## 기준

- 프로젝트 전용 설치 위치는 `.codex/skills/gstack`입니다.
- `~/.codex/skills`, `~/.claude/skills`, `~/gstack` 같은 사용자 홈 설치는 이 프로젝트 기준으로 사용하지 않습니다.
- upstream gstack 문서는 Claude Code와 여러 에이전트 설치 흐름을 함께 설명하므로 그대로 따라 하지 않습니다.
- 이 프로젝트의 기본 개발/검증 명령은 `AGENTS.md`와 `package.json`을 우선합니다.
- 현재 확인된 gstack 패키지는 Claude Code용 원본 성격이 강합니다. Codex용 호스트 설정은 들어 있지만, 실제 `SKILL.md`가 `~/.claude/skills/gstack`를 참조한다면 Codex 최적화 산출물이 아닙니다.

## 설치

### 권장 설치: 프로젝트 전용

저장소 루트에서 실행합니다.

```powershell
New-Item -ItemType Directory -Force .codex\skills | Out-Null
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git .codex\skills\gstack
```

Git Bash 또는 WSL을 쓰는 경우:

```bash
mkdir -p .codex/skills
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git .codex/skills/gstack
```

이미 `.codex/skills/gstack`가 있으면 새로 clone하지 말고 상태를 먼저 확인합니다.

```powershell
git -C .codex\skills\gstack status --short
git -C .codex\skills\gstack remote -v
```

업데이트가 필요하면 다음처럼 fast-forward만 허용합니다.

```powershell
git -C .codex\skills\gstack pull --ff-only
```

### Codex용 산출물 확인

gstack은 Codex 호스트용 생성 로직을 포함하지만, raw clone 직후의 `SKILL.md`가 항상 Codex에 맞게 정리되어 있다고 가정하면 안 됩니다. 설치 후 아래 검색으로 Claude 전용 흔적을 확인합니다.

```powershell
rg -n "~/.claude|MODEL_OVERLAY: claude|CLAUDE.md|AskUserQuestion|allowed-tools" .codex\skills\gstack -g "SKILL.md"
```

많이 잡히면 현재 패키지는 Codex 최적화 산출물이라기보다 Claude 중심 원본입니다. 이 경우 gstack을 참고 자료와 보조 워크플로우로만 보고, Codex가 그대로 실행할 때는 경로와 도구명이 맞는지 특히 확인해야 합니다.

가능하면 Git Bash 또는 WSL에서 Codex 호스트용 생성을 시도합니다.

```bash
cd .codex/skills/gstack
bun install
bun run gen:skill-docs --host codex --model gpt-5.4
```

생성 후에도 `SKILL.md`가 `~/.claude`를 계속 참조하면 이 프로젝트의 Codex 환경에 완전히 맞지 않는 상태입니다. 이때는 gstack 자체를 고치기보다, 필요한 기능만 프로젝트 전용 문서나 얇은 스킬로 따로 정리하는 편이 안전합니다.

### 하지 말 것

- `git clone ... ~/.claude/skills/gstack`를 실행하지 않습니다.
- `git clone ... ~/.codex/skills/gstack`를 실행하지 않습니다.
- `git clone ... ~/gstack` 후 전역 `./setup --host codex`를 실행하지 않습니다.
- `./setup --team`을 이 저장소에서 바로 실행하지 않습니다. 이 흐름은 `CLAUDE.md` 생성, routing 규칙 추가, commit 같은 동작을 유도할 수 있어 현재 `AGENTS.md` 기반 운영과 맞지 않습니다.
- gstack 문서에 있는 `CLAUDE.md` 수정 지시는 이 프로젝트에서는 적용하지 않습니다.

## 사용 방식

gstack은 하나의 터미널 명령이 아니라 작업별 스킬 묶음입니다. 아래의 `$스킬명`은 PowerShell에서 실행하는 명령이 아니라 Codex에게 요청할 때 붙이는 프롬프트 접두어입니다. 현재 세션의 스킬 목록에 보이는 이름을 우선 사용하고, 보이지 않는 별칭은 직접 실행하지 않습니다.

스킬을 부를 때는 다음 정보를 같이 주면 결과가 안정적입니다.

- 대상: URL, 문서 경로, diff 기준 브랜치, 화면/컴포넌트 이름
- 범위: 보고만 할지, 코드를 고쳐도 되는지, 커밋/배포까지 원하는지
- 기준: 모바일 우선, 보안 중심, critical/high만, 디자인 폴리시 등
- 증거: 스크린샷, 콘솔 로그, 네트워크 실패, 테스트 명령 출력 포함 여부

### 자주 쓰는 스킬

| 분류 | 스킬 | 사용할 때 |
| --- | --- | --- |
| 브라우저 점검 | `$gstack` 또는 `$browse` | 실제 브라우저로 로컬/배포 앱을 열어 사용자 플로우, 스크린샷, 콘솔 에러, 네트워크 실패를 확인할 때 |
| QA | `$qa` 또는 `$qa-only` | 기능이 준비된 뒤 체계적으로 버그를 찾을 때. `$qa`는 발견한 문제를 고치고 재검증하는 흐름, `$qa-only`는 리포트만 원할 때 사용합니다. |
| 보이는 브라우저 | `$open-gstack-browser` | 사용자가 직접 볼 수 있는 GStack Browser/Chrome 창을 띄워 에이전트 동작을 따라보고 싶을 때 |
| 원인 조사 | `$investigate` 또는 `$gstack-openclaw-investigate` | 버그, 500 오류, 예외, 재현 불가 증상을 고치기 전에 원인부터 추적할 때 |
| 코드 리뷰 | `$review` 또는 `$codex review` | merge/PR 전 현재 diff를 구조적 회귀, SQL/API 위험, 테스트 누락 관점으로 점검할 때 |
| 반대 검토 | `$codex challenge` | 구현이 맞는지 공격적으로 깨보는 두 번째 의견이 필요할 때 |
| 계획 검토 | `$office-hours`, `$plan-ceo-review`, `$plan-eng-review`, `$autoplan` | 새 아이디어, 제품 방향, 아키텍처, 구현 계획을 코드 작성 전에 검토할 때 |
| 디자인 | `$design-shotgun`, `$design-consultation`, `$design-html` | 디자인 대안 탐색, 디자인 시스템 작성, 승인된 디자인의 HTML/CSS 구현이 필요할 때 |
| 디자인 QA | `$design-review` 또는 `$plan-design-review` | 실제 화면의 spacing/hierarchy/responsive 문제를 보거나, 구현 전 디자인 계획을 비판적으로 검토할 때 |
| 개발자 경험 | `$plan-devex-review` 또는 `$devex-review` | API, CLI, SDK, 문서, 온보딩처럼 개발자가 사용하는 표면의 흐름과 마찰을 점검할 때 |
| 보안 | `$cso` | secrets, auth, OWASP, dependency, CI/CD, AI/LLM 보안 위험을 점검할 때 |
| 품질 상태 | `$health` | typecheck, test, lint 등 코드베이스 상태를 한 번에 보고 싶을 때 |
| 성능 | `$benchmark` | 페이지 로딩, Web Vitals, 번들 크기 등 성능 기준선과 회귀 여부를 확인할 때 |
| 배포 | `$ship`, `$land-and-deploy`, `$canary` | PR 생성, merge/deploy, 배포 후 모니터링을 진행할 때. 이 프로젝트에서는 push/merge/deploy 전에 사용자 승인을 먼저 받습니다. |
| 문서화 | `$document-release` 또는 `$make-pdf` | 릴리스 후 README/운영 문서/CHANGELOG를 동기화하거나 Markdown을 PDF로 만들 때 |
| 작업 상태 | `$context-save`, `$context-restore`, `$learn`, `$retro` | 긴 작업 상태를 저장/복원하거나, 과거 학습/주간 회고를 확인할 때 |
| 안전 모드 | `$careful`, `$freeze`, `$guard` | 삭제, force push, DB 변경처럼 위험한 작업을 경고하거나 편집 범위를 특정 디렉터리로 제한할 때 |
| 도구 관리 | `$gstack-upgrade`, `$benchmark-models`, `$pair-agent` | gstack 업데이트, 모델별 성능 비교, 다른 에이전트와 브라우저 공유가 필요할 때 |

### 선택 기준

- 화면을 실제로 눌러봐야 하면 `$gstack`, `$browse`, `$qa`, `$design-review`를 우선합니다.
- 에러나 이상 동작은 바로 고치기보다 `$investigate`로 원인과 재현 조건을 먼저 잡습니다.
- 코드가 거의 끝났으면 `$health`로 기본 검증 후 `$review`나 `$qa`로 회귀를 봅니다.
- 제품/설계 방향이 아직 흔들리면 `$office-hours`, `$plan-ceo-review`, `$plan-eng-review`, `$autoplan`을 먼저 씁니다.
- 보안, 배포, 원격 DB, destructive command가 걸리면 `$cso`, `$careful`, `$guard`, `$canary`처럼 안전 계열을 같이 고려합니다.

사용 예:

```text
$gstack으로 http://localhost:8788 열어서 노트 작성, 저장, 새로고침 플로우 QA해줘
```

```text
$qa-only http://localhost:8788에서 로그인, 노트 작성, 그룹 이동 플로우를 critical/high 버그 중심으로 리포트만 해줘
```

```text
$investigate 저장 버튼을 눌러도 내용이 반영되지 않는 원인을 찾아줘
```

```text
$review 현재 diff에서 Cloudflare D1/API 쪽 회귀 가능성을 봐줘
```

```text
$plan-eng-review docs/features/FEATURE-008-note-public-sharing.md 구현 계획에서 API 계약, D1 스키마, 테스트 누락을 봐줘
```

```text
$design-review 모바일에서 노트 목록과 편집기 레이아웃이 어색한지 확인해줘
```

```text
$cso 현재 인증/세션/공개 공유 API 기준으로 보안 위험을 점검해줘
```

```text
$benchmark 배포 전후 http://localhost:8788의 초기 로딩과 편집 화면 성능 회귀를 비교해줘
```

```text
$context-save 지금까지 결정한 내용과 남은 작업을 저장해줘
```

## 이 프로젝트에서의 실행 기준

로컬 앱은 보통 아래 중 하나로 실행합니다.

```powershell
npm run dev
```

```powershell
npm run dev:watch
```

로컬 주소는 기본적으로 `http://localhost:8788`입니다. 브라우저 QA를 요청할 때는 이 주소를 함께 주면 됩니다.

검증 명령은 다음 순서를 기준으로 합니다.

```powershell
npm run typecheck
npm run test:unit
npm run test:integration
npm run verify
```

PR 전 최종 게이트는 `npm run verify`입니다.

Cloudflare D1 스키마 변경은 직접 SQL을 원격에 던지지 않고, 마이그레이션 흐름을 사용합니다.

```powershell
npm run migrate:create
npm run migrate:apply:local
```

원격 반영은 `docs/operations/DEPLOY.md`와 `docs/specs/SPEC-02-d1-migration-framework.md`를 확인한 뒤 진행합니다.

## 현재 gstack을 볼 때 주의할 점

이 저장소에서 확인했던 gstack 패키지는 다음 특징이 있었습니다.

- `hosts/codex.ts`처럼 Codex 호스트 설정은 있습니다.
- 하지만 실제 여러 `SKILL.md`가 `~/.claude/skills/gstack`를 참조했습니다.
- 일부 frontmatter는 Codex보다 Claude Code에 가까운 `allowed-tools`, `AskUserQuestion`, `Agent`, `WebSearch`를 포함했습니다.
- 일부 preamble은 bash, process substitution, `find -mmin`, `open` 같은 Unix/macOS 전제를 사용했습니다.
- 따라서 Windows PowerShell + Codex 환경에서는 그대로 실행하기보다, 명령이 현재 프로젝트 경로와 도구 체계에 맞는지 확인해야 합니다.

실무 기준은 다음과 같습니다.

- 가이드와 체크리스트는 유용하게 참고합니다.
- 자동 설치, 자동 commit, `CLAUDE.md` 수정, 전역 telemetry 설정은 피합니다.
- 브라우저 QA처럼 명확히 도움이 되는 기능은 프로젝트 로컬 실행으로만 사용합니다.
- Codex가 gstack 내부 파일을 수정하려고 하면 먼저 사용자 승인을 받습니다.

## 업데이트

프로젝트 전용 gstack을 업데이트할 때:

```powershell
git -C .codex\skills\gstack pull --ff-only
```

업데이트 후 확인:

```powershell
rg -n "~/.claude|MODEL_OVERLAY: claude|CLAUDE.md|AskUserQuestion|allowed-tools" .codex\skills\gstack -g "SKILL.md"
```

Codex 세션이 이미 떠 있었다면 세션을 새로 시작해야 스킬 목록이 갱신될 수 있습니다.

## 문제 해결

스킬이 보이지 않으면 `.codex/skills/gstack`가 프로젝트 루트 아래에 있는지 확인하고 Codex 세션을 다시 시작합니다.

gstack이 `~/.claude` 또는 `CLAUDE.md`를 찾으려 하면 이 프로젝트 기준으로는 잘못된 경로입니다. 전역 설치를 추가하지 말고, 해당 스킬이 Codex용으로 생성되지 않았다고 판단합니다.

Windows에서 `./setup`, `bun run gen:skill-docs`, bash preamble이 실패하면 PowerShell 대신 Git Bash 또는 WSL에서 실행합니다.

gstack이 너무 크거나 프로젝트와 맞지 않으면 전체 패키지를 억지로 최적화하지 말고, 이 프로젝트에 필요한 최소 스킬만 별도 문서나 프로젝트 전용 스킬로 분리하는 편이 낫습니다.
