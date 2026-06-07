import { describe, expect, it, vi } from "vitest";

import { createRecipe, deleteRecipe, listRecipes, RecipeValidationError } from "./recipes";

type FakeRecipe = {
  id: string;
  householdId: string;
  title: string;
  instructions: string;
  servings: number;
  photoObjectKey: string | null;
  createdAt: Date;
};

type FakeIngredient = {
  id: string;
  recipeId: string;
  productId: string | null;
  name: string;
  quantity: number;
  unit: string;
  sortOrder: number;
};

type FakeProduct = {
  id: string;
  householdId: string;
  name: string;
  normalizedName: string;
  defaultUnit: string;
};

describe("recipes service", () => {
  it("lists only recipes from the requested household", async () => {
    const client = createFakeRecipeClient();
    await createRecipe("household-1", validRecipeInput("Сырники"), client);
    await createRecipe("household-2", validRecipeInput("Паста"), client);

    const recipes = await listRecipes("household-1", client);

    expect(recipes).toHaveLength(1);
    expect(recipes[0]).toMatchObject({
      title: "Сырники",
      ingredients: [{ name: "Творог", quantity: 400, unit: "г" }]
    });
  });

  it("creates a recipe with normalized products and ingredients", async () => {
    const client = createFakeRecipeClient();

    const recipe = await createRecipe("household-1", validRecipeInput(" Сырники "), client);

    expect(recipe).toMatchObject({
      id: "recipe-1",
      title: "Сырники",
      instructions: "Смешать и обжарить.",
      servings: 2,
      ingredients: [
        {
          productId: "product-1",
          name: "Творог",
          quantity: 400,
          unit: "г"
        }
      ]
    });
    expect(client.state.products[0].normalizedName).toBe("tvorog");
  });

  it("rejects invalid recipe input", async () => {
    const client = createFakeRecipeClient();

    await expect(createRecipe("household-1", { title: "", instructions: "", ingredients: [] }, client)).rejects.toBeInstanceOf(RecipeValidationError);
  });

  it("deletes only recipes from the requested household", async () => {
    const client = createFakeRecipeClient();
    await createRecipe("household-1", validRecipeInput("Сырники"), client);
    await createRecipe("household-2", validRecipeInput("Паста"), client);

    await expect(deleteRecipe("household-2", "recipe-1", client)).resolves.toBe(false);
    await expect(deleteRecipe("household-1", "recipe-1", client)).resolves.toBe(true);
    await expect(listRecipes("household-1", client)).resolves.toEqual([]);
    await expect(listRecipes("household-2", client)).resolves.toHaveLength(1);
  });
});

function validRecipeInput(title: string) {
  return {
    title,
    instructions: "Смешать и обжарить.",
    ingredients: [{ name: "Творог", quantity: 400, unit: "г" }]
  };
}

function createFakeRecipeClient() {
  const state = {
    recipes: [] as FakeRecipe[],
    ingredients: [] as FakeIngredient[],
    products: [] as FakeProduct[]
  };

  const client = {
    state,
    recipe: {
      findMany: vi.fn(async ({ where }: { where: { householdId: string } }) =>
        state.recipes
          .filter((recipe) => recipe.householdId === where.householdId)
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .map((recipe) => ({
            ...recipe,
            ingredients: state.ingredients.filter((ingredient) => ingredient.recipeId === recipe.id).sort((left, right) => left.sortOrder - right.sortOrder)
          }))
      ),
      create: vi.fn(async ({ data }: { data: { householdId: string; title: string; instructions: string; servings: number } }) => {
        const recipe = {
          id: `recipe-${state.recipes.length + 1}`,
          householdId: data.householdId,
          title: data.title,
          instructions: data.instructions,
          servings: data.servings,
          photoObjectKey: null,
          createdAt: new Date(Date.UTC(2026, 5, 7, 12, state.recipes.length))
        };
        state.recipes.push(recipe);
        return recipe;
      }),
      deleteMany: vi.fn(async ({ where }: { where: { id: string; householdId: string } }) => {
        const before = state.recipes.length;
        state.recipes = state.recipes.filter((recipe) => recipe.id !== where.id || recipe.householdId !== where.householdId);
        state.ingredients = state.ingredients.filter((ingredient) => state.recipes.some((recipe) => recipe.id === ingredient.recipeId));
        return { count: before - state.recipes.length };
      })
    },
    product: {
      upsert: vi.fn(async ({ where, update, create }: { where: { householdId_normalizedName: { householdId: string; normalizedName: string } }; update: { name: string; defaultUnit: string }; create: Omit<FakeProduct, "id"> }) => {
        const existing = state.products.find((product) => product.householdId === where.householdId_normalizedName.householdId && product.normalizedName === where.householdId_normalizedName.normalizedName);

        if (existing) {
          Object.assign(existing, update);
          return existing;
        }

        const product = {
          id: `product-${state.products.length + 1}`,
          ...create
        };
        state.products.push(product);
        return product;
      })
    },
    recipeIngredient: {
      create: vi.fn(async ({ data }: { data: Omit<FakeIngredient, "id"> }) => {
        const ingredient = {
          id: `ingredient-${state.ingredients.length + 1}`,
          ...data
        };
        state.ingredients.push(ingredient);
        return ingredient;
      })
    },
    $transaction: vi.fn(async (callback: (transaction: typeof client) => Promise<unknown>) => callback(client))
  };

  return client as never;
}
