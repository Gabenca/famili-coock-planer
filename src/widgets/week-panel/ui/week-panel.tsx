import { CalendarDays } from "lucide-react";
import React from "react";

import { demoWeekDates, mealSlotOrder, type MealSlot, type PlannedMeal } from "@/data/demo";
import type { AppRecipe } from "@/entities/recipe";
import { MealSlotSection } from "@/features/manage-meal-plan";

const weekdayNames = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

type WeekPanelProps = {
  recipes: AppRecipe[];
  planItems: PlannedMeal[];
  onAddMeal: (date: string, slot: MealSlot, recipeId: string) => void;
  onUpdateMealServings: (id: string, servingsMultiplier: number) => void;
  onRemoveMeal: (id: string) => void;
};

export function WeekPanel({ recipes, planItems, onAddMeal, onUpdateMealServings, onRemoveMeal }: WeekPanelProps) {
  return (
    <div className="space-y-3">
      {demoWeekDates.map((dateKey, dayIndex) => {
        const dayItems = planItems.filter((item) => item.date === dateKey);

        return (
          <section key={dateKey} className="rounded-lg border border-ink/10 bg-paper p-3 shadow-soft">
            <div className="grid grid-cols-day-card items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-leaf/15 text-leaf">
                <CalendarDays size={20} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-leaf">{dateKey}</p>
                <h2 className="text-lg font-black text-ink">{weekdayNames[dayIndex]}</h2>
              </div>
              <span className="justify-self-end rounded-full bg-ink/5 px-2 py-1 text-xs font-black text-slate">{dayItems.length}</span>
            </div>

            <div className="mt-3 space-y-2">
              {mealSlotOrder.map((slot) => {
                const meals = planItems.filter((item) => item.date === dateKey && item.slot === slot);
                return <MealSlotSection key={`${dateKey}-${slot}`} recipes={recipes} date={dateKey} slot={slot} meals={meals} onAddMeal={onAddMeal} onUpdateMealServings={onUpdateMealServings} onRemoveMeal={onRemoveMeal} />;
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
