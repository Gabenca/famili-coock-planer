# AGENTS.md Strict Compliance Plan

## Summary

Bring the project into strict compliance with the updated `AGENTS.md` rules: zod validation at API boundaries, URL-backed navigation state, Server Components by default, native forms with Server Actions, optimistic UI for shopping and meal planning, and Tailwind/theme cleanup without arbitrary classes or unsafe viewport sizing.

Keep the current product behavior intact: browser demo mode remains usable, Telegram auth/household/invites keep working, and backend persistence continues to use the existing Prisma schema without migrations.

## Execution Status

Completed in isolated worktree `/tmp/codex-test-app-agents-compliance` on branch `agents-strict-compliance`.

- Validation first: completed.
- Session and server data: completed.
- RSC/client split: completed with server shell and client leaf.
- URL state: completed.
- Server Actions and optimistic UI: completed with compatible React 18 patterns.
- Styling compliance: completed.
- Final verification: `npm test` and `npm run build` passed.

React 18.3.1 in this project does not export `useActionState`, `useFormStatus`, or `useOptimistic`; native forms and lightweight optimistic state were used instead without upgrading the stack declared in `AGENTS.md`.

## Key Changes

- Add shared zod schemas for recipe creation, meal plan creation/update, shopping manual items/check state, auth body, and `weekStart`.
- Parse all route input before calling domain services; invalid input returns `400`, not `500`.
- Add a signed Telegram session cookie after successful `/api/auth/telegram` bootstrap.
- Let Server Components and Server Actions read the cookie to resolve household session while preserving existing API `Authorization: tma ...` support.
- Replace local tab/family state with URL params: `?tab=recipes|week|shop`, default `recipes`, and `?screen=family`.
- Refactor the app entry into a server-rendered shell with leaf-level client components for Telegram bootstrap, forms, controls, and optimistic widgets.
- Convert recipe create, meal plan add/update/delete, manual shopping add, shopping check toggle, and invite create to native forms and Server Actions.
- Use `useActionState`/`useFormStatus` for form state and `useOptimistic` for shopping check toggles and meal-plan mutations.
- Replace arbitrary Tailwind classes and unsafe viewport sizing with standard scale classes, named utilities, or theme tokens.

## Implementation Steps

1. **Validation first**
   - Add shared zod schemas.
   - Update API routes to parse request bodies and query params before service calls.
   - Keep domain service validation as a defensive second layer.

2. **Session and server data**
   - Add signed cookie helpers.
   - Update the Telegram auth route to set the cookie after verified bootstrap.
   - Add server-side data loading for household, members, recipes, week plan, and shopping list.
   - Keep demo data as the fallback when no authenticated session exists.

3. **RSC/client split**
   - Make the app entry a Server Component shell.
   - Move Telegram launch detection into a small client bootstrap component.
   - Move interactive widgets into leaf client components receiving server-loaded data as props.

4. **URL state**
   - Replace `activeTab` and `familyOpen` local state with search params.
   - Preserve the Telegram launch hash when updating query params.
   - Add tests for default tab, direct `?tab=shop`, tab click URL updates, and family screen URL.

5. **Server Actions and optimistic UI**
   - Add action handlers for all UI mutations.
   - Convert recipe, shopping, meal-plan, and invite controls to native forms.
   - Add optimistic state for checked shopping items and meal-plan changes, with visible error handling on failure.

6. **Styling compliance**
   - Replace arbitrary Tailwind values such as `rounded-[8px]`, `grid-cols-[...]`, `max-w-[560px]`, and `pt-[max(...)]`.
   - Replace `min-h-screen` with mobile-safe sizing.
   - Move reusable nonstandard layout needs into named CSS utilities under `@layer utilities`.

## Test Plan

- Add zod/API boundary tests:
  - invalid recipe body returns `400` and does not call Prisma service;
  - invalid meal plan and shopping payloads return `400`;
  - valid payloads still reach existing services.
- Update MiniApp tests:
  - URL-driven tabs and family screen;
  - Telegram bootstrap sets session then refreshes server data;
  - native forms submit through Server Actions or their compatible test seams;
  - optimistic shopping toggle updates immediately and recovers on failure;
  - optimistic meal-plan changes update the visible week and shopping totals.
- Keep existing domain tests for recipes, meal plans, shopping aggregation, Telegram auth, and households.
- Run final verification:
  - `npm test`
  - `npm run build`

## Assumptions

- Strict mode is selected: all findings are in scope, including the Server Actions/RSC refactor.
- No Prisma schema migration is needed.
- Existing API endpoints stay available; Server Actions become the primary UI mutation path.
- Recipe photo upload remains out of scope; client preview behavior is preserved.
- The current demo week start remains the default week anchor until a separate real calendar feature is added.
