# Zustand Mini App Refactor Design

## Scope

Refactor the Mini App client architecture to use Zustand for page-level application state while preserving the current user experience and backend contracts.

The refactor covers the client Mini App page, its state model, async client workflows, selectors, and related tests. It does not add new backend persistence, change Prisma models, change API ownership rules, or redesign the UI.

## Goals

- Move the main client state out of `src/frontend/pages/mini-app/ui/mini-app-page.tsx`.
- Keep `src/app/mini-app.tsx` as a Server Component wrapper that loads initial data and renders the FSD page.
- Use one page-level Zustand store for Mini App state.
- Keep async orchestration separate from sync store reducers.
- Preserve demo mode, Telegram auth, household loading, invite creation, recipe creation, weekly planning, shopping list generation, manual shopping items, checked state, and current optimistic behavior.
- Keep URL search params as the source of truth for the active tab and family screen.
- Keep widgets mostly presentational and compatible with the current props-driven structure.

## Non-Goals

- No new end-to-end backend persistence beyond what already exists.
- No UI redesign.
- No migration from server actions to API routes or from API routes to server actions.
- No broad domain rewrite of `src/lib/*`.
- No multi-store framework unless the current implementation proves one page-level store is insufficient.

## Architecture

Add a model layer under the Mini App page:

- `src/frontend/pages/mini-app/model/types.ts`
  - Owns page-level client contracts such as `AuthState`, `InviteStatus`, `MiniAppInitialData`, and workflow dependency types.
- `src/frontend/pages/mini-app/model/store.ts`
  - Creates the Zustand store.
  - Stores Mini App client state.
  - Exposes sync reducers for state transitions.
- `src/frontend/pages/mini-app/model/selectors.ts`
  - Exposes derived state such as resolved shopping items, counters, and demo flags when those values should not be persisted directly in the store.
- `src/frontend/pages/mini-app/model/workflows.ts`
  - Owns async client workflows: Telegram bootstrap, household data load, invite creation, recipe creation, meal plan mutations, manual shopping mutations, and shopping checked-state mutation.
  - Calls existing API routes and server actions.
  - Applies optimistic updates and rollback through store reducers.

`src/frontend/pages/mini-app/ui/mini-app-page.tsx` becomes a wiring component:

- initializes the store from `initialData`;
- starts Telegram bootstrap on first mount;
- synchronizes URL popstate into local URL-derived state;
- reads selected store state through Zustand selectors;
- passes props to widgets;
- delegates mutations to workflows.

The public page API remains `src/frontend/pages/mini-app/index.ts`.

## State Model

The store owns:

- `authState`
- `dataLoading`
- `dataError`
- `inviteMessage`
- `inviteUrl`
- `inviteLoading`
- `householdMembers`
- `recipes`
- `planItems`
- `checkedKeys`
- `extraItems`
- `extraName`
- `extraQuantity`
- `extraUnit`
- `remoteShoppingItems`

The store does not own the canonical active tab or family screen route. Those remain URL-backed. The page may keep small local values derived from `readActiveTabFromUrl()` and `readFamilyOpenFromUrl()` so rendering updates immediately after `popstate`.

Resolved shopping items are derived from:

- remote shopping items when authenticated data is available;
- otherwise `buildShoppingList({ recipes, planItems, manualItems, checkedKeys })`.

## Data Flow

On render, `MiniAppPage` initializes the store:

- with server `initialData` when available;
- otherwise with demo recipes, demo plan, demo manual items, and demo checked keys.

On mount, the Telegram bootstrap workflow reads launch params:

1. If no Telegram `initData` exists and there is no server `initialData`, switch to demo auth state.
2. If server `initialData` exists and no Telegram `initData` exists, keep the server-loaded ready state.
3. If Telegram `initData` exists, call `/api/auth/telegram`.
4. On successful auth, clear demo client data and switch to authenticated empty state.
5. Load household members, recipes, meal plan, and shopping list in parallel from existing API routes.
6. Map loaded shopping items into `remoteShoppingItems`, `checkedKeys`, and manual item form backing data.

Server actions remain the mutation surface:

- `createInviteAction`
- `createRecipeAction`
- `createMealPlanItemAction`
- `updateMealPlanItemAction`
- `deleteMealPlanItemAction`
- `createManualShoppingItemAction`
- `updateShoppingCheckStateAction`

After authenticated mutations that affect generated shopping data, the workflow reloads `/api/shopping-list`.

## Optimistic Behavior

The current optimistic behavior is preserved:

- shopping checked-state updates immediately and rolls back on failure;
- meal plan add creates a temporary item and replaces or removes it after the server action;
- meal plan servings update changes immediately and rolls back to the previous item on failure;
- meal plan delete removes immediately and restores the item on failure;
- local demo mutations update client state without server calls.

Manual shopping quantity changes in authenticated mode keep the current behavior: they update the visible remote shopping item locally but do not add new backend persistence behavior.

## Engineering Principles Application

- **Single Responsibility:** store handles state and sync reducers; workflows handle async orchestration; domain rules remain in `src/lib/*`; widgets render UI.
- **KISS:** one page-level store is enough for the current MVP and avoids slice infrastructure that would not yet pay for itself.
- **YAGNI:** no speculative cross-page store, cache layer, or persistence plugin.
- **Separation of Concerns:** UI rendering, store transitions, async workflows, validation, server actions, and Prisma access stay in separate layers.
- **Explicit Contracts:** page model types document state, dependencies, and workflow inputs.
- **Testability:** workflows accept dependencies or use a small adapter so tests can mock fetch, server actions, clipboard, and launch params without rendering React.
- **Least Privilege:** the client still does not pass household IDs or ownership claims; server actions and API routes continue to derive household access from the authenticated session.

## Testing

Keep existing DOM tests for user-facing behavior:

- first-screen demo content;
- family screen;
- URL tab and family screen params;
- Telegram auth bootstrap;
- authenticated empty state;
- household data loading;
- invite creation;
- recipe creation;
- meal plan changes;
- shopping list changes.

Keep boundary tests:

- `src/app/mini-app.tsx` remains a Server Component wrapper;
- `src/frontend/pages/mini-app/ui/mini-app-page.tsx` remains the client entry;
- FSD public APIs remain present.

Add focused model tests where they reduce DOM test weight:

- initial store state from demo data;
- initial store state from server data;
- shopping item selector for demo and remote modes;
- authenticated data load mapping;
- optimistic rollback for one meal plan mutation;
- optimistic rollback for shopping checked-state mutation.

## Acceptance Criteria

- `npm test` passes.
- `npm run build` passes when the configured database/migration environment is available.
- `src/app/mini-app.tsx` remains server-only.
- Mini App behavior remains equivalent to the current tests and UX.
- `MiniAppPage` no longer owns the bulk of the application state through many local `useState` calls.
- Zustand is used for the Mini App page application state, with async workflows separated from sync reducers.
