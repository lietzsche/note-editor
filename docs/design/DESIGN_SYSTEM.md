# DESIGN SYSTEM

- 문서 버전: v1.0
- 작성일: 2026-04-11
- 상태: Draft

## 1. 목적

React 기반 노트 서비스에서 UI 일관성, 재사용성, 접근성을 유지하기 위한 설계 원칙을 정의한다.

## 2. 시스템 범위

1. 테마(컬러, 타이포, 간격, 모서리, 그림자, 모션)
2. 공통 컴포넌트(버튼, 입력, 리스트, 다이얼로그, 상태표시)
3. 화면 패턴(목록/상세/편집/확인)
4. 상태 모델(loading/empty/error/ready)

## 3. 계층 구조

1. Foundation
- Design Token (semantic 중심)

2. Primitive
- Button, Input, Text, Surface 등 최소 단위

3. Composite
- NoteListItem, GroupSidebar, SaveStatusIndicator 등 조합 단위

4. Screen Pattern
- NotesSplitView, MobileEditorFlow 등 화면 패턴 단위

## 4. 일관성 원칙

1. Semantic-first
- 색상은 `primary-500` 대신 `color-bg-surface`, `color-text-primary`처럼 의미 기반 토큰을 사용한다.

2. Single Source of Truth
- 시각 값은 토큰(JSON/TS)에서만 관리하고 컴포넌트 내부 하드코딩을 금지한다.

3. Predictable API
- 컴포넌트 variant/size/state 네이밍을 전역 규칙으로 통일한다.

4. Accessibility by default
- 포커스/키보드/aria 규칙을 컴포넌트 기본값으로 제공한다.

## 5. 상태/피드백 규칙

1. 저장 상태
- `saving`, `saved`, `error`를 사용자에게 명시한다.
- `dirty`(미저장 변경) 상태를 별도로 추적한다.

2. 파괴적 액션
- 삭제는 확인 단계 또는 Undo 전략 중 하나를 반드시 제공한다.
- 그룹 삭제 시 소속 노트는 기본 그룹(미분류)로 이동을 기본 정책으로 한다.

3. 오류 표현
- 필드 오류, 화면 오류, 전역 오류를 구분해 표현한다.

4. 전환/충돌 상태
- 노트 전환 시 `dirty=true`이면 전환 확인 다이얼로그를 표시한다.
- 저장 실패 시 마지막 입력값은 유지하고 재시도 가능 상태를 제공한다.
- 동시 수정 충돌 시 `conflict` 상태로 전환하고 비교/선택 UI를 제공한다.

## 6. 운영 규칙

1. 새 UI 추가 시 순서
- Token 영향 검토 -> Primitive 재사용 가능성 확인 -> Composite 추가 -> Screen 반영

2. 컴포넌트 추가 시 필수
- 접근성 체크
- variant/size/state 정의
- 문서(`COMPONENT_GUIDE.md`) 등록

3. Breaking change
- 토큰/컴포넌트 API 변경 시 변경 이력과 마이그레이션 가이드 기록

## 7. 접근성 수용 기준

1. 색 대비
- 일반 텍스트 4.5:1 이상, 큰 텍스트 3:1 이상

2. 포커스 표시
- 키보드 포커스 아웃라인은 배경 대비가 충분해야 하며 항상 시각적으로 구분 가능해야 한다.

3. 터치 타깃
- 모바일 상호작용 요소는 최소 44x44px 권장

4. 상태 전달
- 오류/성공/로딩 상태는 색상 외 텍스트 또는 아이콘으로도 전달한다.
