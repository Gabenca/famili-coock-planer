import { prisma } from "./prisma";
import { deleteRecipePhotoObject, getRecipePhotoUrl, uploadRecipePhoto } from "./recipe-photos";

export type RecipeInput = {
  title: string;
  instructions: string;
  sourceUrl?: string;
  photoObjectKey?: string;
  servings?: number;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
};

type RecipeClient = typeof prisma;

export class RecipeValidationError extends Error {
  constructor(message = "Invalid recipe input") {
    super(message);
    this.name = "RecipeValidationError";
  }
}

export async function listRecipes(householdId: string, client: RecipeClient = prisma) {
  const recipes = await client.recipe.findMany({
    where: {
      householdId
    },
    include: {
      ingredients: {
        orderBy: {
          sortOrder: "asc"
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return Promise.all(recipes.map(formatRecipe));
}

export async function createRecipe(householdId: string, input: RecipeInput, client: RecipeClient = prisma) {
  const recipe = normalizeRecipeInput(input);

  return client.$transaction(async (transaction) => {
    const createdRecipe = await transaction.recipe.create({
      data: {
        householdId,
        title: recipe.title,
        instructions: recipe.instructions,
        sourceUrl: recipe.sourceUrl ?? null,
        photoObjectKey: recipe.photoObjectKey ?? null,
        servings: recipe.servings
      }
    });

    const ingredients = await Promise.all(
      recipe.ingredients.map(async (ingredient, index) => {
        const product = await transaction.product.upsert({
          where: {
            householdId_normalizedName: {
              householdId,
              normalizedName: normalizeProductName(ingredient.name)
            }
          },
          update: {
            name: ingredient.name,
            defaultUnit: ingredient.unit
          },
          create: {
            householdId,
            name: ingredient.name,
            normalizedName: normalizeProductName(ingredient.name),
            defaultUnit: ingredient.unit
          }
        });

        return transaction.recipeIngredient.create({
          data: {
            recipeId: createdRecipe.id,
            productId: product.id,
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            sortOrder: index
          }
        });
      })
    );

    return formatRecipe({
      ...createdRecipe,
      ingredients
    });
  });
}

export async function deleteRecipe(householdId: string, recipeId: string, client: RecipeClient = prisma) {
  const deleted = await client.recipe.deleteMany({
    where: {
      id: recipeId,
      householdId
    }
  });

  return deleted.count > 0;
}

export async function updateRecipePhoto(householdId: string, recipeId: string, file: File, client: RecipeClient = prisma) {
  const recipe = await client.recipe.findFirst({
    where: {
      id: recipeId,
      householdId
    },
    include: {
      ingredients: {
        orderBy: {
          sortOrder: "asc"
        }
      }
    }
  });

  if (!recipe) {
    return null;
  }

  const nextObjectKey = await uploadRecipePhoto(householdId, file);
  const updatedRecipe = await client.recipe.update({
    where: {
      id: recipe.id
    },
    data: {
      photoObjectKey: nextObjectKey
    },
    include: {
      ingredients: {
        orderBy: {
          sortOrder: "asc"
        }
      }
    }
  });

  if (recipe.photoObjectKey) {
    try {
      await deleteRecipePhotoObject(recipe.photoObjectKey);
    } catch {
      // Replacing the visible recipe photo should not fail because stale cleanup failed.
    }
  }

  return formatRecipe(updatedRecipe);
}

function normalizeRecipeInput(input: RecipeInput) {
  const title = input.title.trim();
  const instructions = input.instructions.trim();
  const sourceUrl = input.sourceUrl?.trim();
  const photoObjectKey = input.photoObjectKey?.trim();
  const servings = input.servings ?? 2;
  const ingredients = input.ingredients
    .map((ingredient) => ({
      name: ingredient.name.trim(),
      quantity: ingredient.quantity,
      unit: ingredient.unit.trim()
    }))
    .filter((ingredient) => ingredient.name && ingredient.unit && Number.isFinite(ingredient.quantity) && ingredient.quantity > 0);

  if (!title || !instructions || !Number.isInteger(servings) || servings <= 0 || ingredients.length === 0) {
    throw new RecipeValidationError();
  }

  return {
    title,
    instructions,
    sourceUrl: sourceUrl || undefined,
    photoObjectKey: photoObjectKey || undefined,
    servings,
    ingredients
  };
}

async function formatRecipe(recipe: {
  id: string;
  title: string;
  instructions: string;
  servings: number;
  photoObjectKey: string | null;
  sourceUrl: string | null;
  ingredients: Array<{
    productId: string | null;
    name: string;
    quantity: number;
    unit: string;
  }>;
}) {
  return {
    id: recipe.id,
    title: recipe.title,
    instructions: recipe.instructions,
    servings: recipe.servings,
    photoUrl: await getRecipePhotoUrl(recipe.photoObjectKey),
    sourceUrl: recipe.sourceUrl,
    ingredients: recipe.ingredients.map((ingredient) => ({
      productId: ingredient.productId ?? undefined,
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit
    }))
  };
}

function normalizeProductName(value: string) {
  return transliterate(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/g, "-")
    .replace(/^-|-$/g, "");
}

function transliterate(value: string) {
  const letters: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ы: "y",
    э: "e",
    ю: "yu",
    я: "ya"
  };

  return value.toLowerCase().replace(/[а-яё]/g, (letter) => letters[letter] ?? letter);
}
