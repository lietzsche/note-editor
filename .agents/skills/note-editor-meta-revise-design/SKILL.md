---
name: note-editor-meta-revise-design
description: "디자인 수정 요청에 사용하는 메타 skill. 사용자가 화면 문제나 UX 개선 의도를 설명하면 디자인 기획 -> 구현 -> 디자인 리뷰 -> 코드 리뷰 -> 문서화 순서로 기존 note-editor skill을 묶어 진행한다."
---

# Note Editor Meta Revise Design

## 목적

디자인 수정 요청을 감으로 처리하지 않고, 의도와 해결 기준을 먼저 정리한 뒤 구현한다. 변경된 UI는 다시 디자인 관점과 코드 품질 관점에서 검토하고, 관련 문서를 맞춘다.

## 체인 순서

1. `$note-editor-design-brainstorm`으로 문제 정의, 대안, 추천 방향을 정리한다.
2. `$note-editor-apply-feedback`으로 선택된 방향을 실제 UI와 테스트에 반영한다.
3. `$note-editor-design-review`로 수정 결과를 다시 검토해 사용성, 접근성, 반응형, 상태 피드백을 점검한다.
4. `$note-editor-code-review`로 구현 품질과 회귀 위험을 점검한다.
5. 다시 `$note-editor-apply-feedback`으로 리뷰 결과와 문서 갱신을 반영한다.

## 실행 규칙

1. 디자인 기획 단계에서는 최소 2개 이상의 방향을 비교하고 선택 이유를 남긴다.
2. 구현 단계에서는 기존 디자인 시스템과 충돌하는지 먼저 확인한다.
3. 디자인 리뷰에서 심각한 접근성 문제가 나오면 문서화 전에 반영한다.
4. 코드 리뷰는 시각 결과뿐 아니라 상태 관리, 반응형 분기, CSS 영향 범위를 같이 본다.
5. 문서화는 바뀐 UX 흐름, 빈 상태, 피드백 상태, QA 포인트를 남긴다.

## 기본 산출물

- 디자인 문제 정의와 선택된 방향.
- UI 구현과 관련 테스트.
- 디자인/코드 리뷰 finding 및 반영 결과.
- 갱신된 기능 문서와 테스트 계획.

## 예시 요청

- “`$note-editor-meta-revise-design`를 사용해서 노트 편집 화면의 저장 상태 피드백을 다시 설계하고 반영해줘.”
- “`$note-editor-meta-revise-design`로 모바일 그룹 전환 UI를 개선하는 작업을 기획부터 문서화까지 진행해줘.”
