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

gstack은 하나의 명령이라기보다 작업별 스킬 묶음입니다. 이 프로젝트에서는 다음처럼 사용합니다.

| 스킬 | 사용할 때 |
| --- | --- |
| `$gstack` 또는 `$browse` | 실제 브라우저로 로컬/배포 앱을 열어 QA, 스크린샷, 콘솔 에러, 네트워크 실패를 확인할 때 |
| `$investigate` 또는 `$gstack-openclaw-investigate` | 버그, 500 오류, 예외, 재현 불가 증상을 원인부터 추적할 때 |
| `$review` | 변경사항을 merge 전에 코드 리뷰 관점으로 점검할 때 |
| `$design-review` | UI spacing, hierarchy, responsive, 시각적 어색함을 실제 화면 기준으로 점검할 때 |
| `$cso` | secrets, auth, OWASP, dependency, AI 보안 위험을 점검할 때 |
| `$health` | typecheck, test, lint 등 코드베이스 상태를 한 번에 보고 싶을 때 |
| `$context-save` / `$context-restore` | 긴 작업의 진행 상태를 저장하고 이어갈 때 |

사용 예:

```text
$gstack으로 http://localhost:8788 열어서 노트 작성, 저장, 새로고침 플로우 QA해줘
```

```text
$investigate 저장 버튼을 눌러도 내용이 반영되지 않는 원인을 찾아줘
```

```text
$review 현재 diff에서 Cloudflare D1/API 쪽 회귀 가능성을 봐줘
```

```text
$design-review 모바일에서 노트 목록과 편집기 레이아웃이 어색한지 확인해줘
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
