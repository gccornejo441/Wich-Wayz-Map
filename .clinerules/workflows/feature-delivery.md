# Wich Wayz Feature Delivery Workflow

Use this workflow for frontend, backend API, or full-stack feature changes in Wich-Wayz-Map.

## 1. Intake and scope

- Restate the request in one short paragraph.
- Identify impact areas before editing: `src/components`, `src/context`, `src/services`, `api`, `test`.
- If requirements are ambiguous, ask one clarifying question before implementation.

## 2. Gather context first

- Read `AGENTS.md` and mirror existing local patterns from nearby files.
- Prefer project path aliases (for example `@components/`, `@services/`) over relative imports.
- Reuse existing validation schemas and context hooks when possible.

## 3. Implement with project constraints

- Keep changes focused and minimal.
- Follow naming conventions in `AGENTS.md`.
- Add try/catch to async service and API logic with user-friendly error messages.
- Do not introduce `console.log`; use `console.error` or `console.warn` only where needed.
- For DB queries, use parameterized statements.

## 4. Add or update tests

- Add or update tests under `test/` mirroring source structure.
- For UI behavior, use Testing Library patterns already used in the repo.
- Cover happy path plus at least one failure or edge case for changed logic.

## 5. Validate before handoff

Run these checks in order and fix failures before continuing:

<execute_command>
<command>npm run lint</command>
</execute_command>

<execute_command>
<command>npm test</command>
</execute_command>

<execute_command>
<command>npm run build</command>
</execute_command>

For large or release-critical changes, also run:

<execute_command>
<command>npm run ci</command>
</execute_command>

## 6. Final delivery format

Provide:

- What changed and why (short summary)
- Files touched and key behavior changes
- Validation results (lint, tests, build)
- Any follow-up risks, TODOs, or missing env/setup needed to run fully
