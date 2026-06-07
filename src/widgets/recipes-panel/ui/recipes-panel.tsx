import React from "react";

import { RecipeCard, type AppRecipe } from "@/entities/recipe";
import { CreateRecipeForm } from "@/features/create-recipe";
import type { RecipeIngredient } from "@/lib/shopping-list";

type RecipesPanelProps = {
  recipes: AppRecipe[];
  showDemoHighlights: boolean;
  onAddRecipe: (title: string, ingredients: RecipeIngredient[], instructions: string, sourceUrl?: string, photoFile?: File, photoUrl?: string) => boolean | Promise<boolean>;
  onUpdateRecipePhoto: (recipeId: string, photoFile: File, photoUrl: string) => boolean | Promise<boolean>;
};

export function RecipesPanel({ recipes, showDemoHighlights, onAddRecipe, onUpdateRecipePhoto }: RecipesPanelProps) {
  return (
    <div className="space-y-3">
      <CreateRecipeForm onAddRecipe={onAddRecipe} />

      {showDemoHighlights ? (
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-ink/10 bg-paper p-3">
            <p className="text-xs font-bold uppercase text-leaf">Ближайший план</p>
            <h2 className="mt-1 text-lg font-black">Понедельник</h2>
            <p className="text-sm font-semibold text-slate">Боул с лососем и рисом на ужин</p>
          </div>
          <div className="rounded-lg border border-ink/10 bg-paper p-3">
            <p className="text-xs font-bold uppercase text-leaf">Добавлено в покупки</p>
            <h2 className="mt-1 text-lg font-black">Кофе в зернах</h2>
            <p className="text-sm font-semibold text-slate">Ручная позиция в общем списке</p>
          </div>
        </section>
      ) : null}

      {recipes.map((recipe, index) => (
        <RecipeCard key={recipe.id} recipe={recipe} index={index} onUpdatePhoto={onUpdateRecipePhoto} />
      ))}
    </div>
  );
}
