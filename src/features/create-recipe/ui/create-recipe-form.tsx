import { Camera, ChefHat, ListPlus, Plus, Trash2 } from "lucide-react";
import React, { useState } from "react";

import type { RecipeIngredient } from "@/lib/shopping-list";
import { createProductKey } from "@/shared/lib/product-key";

type RecipeIngredientDraft = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
};

const emptyIngredientDraft = (): RecipeIngredientDraft => ({
  id: `${Date.now()}-${Math.random()}`,
  name: "",
  quantity: "1",
  unit: "шт"
});

type CreateRecipeFormProps = {
  onAddRecipe: (title: string, ingredients: RecipeIngredient[], instructions: string, sourceUrl?: string, photoFile?: File, photoUrl?: string) => boolean | Promise<boolean>;
};

export function CreateRecipeForm({ onAddRecipe }: CreateRecipeFormProps) {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [photoFile, setPhotoFile] = useState<File | undefined>();
  const [ingredients, setIngredients] = useState<RecipeIngredientDraft[]>(() => [emptyIngredientDraft()]);

  function updateIngredient(id: string, field: keyof Omit<RecipeIngredientDraft, "id">, value: string) {
    setIngredients((current) => current.map((ingredient) => (ingredient.id === id ? { ...ingredient, [field]: value } : ingredient)));
  }

  function removeIngredient(id: string) {
    setIngredients((current) => (current.length === 1 ? current : current.filter((ingredient) => ingredient.id !== id)));
  }

  async function submitRecipe() {
    const recipeIngredients = ingredients.map<RecipeIngredient>((ingredient) => ({
      name: ingredient.name,
      quantity: Number(ingredient.quantity),
      unit: ingredient.unit,
      productId: createProductKey(ingredient.name)
    }));

    const beforeSubmitTitle = title;
    const submitted = await onAddRecipe(title, recipeIngredients, instructions, sourceUrl, photoFile, photoUrl);

    if (!submitted || !beforeSubmitTitle.trim() || !instructions.trim() || recipeIngredients.every((ingredient) => !ingredient.name.trim() || !ingredient.unit.trim() || !Number.isFinite(ingredient.quantity) || ingredient.quantity <= 0)) {
      return;
    }

    setTitle("");
    setInstructions("");
    setSourceUrl("");
    setPhotoUrl(undefined);
    setPhotoFile(undefined);
    setIngredients([emptyIngredientDraft()]);
  }

  function attachPhoto(file?: File) {
    if (!file) {
      setPhotoUrl(undefined);
      setPhotoFile(undefined);
      return;
    }

    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-paper p-3 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-leaf">Новый рецепт</p>
          <h2 className="mt-1 text-lg font-black text-ink">Добавить в каталог</h2>
        </div>
        <ChefHat className="mt-1 text-clay" size={22} aria-hidden="true" />
      </div>

      <form
        className="mt-3 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submitRecipe();
        }}
      >
        <input className="h-11 w-full rounded-md border border-ink/10 bg-white/70 px-3 text-base font-semibold outline-none focus:border-clay" placeholder="Название рецепта" value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Название рецепта" />

        <input className="h-11 w-full rounded-md border border-ink/10 bg-white/70 px-3 text-base font-semibold outline-none focus:border-clay" type="url" placeholder="Ссылка на рецепт" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} aria-label="Ссылка на рецепт" />

        <label className="grid min-h-28 cursor-pointer grid-cols-photo-picker gap-3 rounded-md border border-dashed border-ink/20 bg-white/55 p-2">
          <span className="relative flex h-full min-h-24 items-center justify-center overflow-hidden rounded-md bg-ink/5 text-slate">
            {photoUrl ? <span className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${photoUrl})` }} role="img" aria-label="Фото нового рецепта" /> : <Camera size={22} aria-hidden="true" />}
          </span>
          <span className="flex min-w-0 flex-col justify-center">
            <span className="text-sm font-black text-ink">Фото рецепта</span>
            <span className="text-xs font-semibold text-slate">{photoUrl ? "Фото прикреплено" : "Выберите изображение"}</span>
          </span>
          <input className="sr-only" type="file" accept="image/*" onChange={(event) => attachPhoto(event.target.files?.[0])} aria-label="Фото рецепта" />
        </label>

        <textarea className="min-h-28 w-full resize-none rounded-md border border-ink/10 bg-white/70 px-3 py-2 text-base font-semibold outline-none focus:border-clay" placeholder="Как приготовить" value={instructions} onChange={(event) => setInstructions(event.target.value)} aria-label="Рецепт приготовления" />

        <div className="space-y-2">
          {ingredients.map((ingredient, index) => (
            <div key={ingredient.id} className="grid grid-cols-ingredient-row gap-2">
              <input className="h-10 min-w-0 rounded-md border border-ink/10 bg-white/70 px-2 text-sm font-semibold outline-none focus:border-clay" placeholder="Ингредиент" value={ingredient.name} onChange={(event) => updateIngredient(ingredient.id, "name", event.target.value)} aria-label={`Название ингредиента ${index + 1}`} />
              <input className="h-10 rounded-md border border-ink/10 bg-white/70 px-2 text-center text-sm font-black outline-none focus:border-clay" type="number" min="0.01" step="any" value={ingredient.quantity} onChange={(event) => updateIngredient(ingredient.id, "quantity", event.target.value)} aria-label={`Количество ингредиента ${index + 1}`} />
              <input className="h-10 rounded-md border border-ink/10 bg-white/70 px-2 text-center text-sm font-black outline-none focus:border-clay" placeholder="шт" value={ingredient.unit} onChange={(event) => updateIngredient(ingredient.id, "unit", event.target.value)} aria-label={`Единица ингредиента ${index + 1}`} />
              <button type="button" className="flex h-10 w-9 items-center justify-center rounded-md text-slate hover:bg-ink/5" onClick={() => removeIngredient(ingredient.id)} aria-label={`Убрать ингредиент ${index + 1}`}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-action-row gap-2">
          <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-md border border-ink/10 bg-white/60 text-sm font-extrabold text-ink" onClick={() => setIngredients((current) => [...current, emptyIngredientDraft()])}>
            <Plus size={16} />
            Ингредиент
          </button>
          <button type="submit" className="flex h-11 w-11 items-center justify-center rounded-md bg-clay text-paper" aria-label="Добавить рецепт">
            <ListPlus size={20} />
          </button>
        </div>
      </form>
    </section>
  );
}
