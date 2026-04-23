---
name: review
description: Perform a code review focused on bugs, regressions, security risks, data correctness, missing tests, and maintainability. Use when the user asks to review a PR, review a diff, check changes before merging, or find issues in the current code.
---

# Code Review

Use this skill for review-mode work. Findings are the primary output.

## Workflow

1. Inspect the diff or relevant files.
2. Understand intended behavior from code, tests, docs, and user context.
3. Look for correctness bugs, regressions, security issues, data loss, race conditions, API contract breaks, and missing tests.
4. Verify suspicious behavior against nearby code instead of guessing.
5. Report findings first, ordered by severity, with precise file references.

## Finding Criteria

Prioritize issues that could break production behavior or developer workflow:

- Data loss, auth bypass, privilege escalation, secret leakage.
- Broken API contracts or incompatible schema/migration behavior.
- State bugs, stale cache bugs, concurrency issues, autosave conflicts.
- UI behavior regressions that block core user tasks.
- Missing tests for changed critical behavior.
- Flaky or misleading tests.

Avoid low-signal style comments unless they hide a real bug or maintainability risk.

## Output Format

If findings exist, list them first:

- Severity
- File and line
- Problem
- Impact
- Suggested fix

Then include open questions or assumptions.

If no findings are found, say that explicitly and mention residual risks or unrun tests.

## Repository Guidance

For this repo:

- Frontend app code lives in `src`.
- Cloudflare Functions API code lives in `functions/api`.
- D1 migrations live in `migrations`.
- Unit and React tests live in `tests`.
- API integration tests live in `tests/api`.

Useful commands:

```bash
npm run typecheck
npm run test:unit
npm run test:integration
npm run verify
```
