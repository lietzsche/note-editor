# COMPONENT GUIDE

- 문서 버전: v1.0
- 작성일: 2026-04-11
- 상태: Draft

## 1. 목적

React 컴포넌트 API와 구현 패턴을 일관되게 유지하기 위한 규약을 정의한다.

## 2. 공통 네이밍 규칙

1. 컴포넌트: PascalCase (`NoteListItem`)
2. 파일명: 컴포넌트명과 동일 (`NoteListItem.tsx`)
3. Props 타입: `<ComponentName>Props`
4. 핸들러: `on<Event>` (`onSelect`, `onDelete`)

## 3. Props 설계 규칙

1. `variant`, `size`, `state`를 공통 축으로 사용한다.
2. 불린 플래그 남발 대신 enum/string union을 우선한다.
3. 선택/입력 컴포넌트는 controlled 방식을 기본으로 한다.
4. `className` 확장 포인트를 제공한다.

### 3.1 공통 값 사전 (Global Dictionary)

1. `variant`
- `default`: 일반 상태
- `active`: 선택/강조 상태
- `subtle`: 낮은 강조 상태
- `danger`: 파괴적 액션 상태

2. `size`
- `sm`: 좁은 밀도(툴바/보조 액션)
- `md`: 기본 밀도(기본값)
- `lg`: 주요 CTA/모바일 우선 액션

3. `state`
- `loading`
- `ready`
- `empty`
- `error`
- `disabled`

4. 저장 관련 확장 상태(편집 컴포넌트 전용)
- `dirty`
- `saving`
- `saved`
- `conflict`

5. 편집 생산성 확장 상태(편집 컴포넌트 전용)
- `count-ready`
- `count-stale`
- `copy-success`
- `copy-error`

예시:

```tsx
type NoteItemVariant = "default" | "active" | "danger";
type NoteItemSize = "sm" | "md";

export interface NoteListItemProps {
  id: string;
  title: string;
  selected?: boolean;
  variant?: NoteItemVariant;
  size?: NoteItemSize;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}
```

## 4. 상태 규칙

1. 화면 상태는 `loading`, `empty`, `error`, `ready`로 표준화한다.
2. 컴포넌트 내부 비동기 상태는 필요 최소한만 유지한다.
3. 저장 상태는 사용자에게 노출 가능한 형태(`saving/saved/error`)로 모델링한다.

## 5. 접근성 규칙

1. 인터랙션 요소는 키보드 접근 가능해야 한다.
2. 포커스 링은 제거하지 않는다.
3. 아이콘 버튼은 `aria-label`을 필수로 제공한다.
4. 오류 메시지는 스크린리더가 읽을 수 있도록 연결한다.
5. 일반 텍스트 대비는 4.5:1 이상을 만족해야 한다.
6. 터치 타깃은 모바일에서 44x44px 이상을 권장한다.
7. 모달 다이얼로그는 `useModalFocus`(`src/lib/useModalFocus.ts`)를 사용한다.
   - 열릴 때 `[data-autofocus]` 요소(없으면 첫 포커스 가능 요소)로 포커스를 옮긴다.
   - Tab/Shift+Tab 포커스는 다이얼로그 안에서 순환하고, 닫히면 열기 전 위치로 복귀한다.
   - Escape는 데이터 변경 없는 취소/닫기에만 연결한다. 강제 비밀번호 변경처럼 닫을 수 없는 다이얼로그는 `onEscape`를 생략한다.
8. 사용자 알림에 `window.alert`를 사용하지 않는다. 대신 토스트(`showToast`)를 사용한다.

## 6. 분리 규칙

1. 화면 컨테이너와 프리젠테이셔널 컴포넌트를 분리한다.
2. 데이터 fetch/상태 orchestration은 컨테이너에서 처리한다.
3. 프리젠테이셔널 컴포넌트는 렌더링과 이벤트 전달에 집중한다.

## 7. 편집 생산성 컴포넌트 규칙

1. `CharacterCountIndicator`
- Props: `count`, `label?`, `className?`
- 표시 값은 현재 노트 본문 기준 실시간 값이어야 한다.
- 노트 전환 직후 `count-stale` 상태 노출 시간을 최소화한다.

2. `CopyAllButton`
- Props: `onCopy`, `disabled?`, `className?`
- 성공/실패 상태 피드백 훅(토스트/인라인 메시지)과 연결해야 한다.
- 복사 액션은 명시적 사용자 트리거(클릭/키보드 활성화)로만 실행한다.
- 노트 편집 화면에서는 `EditorMoreMenu` 안의 "본문 전체 복사" 항목으로 대체되었고, 결과는 토스트로 알린다.

3. `ToastViewport` / `toastStore`
- 호출: `showToast({ message, tone?: "info" | "success" | "error", action?: { label, onAction }, durationMs? })`
- 기본 4초 후 자동으로 닫힌다. 액션이 있으면 5초 동안 보인다. 동시에 최대 3개까지 쌓인다.
- 오류는 `role="alert"`, 그 외는 `role="status"`로 알린다.
- 위치: 데스크톱은 우하단, 모바일은 하단 탭바 위.
- 몰입 모드에서는 오류와 액션(되돌리기 등) 토스트만 노출한다.
- 노트를 휴지통으로 옮기면 "되돌리기" 액션을 제공한다. 누르면 restore API로 즉시 복원한다.

4. `EditorMoreMenu`
- 에디터 툴바에는 저장 상태, 공유, 몰입 모드만 노출하고, 복사·맞춤법 검사·휴지통 이동은 `⋯` 메뉴로 모은다.
- 저장 오류(다시 시도)와 충돌(충돌 해결) 버튼은 메뉴에 숨기지 않는다. 발생하면 경고 톤(`alertActionBtn`)으로 툴바에 노출한다.
- 키보드: 트리거에서 ArrowDown으로 열기, 메뉴에서 ArrowUp/Down/Home/End로 이동, Escape로 닫고 트리거로 포커스 복귀, Tab으로 닫기.
- 읽기 전용(휴지통) 노트에서는 맞춤법·삭제 항목을 숨긴다.

5. PC 사이드바 토글 (`panelCollapseState`)
- PC 모드에서 [그룹 + 노트목록] 전체를 하나의 사이드바로 묶어 단일 토글 인터랙션으로 접고 펼칠 수 있다.
- 사이드바가 열려 있을 때는 사이드바 상단 접기 버튼(`«`), 닫혀 있을 때는 에디터 툴바 맨 왼쪽의 펼치기 아이콘 버튼(`»`)을 통해 토글한다.
- 키보드 단축키 `Ctrl + [` 또는 `Ctrl + B` (Mac: `Cmd + [`, `Cmd + B`)로 언제든 즉시 토글할 수 있다.
- 상태는 `localStorage`(`note-editor:sidebar-collapsed`)에 보존된다.
- 본문 텍스트 드래그(블록 선택)는 테마별 고대비 브랜드 그린 틴트(`::selection`)로 선명하게 표시된다.

## 8. 파일 구조 규칙

1. 파일 크기
   - 하나의 파일은 1000줄을 넘지 않아야 한다.
   - 파일이 너무 커지면 기능별로 분리하거나 하위 컴포넌트로 추출한다.

2. 컴포넌트 분리
   - 단일 컴포넌트 파일이 500줄을 초과하면 재사용 가능한 하위 컴포넌트로 분리할 것을 고려한다.
   - 복잡한 로직은 커스텀 훅이나 유틸리티 함수로 분리한다.

3. 디렉토리 구조
   - 관련 컴포넌트는 동일한 디렉토리에 그룹화한다.
   - 공통 유틸리티는 `src/lib/`에, 공통 컴포넌트는 `src/components/`에 위치시킨다.

## 9. 체크리스트

- [x] 네이밍 규칙 준수
- [x] Props 규약 준수(variant/size/state)
- [x] 접근성 기준 준수
- [x] 상태 모델 표준 준수
- [x] 실시간 글자 수/전체 복사 컴포넌트 규칙 준수
- [x] 문서 업데이트(컴포넌트 추가/변경 시)

2026-04-12 진행 메모:
- `CharacterCountIndicator`, `CopyAllButton` 반영 완료
- 화면 orchestration은 `NotesPage`, 렌더링/피드백은 편집 보조 컴포넌트로 분리

2026-11-03 진행 메모:
- `ToastViewport`/`toastStore`, `EditorMoreMenu`, `useModalFocus` 추가
- 노트 목록 로딩 스켈레톤과 로드 실패 "다시 시도" 버튼 추가
- 사이드바 하단에서 로그아웃을 구분선 뒤 저강조 스타일로 분리

2026-11-04 진행 메모:
- PC 모드 사이드바(그룹+노트목록) 단일 토글 인터랙션 및 `Ctrl + [` / `Ctrl + B` 단축키 지원
- 텍스트 드래그(선택 영역) 하이라이트(`::selection`) 가독성/대비 개선
- 에디터 상단 및 빈 화면에서 미니멀한 단일 사이드바 열기 버튼 제공 및 상태 영속화(`localStorage`)
