import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteRecipePhotoObject, getRecipePhotoUrl, uploadRecipePhoto, RecipePhotoValidationError } from "./recipe-photos";

describe("recipe photo storage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.SUPABASE_RECIPE_BUCKET = "recipe-photos";
  });

  it("uploads allowed image files inside the household namespace", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const key = await uploadRecipePhoto("household-1", new File(["photo"], "syrniki.png", { type: "image/png" }));

    expect(key).toMatch(/^households\/household-1\/recipes\/[a-f0-9-]+\.png$/);
    expect(fetchMock).toHaveBeenCalledWith(`https://project.supabase.co/storage/v1/object/recipe-photos/${key}`, {
      method: "POST",
      headers: {
        apikey: "service-role",
        authorization: "Bearer service-role",
        "content-type": "image/png",
        "x-upsert": "false"
      },
      body: expect.any(ArrayBuffer)
    });
  });

  it("rejects unsupported files before calling storage", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadRecipePhoto("household-1", new File(["plain"], "notes.txt", { type: "text/plain" }))).rejects.toBeInstanceOf(RecipePhotoValidationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates signed URLs for stored object keys", async () => {
    const fetchMock = vi.fn(async () => Response.json({ signedURL: "/storage/v1/object/sign/recipe-photos/households/household-1/recipes/photo.webp?token=abc" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getRecipePhotoUrl("households/household-1/recipes/photo.webp")).resolves.toBe("https://project.supabase.co/storage/v1/object/sign/recipe-photos/households/household-1/recipes/photo.webp?token=abc");
    expect(fetchMock).toHaveBeenCalledWith("https://project.supabase.co/storage/v1/object/sign/recipe-photos/households/household-1/recipes/photo.webp", {
      method: "POST",
      headers: {
        apikey: "service-role",
        authorization: "Bearer service-role",
        "content-type": "application/json"
      },
      body: JSON.stringify({ expiresIn: 60 * 60 * 24 * 7 })
    });
  });

  it("deletes stale objects by prefix", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await deleteRecipePhotoObject("households/household-1/recipes/old.jpg");

    expect(fetchMock).toHaveBeenCalledWith("https://project.supabase.co/storage/v1/object/recipe-photos", {
      method: "DELETE",
      headers: {
        apikey: "service-role",
        authorization: "Bearer service-role",
        "content-type": "application/json"
      },
      body: JSON.stringify({ prefixes: ["households/household-1/recipes/old.jpg"] })
    });
  });
});
