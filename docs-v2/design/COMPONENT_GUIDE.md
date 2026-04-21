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
