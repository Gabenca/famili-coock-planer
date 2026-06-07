import { Camera } from "lucide-react";
import React from "react";

import type { AppRecipe } from "../model/types";

type RecipeCardProps = {
  recipe: AppRecipe;
  index: number;
};

export function RecipeCard({ recipe, index }: RecipeCardProps) {
  return (
    <article className="overflow-hidden rounded-lg border border-ink/10 bg-paper shadow-soft">
      <div className={`h-24 ${index % 2 === 0 ? "bg-clay" : "bg-leaf"} relative`}>
        {recipe.photoUrl ? <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${recipe.photoUrl})` }} role="img" aria-label={`Фото рецепта ${recipe.title}`} /> : null}
        <div className={`absolute inset-0 ${recipe.photoUrl ? "bg-ink/10" : "opacity-45 recipe-photo-placeholder"}`} />
        {!recipe.photoUrl ? (
          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-paper/92 px-3 py-2 text-sm font-bold text-ink">
            <Camera size={16} />
            Фото рецепта
          </div>
        ) : null}
      </div>
      <div className="p-4">
        <h2 className="text-xl font-black leading-tight">{recipe.title}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {recipe.ingredients.map((ingredient) => (
            <span key={`${recipe.id}-${ingredient.name}`} className="rounded-full border border-ink/10 bg-white/55 px-3 py-1 text-sm text-slate">
              {ingredient.quantity} {ingredient.unit} {ingredient.name}
            </span>
          ))}
        </div>
        {recipe.instructions ? (
          <div className="mt-3 rounded-lg border border-ink/10 bg-white/55 p-3">
            <p className="text-xs font-black uppercase text-leaf">Приготовление</p>
            <p className="mt-1 whitespace-pre-line text-sm font-semibold leading-relaxed text-slate">{recipe.instructions}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}
