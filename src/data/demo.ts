import { addDays, format, startOfWeek } from "date-fns";

import { buildShoppingList, type ManualShoppingItem, type PlanItem, type Recipe } from "@/lib/shopping-list";

export type PlannedMeal = PlanItem & {
  id: string;
  date: string;
  slot: MealSlot;
};

export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner";

export const mealSlotOrder: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];

export const mealSlotLabels: Record<PlannedMeal["slot"], string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  snack: "Полдник",
  dinner: "Ужин"
};

export const demoRecipes: Recipe[] = [
  {
    id: "salmon-bowl",
    title: "Боул с лососем и рисом",
    ingredients: [
      { productId: "salmon", name: "Филе лосося", quantity: 450, unit: "г" },
      { productId: "rice", name: "Рис жасмин", quantity: 0.35, unit: "кг" },
      { productId: "avocado", name: "Авокадо", quantity: 2, unit: "шт" },
      { productId: "soy", name: "Соевый соус", quantity: 80, unit: "мл" }
    ]
  },
  {
    id: "tomato-pasta",
    title: "Паста с томатами и базиликом",
    ingredients: [
      { productId: "pasta", name: "Паста", quantity: 400, unit: "г" },
      { productId: "tomato", name: "Томаты", quantity: 0.8, unit: "кг" },
      { productId: "basil", name: "Базилик", quantity: 1, unit: "шт" },
      { productId: "oil", name: "Оливковое масло", quantity: 60, unit: "мл" }
    ]
  },
  {
    id: "omelette",
    title: "Зеленый омлет",
    ingredients: [
      { productId: "egg", name: "Яйца", quantity: 4, unit: "шт" },
      { productId: "spinach", name: "Шпинат", quantity: 120, unit: "г" },
      { productId: "milk", name: "Молоко", quantity: 120, unit: "мл" },
      { productId: "salt", name: "Соль", quantity: 1, unit: "щепотка" }
    ]
  },
  {
    id: "yogurt-bowl",
    title: "Йогурт с ягодами и орехами",
    ingredients: [
      { productId: "yogurt", name: "Греческий йогурт", quantity: 350, unit: "г" },
      { productId: "berries", name: "Ягоды", quantity: 180, unit: "г" },
      { productId: "nuts", name: "Орехи", quantity: 60, unit: "г" },
      { productId: "honey", name: "Мед", quantity: 40, unit: "мл" }
    ]
  }
];

const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

export const demoWeekDates = Array.from({ length: 7 }, (_, index) => format(addDays(weekStart, index), "yyyy-MM-dd"));

export const demoPlan: PlannedMeal[] = [
  {
    id: "monday-breakfast",
    recipeId: "omelette",
    servingsMultiplier: 1,
    date: demoWeekDates[0],
    slot: "breakfast"
  },
  {
    id: "monday-dinner",
    recipeId: "salmon-bowl",
    servingsMultiplier: 1,
    date: demoWeekDates[0],
    slot: "dinner"
  },
  {
    id: "tuesday-dinner",
    recipeId: "tomato-pasta",
    servingsMultiplier: 1,
    date: demoWeekDates[1],
    slot: "dinner"
  },
  {
    id: "wednesday-snack",
    recipeId: "yogurt-bowl",
    servingsMultiplier: 1,
    date: demoWeekDates[2],
    slot: "snack"
  },
  {
    id: "friday-dinner",
    recipeId: "tomato-pasta",
    servingsMultiplier: 0.5,
    date: demoWeekDates[4],
    slot: "dinner"
  }
];

export const demoManualItems: ManualShoppingItem[] = [
  { id: "coffee", name: "Кофе в зернах", quantity: 1, unit: "шт" },
  { id: "lemons", name: "Лимоны", quantity: 4, unit: "шт" }
];

export const demoShoppingList = buildShoppingList({
  recipes: demoRecipes,
  planItems: demoPlan,
  manualItems: demoManualItems,
  checkedKeys: ["generated:rice:г", "manual:coffee"]
});

export const demoProducts = [
  "Филе лосося",
  "Рис жасмин",
  "Авокадо",
  "Соевый соус",
  "Паста",
  "Томаты",
  "Базилик",
  "Оливковое масло",
  "Яйца",
  "Шпинат",
  "Молоко",
  "Греческий йогурт",
  "Ягоды",
  "Орехи",
  "Мед"
];
