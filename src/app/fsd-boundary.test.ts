import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { describe, expect, it } from "vitest";

const srcDir = join(process.cwd(), "src");

describe("FSD frontend structure", () => {
  it("exposes public APIs for the Mini App page and frontend slices", () => {
    const publicApis = [
      "frontend/pages/mini-app/index.ts",
      "frontend/pages/mini-app/model/index.ts",
      "widgets/app-header/index.ts",
      "widgets/section-tabs/index.ts",
      "widgets/family-panel/index.ts",
      "widgets/recipes-panel/index.ts",
      "widgets/week-panel/index.ts",
      "widgets/shop-panel/index.ts",
      "features/create-recipe/index.ts",
      "features/manage-meal-plan/index.ts",
      "features/manage-shopping-list/index.ts",
      "features/toggle-shopping-item/index.ts",
      "entities/recipe/index.ts",
      "entities/meal-plan/index.ts",
      "entities/shopping-list/index.ts",
      "entities/household/index.ts"
    ];

    for (const publicApi of publicApis) {
      expect(existsSync(join(srcDir, publicApi)), publicApi).toBe(true);
    }
  });

  it("keeps the Next app entry as a server wrapper over the FSD page", () => {
    const miniAppEntry = readFileSync(join(srcDir, "app/mini-app.tsx"), "utf8");

    expect(miniAppEntry.startsWith('"use client";')).toBe(false);
    expect(miniAppEntry).toContain('from "@/frontend/pages/mini-app"');
  });
});
