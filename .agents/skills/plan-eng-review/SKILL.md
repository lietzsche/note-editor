---
name: plan-eng-review
description: Review an engineering plan before implementation. Use when the user asks for architecture review, technical review, implementation plan review, data flow review, risk assessment, edge cases, testing strategy, or to lock in a plan before coding.
---

# Plan Engineering Review

Use this skill to review a proposed implementation plan before code is written.

## Workflow

1. Restate the plan in concrete implementation terms.
2. Identify affected systems, files, data flow, APIs, persistence, UI state, tests, and deployment concerns.
3. Check for missing requirements, ambiguous behavior, hidden coupling, migration risk, security concerns, and performance issues.
4. Recommend a safer or simpler approach when the current plan is too broad or fragile.
5. Produce a sequenced implementation plan with validation steps.

## Review Criteria

- The user-visible behavior is clear.
- Data ownership and state transitions are explicit.
- API contracts and error cases are defined.
- Database changes are backward-compatible or have a migration strategy.
- Auth, authorization, and trust boundaries are preserved.
- Concurrency, stale data, retries, and conflict cases are considered.
- Tests cover the behavior at the right level.
- Rollout and rollback risks are understood.

## Output Format

Start with blocking concerns, then non-blocking improvements, then the recommended plan.

Use this structure:

- Verdict: proceed, proceed with changes, or do not proceed yet.
- Blocking issues: concrete issues that should be fixed before implementation.
- Recommendations: specific changes to the plan.
- Implementation sequence: ordered steps.
- Verification: commands, tests, and manual checks.

## Repository Guidance

For this repo:

- Frontend app code lives in `src`.
- Page orchestration belongs in `src/pages`.
- Reusable components belong in `src/components`.
- Pure logic belongs in `src/lib`.
- API code lives in `functions/api`.
- API helpers live in `functions/api/_lib`.
- D1 changes belong in `migrations`.
- Prefer adding tests in `tests` before or alongside risky behavior changes.

Use `npm run typecheck`, focused Vitest tests, and `npm run verify` for broad changes.
