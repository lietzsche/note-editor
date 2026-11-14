# 마크다운 미리보기 및 공유 페이지 렌더링 설계

- 작성일: 2026-11-14
- 대상 프로젝트: `note-editor`
- 상태: Approved

## 1. 배경 및 목적 (Intent & Why)

`note-editor`는 현재 `EditorMarkdownToolbar`와 `src/lib/markdownFormat.ts`를 통해 제목(`H2`, `H3`), 굵게, 기울임, 취소선, 체크박스, 목록, 코드 문법 입력을 지원하고 있다. 그러나 에디터 본문(`NotesPageLayout.tsx`)은 `<textarea>` 원문만 표시하며, 공개 공유 페이지(`SharedNotePage.tsx`) 역시 본문을 일반 텍스트로만 렌더링하고 있다.

작성한 노트를 깔끔하게 읽고, 할 일 체크리스트를 미리보기 상태에서 바로 체크하며, 공유 링크(`/shared/:shareToken`)의 가독성을 높이기 위해 **편집/미리보기 전환 및 공통 마크다운 렌더링**을 도입한다.

## 2. 목표, 비목표, 금지 사항

### 목표 (Goals)
1. 노트 에디터 상단에 **편집 / 미리보기 전환** UI를 제공해 원문 편집과 렌더링된 문서 보기를 오갈 수 있다.
2. 표준 GFM(GitHub Flavored Markdown: 제목, 굵게/기울임/취소선, 목록, 체크박스, 표, 인용, 인라인/블록 코드, 링크)을 안전하게 렌더링한다.
3. 에디터 미리보기 모드에서 **체크박스(`- [ ]` / `- [x]`)를 클릭하면 원문 해당 줄이 토글되고 기존 자동 저장 흐름으로 저장**된다.
4. 공유 노트 페이지(`/shared/:shareToken`)에도 동일한 마크다운 렌더러를 적용해 읽기 전용 문서로 깔끔하게 표시한다.

### 비목표 (Non-Goals)
1. 인라인 WYSIWYG 리치 텍스트 에디터로 `<textarea>`를 대체하지 않는다.
2. 데스크톱 좌우 분할 뷰(Split View)는 이번 범위에 포함하지 않는다.
3. 이미지 업로드(Cloudflare R2), 수식(KaTeX), 다이어그램(Mermaid) 등 확장 문법은 이번 범위에 포함하지 않는다.

### 금지 사항 (Anti-Goals)
1. 사용자 입력의 raw HTML을 그대로 실행하거나 `javascript:` 등 위험한 URL 스킴을 허용해 XSS 취약점을 만들지 않는다.
2. 기존의 `<textarea>` 기반 자동 저장, 동시 편집 충돌 직렬화, 키보드 단축키(`Ctrl/Cmd+B`, `Ctrl/Cmd+I`) 동작을 깨뜨리지 않는다.
3. 휴지통의 읽기 전용 노트(`isSelectedNoteReadOnly`)나 공개 공유 페이지(`/shared/:shareToken`)에서 체크박스 클릭으로 내용이 변경되도록 허용하지 않는다.

## 3. 제약 사항 (Constraints)

- React 18, TypeScript strict 모드, Vite 빌드 환경에서 동작해야 한다.
- Cloudflare Workers Assets 번들 크기를 과도하게 키우지 않는다.
- 라이트/다크 테마(`src/styles/tokens.css`)의 CSS 변수를 그대로 사용해 테마 전환 시 자연스럽게 어울려야 한다.
- `npm run verify` (`typecheck` + `test:unit` + `test:integration`)를 통과해야 한다.

## 4. 구현 접근 방식 비교 (Approaches)

1. **`react-markdown` + `remark-gfm` 도입 (선택안)**
   - **설명**: 표준 React 마크다운 렌더러와 GFM 플러그인을 사용해 React 엘리먼트 트리로 렌더링한다.
   - **장점**: 기본적으로 raw HTML을 렌더링하지 않아 XSS에 안전하고, `components` 커스터마이징으로 체크박스 클릭 핸들러 및 외부 링크(`target="_blank" rel="noopener noreferrer"`)를 React 방식으로 깔끔하게 연결할 수 있다.
   - **트레이드오프**: npm 의존성이 추가되고 클라이언트 번들이 소폭 증가한다.
2. **`marked` + `DOMPurify` (`dangerouslySetInnerHTML`)**
   - **장점**: 번들이 작고 파싱이 빠르다.
   - **트레이드오프**: 체크박스 클릭 시 원문 라인과 매핑해 상태를 갱신하는 로직을 DOM 이벤트 위임으로 별도 구현해야 해 React 상태 흐름과 덜 자연스럽다.
3. **직접 경량 파서 구현**
   - **장점**: 외부 의존성이 없다.
   - **트레이드오프**: 중첩 목록, 코드 블록 이스케이프, 표, 보안(URL/HTML 정제) 엣지 케이스 유지보수 비용이 높다.

## 5. 상세 설계

### 5.1 공통 마크다운 렌더러 (`src/components/MarkdownPreview.tsx`)
- `react-markdown`과 `remark-gfm`을 사용한다.
- `a` 태그 커스터마이징: `http://`, `https://`, `mailto:` 등 안전한 프로토콜만 링크로 렌더링하고, 외부 링크는 `target="_blank" rel="noopener noreferrer"`를 부여한다.
- `input[type="checkbox"]` 커스터마이징:
  - `interactive` prop이 `true`인 경우(에디터 미리보기 & 쓰기 가능 노트)에만 클릭 가능하며, 클릭 시 몇 번째 체크박스인지 인덱스(또는 소스 라인 위치)를 콜백으로 전달한다.
  - `interactive`가 `false`인 경우(휴지통 읽기 전용 노트, `SharedNotePage`)에는 `disabled` 상태로 렌더링한다.
- 빈 본문일 경우 안내 문구(에디터/공유 페이지 각각 기존 문맥에 맞는 placeholder)를 표시한다.

### 5.2 체크박스 원문 토글 순수 로직 (`src/lib/markdownTaskToggle.ts`)
- 렌더링 없이 단위 테스트할 수 있도록 `src/lib/`에 순수 함수로 분리한다.
- **동작**: 마크다운 원문에서 펜스드 코드 블록(` ``` `, `~~~`) 내부를 제외한 실제 task list 항목(`- [ ]`, `* [ ]`, `+ [ ]`, `1. [ ]` 및 `[x]`/`[X]`)을 순서대로 찾아 `targetIndex`번째 항목의 체크 상태를 반전한 새 문자열을 반환한다.
- **저장 연동**: 반전된 새 본문을 기존 `NotesPage`의 본문 변경 핸들러(`onContentChange` 또는 동일 경로의 `updateContent`)로 전달해 `dirty` 상태, 글자 수, 자동 저장, 충돌 감지 파이프라인이 편집 모드와 100% 동일하게 동작하도록 한다.

### 5.3 에디터 편집/미리보기 전환 (`src/components/NotesPageLayout.tsx`, `src/pages/NotesPage.tsx`)
- 에디터 영역 상단(또는 `EditorMarkdownToolbar`와 같은 컨트롤 줄)에 `편집` / `미리보기` 전환 토글을 둔다.
- **노트 전환 시 기본 모드**: 다른 노트를 선택하면 편집 흐름 유지를 위해 기본은 `편집` 모드로 두되, 필요 시 사용자가 직관적으로 전환할 수 있게 한다.
- **미리보기 모드 상태**:
  - `<textarea>`와 `EditorMarkdownToolbar` 대신 `MarkdownPreview`를 렌더링한다.
  - `zenMode`(자동 집중 모드)는 `<textarea>` 입력에 맞춘 기능이므로, 미리보기 모드에서는 자동 집중 모드가 활성화되지 않도록 제어한다.
  - 휴지통 노트(`isSelectedNoteReadOnly`)도 미리보기 전환이 가능하며, 이 경우 체크박스는 비활성화(`interactive={false}`)한다.

### 5.4 공유 노트 페이지 적용 (`src/pages/SharedNotePage.tsx`)
- `.shared-note-card__content` 영역의 단순 텍스트 출력을 `MarkdownPreview` (`interactive={false}`)로 교체한다.
- 기존 `CopyAllButton`은 기존처럼 마크다운 원문(`note.content`)을 복사한다.

### 5.5 스타일 (`src/styles/markdown.css` 등)
- `src/styles/tokens.css`의 색상, 보더, 폰트, 코드 배경 토큰을 사용해 라이트/다크 모드에서 일관된 타이포그래피(제목 간격, 목록 들여쓰기, 인용구 좌측 보더, 코드 블록 스크롤, 표 테두리, 체크박스 정렬)를 적용한다.

## 6. 빌더에게 위임하는 사항 (What's Left to the Builder)

- `편집` / `미리보기` 전환 버튼의 정확한 위치, 레이블, 아이콘, 단축키(브라우저 기본 `Ctrl/Cmd+P`와 충돌하지 않는 키) 세부 결정
- `MarkdownPreview` 내 체크박스 인덱스 매핑을 `node.position?.start.line` 기반으로 할지 순서 기반(`targetIndex`)으로 할지 세부 구현 선택
- 마크다운 미리보기 전용 CSS 클래스 및 세부 여백/폰트 크기 조정
- `markdownTaskToggle.ts`, `MarkdownPreview.tsx`, `SharedNotePage.tsx`에 대한 Vitest 단위/컴포넌트 테스트 작성
