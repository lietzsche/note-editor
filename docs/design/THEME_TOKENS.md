# THEME TOKENS

- 문서 버전: v1.0
- 작성일: 2026-04-11
- 상태: Draft

## 1. 목적

테마 관련 시각 값의 표준을 정의하고, React 컴포넌트에서 일관된 토큰 사용을 보장한다.

## 2. 토큰 운영 원칙

1. Semantic token 우선
- `color-bg-surface`, `color-text-primary` 같은 의미 기반 이름 사용

2. 하드코딩 금지
- 컴포넌트에서 hex/px 값을 직접 쓰지 않고 토큰 참조

3. 파생 포맷 정책
- 원문/관리 기준: `docs/design/tokens/design-tokens.json`
- 필요 시 빌드 단계에서 CSS 변수/TS 상수로 변환

4. 변환 계약 고정
- JSON 키 구조를 기준으로 CSS 변수명과 TS 상수명이 결정되어야 한다.

## 3. 토큰 분류

1. Color
- background / surface / text / border / feedback

2. Typography
- font-family / font-size / line-height / font-weight

3. Spacing
- 4px 기반 scale (`xs`, `sm`, `md`, `lg`, `xl`)

4. Radius & Shadow
- surface/overlay 단계별 모서리/그림자

5. Motion
- duration / easing

## 3.1 JSON -> CSS/TS 변환 계약

1. CSS 변수 네이밍
- 규칙: `--<group>-<subgroup>-<token>`
- 예: `color.bg.surface` -> `--color-bg-surface`

2. TS 상수 네이밍
- 규칙: camelCase 객체를 유지하고 최종 키는 그대로 사용
- 예: `tokens.color.bg.surface`

3. 출력 경로(권장)
- CSS 변수 파일: `src/styles/tokens.css`
- TS 상수 파일: `src/design/tokens.ts`

4. 검증 규칙
- 누락 키/중복 키가 없어야 한다.
- 변환 후 토큰 개수는 JSON 원본과 일치해야 한다.
- 변경 시 PR에서 diff와 영향 범위를 함께 기록한다.

## 4. 사용 예시

```css
:root {
  --color-bg-surface: #ffffff;
  --color-text-primary: #111111;
  --space-md: 12px;
}
```

```tsx
const style = {
  backgroundColor: "var(--color-bg-surface)",
  color: "var(--color-text-primary)",
  padding: "var(--space-md)",
};
```

## 5. 변경 관리

1. 토큰 변경은 PR 단위로 리뷰한다.
2. 시각적 영향이 큰 변경은 스크린샷/비교 기록을 첨부한다.
3. 토큰 삭제/이름 변경 시 마이그레이션 안내를 함께 제공한다.
