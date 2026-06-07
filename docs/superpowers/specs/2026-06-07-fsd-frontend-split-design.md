# FSD Frontend Split Design

## Goal

Restructure the frontend part of the Telegram Mini App according to Feature-Sliced Design while preserving current behavior, tests, API routes, Server Actions, and backend service modules.

## Scope

This is an incremental frontend-only migration. The existing Next.js App Router files stay in `src/app`, and backend/domain service files stay in `src/lib`. The UI currently concentrated in `src/app/mini-app-client.tsx` will be split across FSD layers:

- `src/frontend/pages/mini-app` for the page composition.
- `src/widgets/*` for large standalone UI blocks.
- `src/features/*` for user interactions that mutate product state.
- `src/entities/*` for business entity UI and model types.
- `src/shared/*` for business-agnostic UI/lib utilities.

## Architecture

`src/app/mini-app.tsx` remains the server shell and imports only the page public API from `src/frontend/pages/mini-app`. `src/app/page.tsx`, API routes, and Server Actions stay unchanged except for imports if needed. The client page component owns cross-widget orchestration and calls Server Actions directly because those actions are still part of the Next app boundary.

The import direction follows FSD: app -> pages -> widgets -> features -> entities -> shared. Shared has no business slices. Each slice exposes an `index.ts` public API; external imports should use public APIs rather than deep internal paths.

## Proposed Slices

- `frontend/pages/mini-app/ui/mini-app-page.tsx`: client page composition, Telegram bootstrap, URL state, high-level state orchestration.
- `widgets/app-header/ui/app-header.tsx`: header metrics and family screen entry button.
- `widgets/section-tabs/ui/section-tabs.tsx`: tab navigation.
- `widgets/family-panel/ui/family-panel.tsx`: household/family screen.
- `widgets/recipes-panel/ui/recipes-panel.tsx`: recipe list and demo highlights.
- `widgets/week-panel/ui/week-panel.tsx`: week planner layout.
- `widgets/shop-panel/ui/shop-panel.tsx`: shopping list layout.
- `features/create-recipe/ui/create-recipe-form.tsx`: recipe creation form.
- `features/manage-meal-plan/ui/meal-slot-section.tsx`: meal add/update/remove controls.
- `features/manage-shopping-list/ui/manual-shopping-form.tsx`: manual shopping item form.
- `features/toggle-shopping-item/ui/shopping-list-row.tsx`: checked-state control for one shopping row.
- `entities/recipe`, `entities/meal-plan`, `entities/shopping-list`, `entities/household`: shared frontend model types and presentational UI where useful.
- `shared/ui/metric`, `shared/lib/url-state`, `shared/lib/telegram-launch`, `shared/lib/product-key`: reusable UI and pure helpers.

## Testing

Add architecture tests that verify:

- `src/app/mini-app.tsx` stays a Server Component wrapper.
- `src/frontend/pages/mini-app` has the client page entry.
- FSD slices expose public APIs through `index.ts`.
- No feature/widget/entity imports from higher layers.

Existing MiniApp behavior tests should keep passing after import updates. Final verification remains:

```bash
npm test
npm run build
```

## Constraints

No dependency upgrade is planned. React 18-compatible lightweight state patterns remain in use. This task does not change product behavior, persistence behavior, Prisma schema, API contracts, or visual design.
