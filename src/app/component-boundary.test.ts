import { readFileSync } from "fs";
import { join } from "path";

import { describe, expect, it } from "vitest";

const appDir = join(process.cwd(), "src/app");

describe("component boundaries", () => {
  it("keeps the public mini app entry as a server component wrapper", () => {
    const publicEntry = readFileSync(join(appDir, "mini-app.tsx"), "utf8");
    const clientEntry = readFileSync(join(process.cwd(), "src/frontend/pages/mini-app/ui/mini-app-page.tsx"), "utf8");
    const modelStore = readFileSync(join(process.cwd(), "src/frontend/pages/mini-app/model/store.ts"), "utf8");
    const modelWorkflows = readFileSync(join(process.cwd(), "src/frontend/pages/mini-app/model/workflows.ts"), "utf8");

    expect(publicEntry.startsWith('"use client";')).toBe(false);
    expect(clientEntry.startsWith('"use client";')).toBe(true);
    expect(modelStore).toContain("zustand");
    expect(modelWorkflows).toContain("@/app/actions");
  });
});
