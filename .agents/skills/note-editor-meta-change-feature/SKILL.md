---
name: note-editor-meta-change-feature
description: "기존 기능의 동작이나 UX를 수정할 때 사용하는 메타 skill. 사용자가 바꾸고 싶은 기능을 설명하면 기획 -> 구현 -> 디자인 리뷰 -> 코드 리뷰 -> 문서화 순서로 기존 note-editor skill을 묶어 진행한다."
---

# Note Editor Meta Change Feature

## 목적

이미 있는 기능을 수정할 때 변경 의도와 회귀 위험을 분리해서 다룬다. 현행 동작을 먼저 이해하고, 수정 범위를 잠근 뒤 구현과 리뷰, 문서 갱신까지 이어간다.

## 체인 순서

1. `$note-editor-product-planning`으로 현재 동작, 변경 목표, 유지해야 할 비범위를 정리한다.
2. `$note-editor-apply-feedback`으로 수정 구현과 필요한 테스트 갱신을 반영한다.
3. `$note-editor-design-review`로 수정된 UX가 이전보다 명확한지, 접근성이나 상태 피드백 회귀가 없는지 점검한다.
4. `$note-editor-code-review`로 회귀, 누락된 분기, 타입/상태 관리 위험을 점검한다.
5. 다시 `$note-editor-apply-feedback`으로 리뷰 결과를 반영하고 문서를 현재 동작에 맞춘다.

## 실행 규칙

1. “무엇을 바꾸는지”와 “무엇은 그대로 유지해야 하는지”를 같이 적는다.
2. 수정 전후 차이가 사용자에게 보이는 영역이면 스크린샷이나 상태 설명을 문서에 남긴다.
3. 기존 테스트가 의도에 맞지 않으면 테스트를 먼저 수정하고 구현을 맞춘다.
4. 문서화는 변경 이유, 바뀐 수용 기준, 마이그레이션성 영향이 있는지까지 포함한다.

## 기본 산출물

- 수정 전후 차이를 반영한 요구사항.
- 수정 구현과 갱신된 테스트.
- 디자인/코드 리뷰 finding 및 반영 결과.
- 갱신된 feature 문서와 테스트 계획.

## 예시 요청

- “`$note-editor-meta-change-feature`를 사용해서 노트 검색 결과 정렬 방식을 최신 편집 우선으로 바꿔줘.”
- “`$note-editor-meta-change-feature`로 기존 자동 저장 피드백 문구와 동작을 다시 설계하고 반영해줘.”
