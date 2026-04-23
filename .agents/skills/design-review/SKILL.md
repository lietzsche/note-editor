---
name: design-review
description: Review frontend UI design quality and propose concrete improvements. Use when the user asks for design review, visual QA, UI polish, layout critique, responsive design review, accessibility polish, or to detect AI-generated looking UI patterns.
---

# Design Review

Use this skill to audit a frontend UI like a product designer and pragmatic frontend engineer.

## Workflow

1. Identify the product surface under review: app UI, marketing page, hybrid, component, or design plan.
2. Inspect the rendered behavior when possible. If browser access is unavailable, inspect the relevant source and clearly label findings as source-based.
3. Evaluate visual hierarchy, spacing, typography, color system, responsiveness, accessibility, interaction states, and perceived polish.
4. Prioritize findings by user impact: critical, high, medium, polish.
5. Recommend specific fixes. If asked to implement, make minimal changes and verify with typecheck/tests or a build when relevant.

## Review Criteria

- First screen communicates the product and primary action clearly.
- Layout has an intentional hierarchy, not generic stacked cards.
- Spacing follows a system instead of arbitrary one-off values.
- Typography is purposeful, readable, and not just a default stack unless the project design system requires it.
- Color uses a coherent token/system, with sufficient contrast.
- Mobile layout is designed for the task, not just stacked desktop content.
- Interactive states are visible: hover, focus, loading, disabled, empty, error.
- Forms use visible labels and accessible focus behavior.
- Motion, if present, improves orientation or hierarchy.

## AI Slop Checks

Flag these when they appear:

- Purple/blue gradient SaaS default look with no product-specific reason.
- Symmetric three-card feature grids with icon circles and generic copy.
- Every element has the same large rounded radius.
- Decorative blobs, floating circles, or ornamental shapes used to fill empty space.
- Centered everything with weak information hierarchy.
- Generic copy such as "unlock the power" or "all-in-one solution".
- Cards used only as decoration instead of a meaningful interaction or grouping.

## Output Format

Start with findings, ordered by severity. Include file or component references when source was inspected.

For each finding, include:

- Severity
- Evidence
- Why it matters
- Specific fix

End with quick wins: 3 to 5 changes that are likely high impact and low effort.

## Implementation Rules

- Preserve the existing product direction and design system unless the user asks for a redesign.
- Prefer CSS/token/layout changes before structural rewrites.
- Do not introduce new design libraries unless explicitly requested.
- For this repo, keep page orchestration in `src/pages`, reusable UI in `src/components`, pure logic in `src/lib`, and shared styles/tokens in `src/styles`.
- Run `npm run typecheck` after code changes when practical.
