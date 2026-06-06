import { describe, expect, it } from "vitest";

import { buildShoppingList } from "./shopping-list";

describe("buildShoppingList", () => {
  it("aggregates planned recipe ingredients by product and converts metric units", () => {
    const list = buildShoppingList({
      recipes: [
        {
          id: "pasta",
          title: "Tomato pasta",
          ingredients: [
            { productId: "tomato", name: "Tomatoes", quantity: 500, unit: "g" },
            { productId: "pasta", name: "Pasta", quantity: 0.4, unit: "kg" }
          ]
        },
        {
          id: "soup",
          title: "Soup",
          ingredients: [
            { productId: "tomato", name: "Tomatoes", quantity: 0.75, unit: "kg" },
            { productId: "oil", name: "Olive oil", quantity: 150, unit: "ml" }
          ]
        }
      ],
      planItems: [
        { recipeId: "pasta", servingsMultiplier: 1 },
        { recipeId: "soup", servingsMultiplier: 2 }
      ],
      manualItems: []
    });

    expect(list).toEqual([
      {
        key: "generated:oil:ml",
        name: "Olive oil",
        quantity: 300,
        unit: "ml",
        source: "generated",
        checked: false
      },
      {
        key: "generated:pasta:g",
        name: "Pasta",
        quantity: 400,
        unit: "g",
        source: "generated",
        checked: false
      },
      {
        key: "generated:tomato:g",
        name: "Tomatoes",
        quantity: 2000,
        unit: "g",
        source: "generated",
        checked: false
      }
    ]);
  });

  it("keeps ambiguous units separate and merges manual items with checked state", () => {
    const list = buildShoppingList({
      recipes: [
        {
          id: "breakfast",
          title: "Breakfast",
          ingredients: [
            { productId: "egg", name: "Eggs", quantity: 2, unit: "pcs" },
            { productId: "salt", name: "Salt", quantity: 1, unit: "pinch" }
          ]
        }
      ],
      planItems: [{ recipeId: "breakfast", servingsMultiplier: 3 }],
      manualItems: [
        { id: "manual-1", name: "Dish soap", quantity: 1, unit: "pcs" },
        { id: "manual-2", name: "Milk", quantity: 1, unit: "l" }
      ],
      checkedKeys: ["generated:egg:pcs", "manual:manual-2"]
    });

    expect(list).toEqual([
      {
        key: "generated:egg:pcs",
        name: "Eggs",
        quantity: 6,
        unit: "pcs",
        source: "generated",
        checked: true
      },
      {
        key: "manual:manual-1",
        name: "Dish soap",
        quantity: 1,
        unit: "pcs",
        source: "manual",
        checked: false
      },
      {
        key: "manual:manual-2",
        name: "Milk",
        quantity: 1,
        unit: "l",
        source: "manual",
        checked: true
      },
      {
        key: "generated:salt:pinch",
        name: "Salt",
        quantity: 3,
        unit: "pinch",
        source: "generated",
        checked: false
      }
    ]);
  });

  it("converts Russian metric unit labels for localized recipe data", () => {
    const list = buildShoppingList({
      recipes: [
        {
          id: "ru-pasta",
          title: "Паста",
          ingredients: [
            { productId: "tomato", name: "Томаты", quantity: 0.5, unit: "кг" },
            { productId: "tomato", name: "Томаты", quantity: 250, unit: "г" },
            { productId: "oil", name: "Оливковое масло", quantity: 0.1, unit: "л" },
            { productId: "oil", name: "Оливковое масло", quantity: 50, unit: "мл" }
          ]
        }
      ],
      planItems: [{ recipeId: "ru-pasta", servingsMultiplier: 1 }],
      manualItems: []
    });

    expect(list).toEqual([
      {
        key: "generated:oil:мл",
        name: "Оливковое масло",
        quantity: 150,
        unit: "мл",
        source: "generated",
        checked: false
      },
      {
        key: "generated:tomato:г",
        name: "Томаты",
        quantity: 750,
        unit: "г",
        source: "generated",
        checked: false
      }
    ]);
  });
});
