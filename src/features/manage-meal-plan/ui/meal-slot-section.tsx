import { ListPlus, Trash2 } from "lucide-react";
import React, { useState } from "react";

import { mealSlotLabels, type MealSlot, type PlannedMeal } from "@/data/demo";
import type { AppRecipe } from "@/entities/recipe";

type MealSlotSectionProps = {
  recipes: AppRecipe[];
  date: string;
  slot: MealSlot;
  meals: PlannedMeal[];
  onAddMeal: (date: string, slot: MealSlot, recipeId: string) => void;
  onUpdateMealServings: (id: string, servingsMultiplier: number) => void;
  onRemoveMeal: (id: string) => void;
};

export function MealSlotSection({ recipes, date, slot, meals, onAddMeal, onUpdateMealServings, onRemoveMeal }: MealSlotSectionProps) {
  const [selectedRecipeId, setSelectedRecipeId] = useState(recipes[0]?.id ?? "");
  const effectiveRecipeId = recipes.some((recipe) => recipe.id === selectedRecipeId) ? selectedRecipeId : recipes[0]?.id ?? "";

  return (
    <section className="rounded-lg bg-white/55 p-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-black uppercase text-leaf">{mealSlotLabels[slot]}</h3>
        <span className="text-xs font-bold text-slate">{meals.length > 0 ? formatRecipeCount(meals.length) : "Свободно"}</span>
      </div>

      <div className="mt-2 space-y-2">
        {meals.map((meal) => {
          const recipe = recipes.find((item) => item.id === meal.recipeId);

          return (
            <div key={meal.id} className="grid grid-cols-meal-row items-center gap-2 rounded-md border border-ink/10 bg-paper p-2">
              <p className="min-w-0 text-sm font-bold leading-tight text-ink">{recipe?.title}</p>
              <label className="sr-only" htmlFor={`${meal.id}-servings`}>
                Количество порций
              </label>
              <input
                id={`${meal.id}-servings`}
                className="h-9 rounded-md border border-ink/10 bg-white px-2 text-center text-sm font-black outline-none focus:border-clay"
                type="number"
                min="0.25"
                step="0.25"
                value={meal.servingsMultiplier}
                onChange={(event) => onUpdateMealServings(meal.id, Number(event.target.value))}
                aria-label={`Количество для ${recipe?.title ?? "рецепта"}`}
              />
              <button type="button" className="flex h-9 w-8 items-center justify-center rounded-md text-slate hover:bg-ink/5" onClick={() => onRemoveMeal(meal.id)} aria-label={`Убрать ${recipe?.title ?? "рецепт"}`}>
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <form
        className="mt-2 grid grid-cols-meal-add gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onAddMeal(date, slot, effectiveRecipeId);
        }}
      >
        <select className="h-10 min-w-0 rounded-md border border-ink/10 bg-paper px-2 text-sm font-semibold text-ink outline-none focus:border-clay" value={effectiveRecipeId} onChange={(event) => setSelectedRecipeId(event.target.value)} aria-label={`Рецепт для ${mealSlotLabels[slot].toLowerCase()}`}>
          {recipes.map((recipe) => (
            <option key={recipe.id} value={recipe.id}>
              {recipe.title}
            </option>
          ))}
        </select>
        <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-paper" aria-label={`Добавить рецепт в ${mealSlotLabels[slot].toLowerCase()}`}>
          <ListPlus size={18} />
        </button>
      </form>
    </section>
  );
}

function formatRecipeCount(count: number) {
  const modulo100 = count % 100;
  const modulo10 = count % 10;

  if (modulo100 >= 11 && modulo100 <= 14) {
    return `${count} рецептов`;
  }

  if (modulo10 === 1) {
    return `${count} рецепт`;
  }

  if (modulo10 >= 2 && modulo10 <= 4) {
    return `${count} рецепта`;
  }

  return `${count} рецептов`;
}
