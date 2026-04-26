---
name: note-editor-meta-new-project-delivery
description: "새로운 프로젝트나 큰 기능 축을 처음 시작할 때 사용하는 메타 skill. 사용자가 스펙, 기획 의도, 목표 사용자, 핵심 시나리오를 주입하면 기획 -> 구현 -> 디자인 리뷰 -> 코드 리뷰 -> 문서화 순서로 기존 note-editor skill을 묶어 진행한다."
---

# Note Editor Meta New Project Delivery

## 목적

새로운 프로젝트 또는 아직 구현 기반이 없는 큰 기능을 시작점부터 끝까지 밀어붙인다. 요구사항만 받은 상태에서 제품 관점의 정리, 첫 구현, UI 검토, 코드 품질 검토, 문서 동기화까지 한 흐름으로 연결한다.

## 체인 순서

1. `$note-editor-product-planning`으로 요구사항, 범위, 수용 기준을 정리한다.
2. `$note-editor-apply-feedback`으로 확정된 범위를 코드, 테스트, 문서 초안에 반영하며 첫 구현을 만든다.
3. `$note-editor-design-review`로 구현된 UI의 사용성, 접근성, 반응형, 상태 피드백을 점검한다.
4. `$note-editor-code-review`로 버그, 회귀 위험, 보안, 테스트 누락을 점검한다.
5. 다시 `$note-editor-apply-feedback`으로 디자인/코드 리뷰 결과를 반영하고 FEATURE, TEST_PLAN, 운영 문서를 마무리한다.

## 실행 규칙

1. 기획 단계에서는 문제 정의와 비범위를 먼저 잠근다.
2. 구현 단계에서는 최소 동작 경로를 먼저 만들고, 이후 확장 범위를 붙인다.
3. 디자인 리뷰와 코드 리뷰는 구현 완료 후 독립 단계로 취급한다.
4. 리뷰에서 High/Medium 이슈가 나오면 문서화 전에 반영한다.
5. 문서화는 현재 동작과 테스트 기준이 어긋나지 않게 `docs/`, 관련 feature 문서, `docs/testing/TEST_PLAN.md`를 함께 본다.
6. 요청이 분석 전용이면 구현 단계 전에서 멈추고 코드 변경을 하지 않는다.

## 기본 산출물

- 요구사항, 비범위, 수용 기준.
- 구현 코드와 필요한 테스트.
- 디자인 리뷰 finding과 반영 결과.
- 코드 리뷰 finding과 반영 결과.
- 갱신된 기능 문서와 테스트 계획.

## 예시 요청

- “`$note-editor-meta-new-project-delivery`를 사용해서 새 노트 공유 프로젝트의 스펙을 기획부터 구현, 리뷰, 문서화까지 진행해줘.”
- “`$note-editor-meta-new-project-delivery`로 오프라인 우선 편집 기능의 제품 의도와 핵심 시나리오를 주입할 테니 끝까지 정리해줘.”
