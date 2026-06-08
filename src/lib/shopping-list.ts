export type IngredientUnit = "g" | "kg" | "ml" | "l" | "pcs" | "pinch" | string;

export type RecipeIngredient = {
  productId?: string;
  name: string;
  quantity: number;
  unit: IngredientUnit;
};

export type Recipe = {
  id: string;
  title: string;
  ingredients: RecipeIngredient[];
};

export type PlanItem = {
  recipeId: string;
  servingsMultiplier: number;
};

export type ManualShoppingItem = {
  id: string;
  name: string;
  quantity: number;
  unit: IngredientUnit;
};

export type ShoppingListInput = {
  recipes: Recipe[];
  planItems: PlanItem[];
  manualItems: ManualShoppingItem[];
  checkedKeys?: string[];
};

export type ShoppingListItem = {
  key: string;
  name: string;
  quantity: number;
  unit: IngredientUnit;
  source: "generated" | "manual";
  checked: boolean;
};

type AggregatedItem = Omit<ShoppingListItem, "checked">;

const METRIC_UNITS: Record<string, { canonicalUnit: "g" | "ml" | "г" | "мл"; multiplier: number }> = {
  g: { canonicalUnit: "g", multiplier: 1 },
  kg: { canonicalUnit: "g", multiplier: 1000 },
  ml: { canonicalUnit: "ml", multiplier: 1 },
  l: { canonicalUnit: "ml", multiplier: 1000 },
  г: { canonicalUnit: "г", multiplier: 1 },
  кг: { canonicalUnit: "г", multiplier: 1000 },
  мл: { canonicalUnit: "мл", multiplier: 1 },
  л: { canonicalUnit: "мл", multiplier: 1000 }
};

export function buildShoppingList(input: ShoppingListInput): ShoppingListItem[] {
  const recipesById = new Map(input.recipes.map((recipe) => [recipe.id, recipe]));
  const generated = new Map<string, AggregatedItem>();

  for (const planItem of input.planItems) {
    const recipe = recipesById.get(planItem.recipeId);


    if (!recipe) {
      continue;
    }

    for (const ingredient of recipe.ingredients) {
      const normalized = normalizeIngredient(ingredient);
      const quantity = normalized.quantity * planItem.servingsMultiplier;
      const key = `generated:${normalized.productKey}:${normalized.unit}`;
      const existing = generated.get(key);

      if (existing) {
        existing.quantity += quantity;
      } else {
        generated.set(key, {
          key,
          name: ingredient.name,
          quantity,
          unit: normalized.unit,
          source: "generated"
        });
      }
    }
  }

  const checked = new Set(input.checkedKeys ?? []);
  const manual = input.manualItems.map<AggregatedItem>((item) => ({
    key: `manual:${item.id}`,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    source: "manual"
  }));

  return [...generated.values(), ...manual]
    .map((item) => ({
      ...item,
      quantity: roundQuantity(item.quantity),
      checked: checked.has(item.key)
    }))
    .sort(compareShoppingItems);
}

function normalizeIngredient(ingredient: RecipeIngredient) {
  const metric = METRIC_UNITS[ingredient.unit];

  if (!metric) {
    return {
      productKey: ingredient.productId ?? slugify(ingredient.name),
      quantity: ingredient.quantity,
      unit: ingredient.unit
    };
  }

  return {
    productKey: ingredient.productId ?? slugify(ingredient.name),
    quantity: ingredient.quantity * metric.multiplier,
    unit: metric.canonicalUnit
  };
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function roundQuantity(value: number) {
  return Number(value.toFixed(3));
}

function compareShoppingItems(left: ShoppingListItem, right: ShoppingListItem) {
  const leftPriority = getDisplayPriority(left);
  const rightPriority = getDisplayPriority(right);

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  return left.name.localeCompare(right.name);
}

function getDisplayPriority(item: ShoppingListItem) {
  if (item.source === "manual") {
    return 1;
  }

  return METRIC_UNITS[item.unit] || item.unit === "pcs" || item.unit === "шт" ? 0 : 2;
}
