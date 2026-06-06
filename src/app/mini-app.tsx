"use client";

import { CalendarDays, Camera, Check, ChefHat, ListPlus, Minus, Plus, ShoppingBasket, Trash2, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import React from "react";
import { useMemo, useState } from "react";

import { demoManualItems, demoPlan, demoProducts, demoRecipes, demoShoppingList, demoWeekDates, mealSlotLabels, mealSlotOrder, type MealSlot, type PlannedMeal } from "@/data/demo";
import { buildShoppingList, type ManualShoppingItem, type Recipe, type RecipeIngredient } from "@/lib/shopping-list";

type Tab = "recipes" | "week" | "shop";

type AppRecipe = Recipe & {
  instructions?: string;
  photoUrl?: string;
};

const tabs: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: "recipes", label: "Рецепты", icon: ChefHat },
  { id: "week", label: "Неделя", icon: CalendarDays },
  { id: "shop", label: "Покупки", icon: ShoppingBasket }
];

const weekdayNames = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

const sourceLabels = {
  generated: "из плана",
  manual: "добавлено"
};

const shoppingUnitOptions = ["шт", "г", "кг", "мл", "л", "уп"];

export function MiniApp() {
  const [activeTab, setActiveTab] = useState<Tab>("recipes");
  const [recipes, setRecipes] = useState<AppRecipe[]>(demoRecipes);
  const [planItems, setPlanItems] = useState<PlannedMeal[]>(demoPlan);
  const [checkedKeys, setCheckedKeys] = useState(() => new Set(demoShoppingList.filter((item) => item.checked).map((item) => item.key)));
  const [extraItems, setExtraItems] = useState<ManualShoppingItem[]>(demoManualItems);
  const [extraName, setExtraName] = useState("");
  const [extraQuantity, setExtraQuantity] = useState("1");
  const [extraUnit, setExtraUnit] = useState("шт");

  const shoppingItems = useMemo(
    () =>
      buildShoppingList({
        recipes,
        planItems,
        manualItems: extraItems,
        checkedKeys: Array.from(checkedKeys)
      }),
    [checkedKeys, extraItems, planItems, recipes]
  );

  function toggleItem(key: string) {
    setCheckedKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  function addExtraItem() {
    const name = extraName.trim();
    const quantity = Number(extraQuantity);

    if (!name || !Number.isFinite(quantity) || quantity <= 0) {
      return;
    }

    setExtraItems((current) => [
      ...current,
      {
        id: `${Date.now()}`,
        name,
        quantity,
        unit: extraUnit
      }
    ]);
    setExtraName("");
    setExtraQuantity("1");
    setExtraUnit("шт");
  }

  function updateExtraItemQuantity(id: string, quantity: number) {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return;
    }

    setExtraItems((current) => current.map((item) => (item.id === id ? { ...item, quantity } : item)));
  }

  function addMeal(date: string, slot: MealSlot, recipeId: string) {
    if (!recipes.some((recipe) => recipe.id === recipeId)) {
      return;
    }

    setPlanItems((current) => [
      ...current,
      {
        id: `${date}-${slot}-${recipeId}-${Date.now()}`,
        date,
        slot,
        recipeId,
        servingsMultiplier: 1
      }
    ]);
  }

  function updateMealServings(id: string, servingsMultiplier: number) {
    if (!Number.isFinite(servingsMultiplier) || servingsMultiplier <= 0) {
      return;
    }

    setPlanItems((current) => current.map((item) => (item.id === id ? { ...item, servingsMultiplier } : item)));
  }

  function removeMeal(id: string) {
    setPlanItems((current) => current.filter((item) => item.id !== id));
  }

  function addRecipe(title: string, ingredients: RecipeIngredient[], instructions: string, photoUrl?: string) {
    const trimmedTitle = title.trim();
    const trimmedInstructions = instructions.trim();
    const validIngredients = ingredients
      .map((ingredient) => ({
        ...ingredient,
        name: ingredient.name.trim(),
        unit: ingredient.unit.trim(),
        productId: ingredient.productId?.trim()
      }))
      .filter((ingredient) => ingredient.name && ingredient.unit && Number.isFinite(ingredient.quantity) && ingredient.quantity > 0);

    if (!trimmedTitle || validIngredients.length === 0 || !trimmedInstructions) {
      return;
    }

    setRecipes((current) => [
      ...current,
      {
        id: createRecipeId(trimmedTitle, current),
        title: trimmedTitle,
        instructions: trimmedInstructions,
        photoUrl,
        ingredients: validIngredients.map((ingredient) => ({
          ...ingredient,
          productId: ingredient.productId || createProductKey(ingredient.name)
        }))
      }
    ]);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col px-4 pb-8 pt-[max(18px,env(safe-area-inset-top))]">
      <header className="rounded-[8px] border border-ink/10 bg-paper/80 p-4 shadow-soft backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-leaf">Кухня пары</p>
            <h1 className="mt-1 text-3xl font-black leading-none text-ink">Кухня для двоих</h1>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-clay text-paper" aria-hidden="true">
            <UsersRound size={24} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
          <Metric label="Рецепты" value={recipes.length} />
          <Metric label="В плане" value={planItems.length} />
          <Metric label="Купить" value={shoppingItems.length} />
        </div>
      </header>

      <nav className="sticky top-2 z-10 mt-4 grid grid-cols-3 gap-2 rounded-[8px] border border-ink/10 bg-paper/90 p-1 backdrop-blur" aria-label="Разделы">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={`flex h-11 items-center justify-center gap-2 rounded-[7px] text-sm font-extrabold transition ${
                selected ? "bg-ink text-paper" : "text-slate hover:bg-ink/5"
              }`}
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={selected}
            >
              <Icon size={17} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <section className="mt-5 flex-1" aria-live="polite">
        {activeTab === "recipes" ? <RecipesPanel recipes={recipes} onAddRecipe={addRecipe} /> : null}
        {activeTab === "week" ? <WeekPanel recipes={recipes} planItems={planItems} onAddMeal={addMeal} onUpdateMealServings={updateMealServings} onRemoveMeal={removeMeal} /> : null}
        {activeTab === "shop" ? (
          <ShopPanel
            items={shoppingItems}
            extraName={extraName}
            extraQuantity={extraQuantity}
            extraUnit={extraUnit}
            onExtraNameChange={setExtraName}
            onExtraQuantityChange={setExtraQuantity}
            onExtraUnitChange={setExtraUnit}
            onAddExtraItem={addExtraItem}
            onManualQuantityChange={updateExtraItemQuantity}
            onToggleItem={toggleItem}
          />
        ) : null}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[8px] border border-ink/10 bg-white/45 px-2 py-3">
      <div className="text-xl font-black">{value}</div>
      <div className="text-xs font-semibold text-slate">{label}</div>
    </div>
  );
}

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

function RecipesPanel({ recipes, onAddRecipe }: { recipes: AppRecipe[]; onAddRecipe: (title: string, ingredients: RecipeIngredient[], instructions: string, photoUrl?: string) => void }) {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [ingredients, setIngredients] = useState<RecipeIngredientDraft[]>(() => [emptyIngredientDraft()]);

  function updateIngredient(id: string, field: keyof Omit<RecipeIngredientDraft, "id">, value: string) {
    setIngredients((current) => current.map((ingredient) => (ingredient.id === id ? { ...ingredient, [field]: value } : ingredient)));
  }

  function removeIngredient(id: string) {
    setIngredients((current) => (current.length === 1 ? current : current.filter((ingredient) => ingredient.id !== id)));
  }

  function submitRecipe() {
    const recipeIngredients = ingredients.map<RecipeIngredient>((ingredient) => ({
      name: ingredient.name,
      quantity: Number(ingredient.quantity),
      unit: ingredient.unit,
      productId: createProductKey(ingredient.name)
    }));

    const beforeSubmitTitle = title;
    onAddRecipe(title, recipeIngredients, instructions, photoUrl);

    if (!beforeSubmitTitle.trim() || !instructions.trim() || recipeIngredients.every((ingredient) => !ingredient.name.trim() || !ingredient.unit.trim() || !Number.isFinite(ingredient.quantity) || ingredient.quantity <= 0)) {
      return;
    }

    setTitle("");
    setInstructions("");
    setPhotoUrl(undefined);
    setIngredients([emptyIngredientDraft()]);
  }

  function attachPhoto(file?: File) {
    if (!file) {
      setPhotoUrl(undefined);
      return;
    }

    setPhotoUrl(URL.createObjectURL(file));
  }

  return (
    <div className="space-y-3">
      <section className="rounded-[8px] border border-ink/10 bg-paper p-3 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-leaf">Новый рецепт</p>
            <h2 className="mt-1 text-lg font-black text-ink">Добавить в каталог</h2>
          </div>
          <ChefHat className="mt-1 text-clay" size={22} aria-hidden="true" />
        </div>

        <div className="mt-3 space-y-2">
          <input
            className="h-11 w-full rounded-[7px] border border-ink/10 bg-white/70 px-3 text-base font-semibold outline-none focus:border-clay"
            placeholder="Название рецепта"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Название рецепта"
          />

          <label className="grid min-h-[112px] cursor-pointer grid-cols-[92px_1fr] gap-3 rounded-[7px] border border-dashed border-ink/20 bg-white/55 p-2">
            <span className="relative flex h-full min-h-[92px] items-center justify-center overflow-hidden rounded-[7px] bg-ink/5 text-slate">
              {photoUrl ? (
                <span className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${photoUrl})` }} role="img" aria-label="Фото нового рецепта" />
              ) : (
                <Camera size={22} aria-hidden="true" />
              )}
            </span>
            <span className="flex min-w-0 flex-col justify-center">
              <span className="text-sm font-black text-ink">Фото рецепта</span>
              <span className="text-xs font-semibold text-slate">{photoUrl ? "Фото прикреплено" : "Выберите изображение"}</span>
            </span>
            <input className="sr-only" type="file" accept="image/*" onChange={(event) => attachPhoto(event.target.files?.[0])} aria-label="Фото рецепта" />
          </label>

          <textarea
            className="min-h-[112px] w-full resize-none rounded-[7px] border border-ink/10 bg-white/70 px-3 py-2 text-base font-semibold outline-none focus:border-clay"
            placeholder="Как приготовить"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            aria-label="Рецепт приготовления"
          />

          <div className="space-y-2">
            {ingredients.map((ingredient, index) => (
              <div key={ingredient.id} className="grid grid-cols-[1fr_72px_64px_34px] gap-2">
                <input
                  className="h-10 min-w-0 rounded-[7px] border border-ink/10 bg-white/70 px-2 text-sm font-semibold outline-none focus:border-clay"
                  placeholder="Ингредиент"
                  value={ingredient.name}
                  onChange={(event) => updateIngredient(ingredient.id, "name", event.target.value)}
                  aria-label={`Название ингредиента ${index + 1}`}
                />
                <input
                  className="h-10 rounded-[7px] border border-ink/10 bg-white/70 px-2 text-center text-sm font-black outline-none focus:border-clay"
                  type="number"
                  min="0.01"
                  step="0.25"
                  value={ingredient.quantity}
                  onChange={(event) => updateIngredient(ingredient.id, "quantity", event.target.value)}
                  aria-label={`Количество ингредиента ${index + 1}`}
                />
                <input
                  className="h-10 rounded-[7px] border border-ink/10 bg-white/70 px-2 text-center text-sm font-black outline-none focus:border-clay"
                  placeholder="шт"
                  value={ingredient.unit}
                  onChange={(event) => updateIngredient(ingredient.id, "unit", event.target.value)}
                  aria-label={`Единица ингредиента ${index + 1}`}
                />
                <button type="button" className="flex h-10 w-[34px] items-center justify-center rounded-[7px] text-slate hover:bg-ink/5" onClick={() => removeIngredient(ingredient.id)} aria-label={`Убрать ингредиент ${index + 1}`}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_44px] gap-2">
            <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-[7px] border border-ink/10 bg-white/60 text-sm font-extrabold text-ink" onClick={() => setIngredients((current) => [...current, emptyIngredientDraft()])}>
              <Plus size={16} />
              Ингредиент
            </button>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-[7px] bg-clay text-paper" onClick={submitRecipe} aria-label="Добавить рецепт">
              <ListPlus size={20} />
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[8px] border border-ink/10 bg-paper p-3">
          <p className="text-xs font-bold uppercase text-leaf">Ближайший план</p>
          <h2 className="mt-1 text-lg font-black">Понедельник</h2>
          <p className="text-sm font-semibold text-slate">Боул с лососем и рисом на ужин</p>
        </div>
        <div className="rounded-[8px] border border-ink/10 bg-paper p-3">
          <p className="text-xs font-bold uppercase text-leaf">Добавлено в покупки</p>
          <h2 className="mt-1 text-lg font-black">Кофе в зернах</h2>
          <p className="text-sm font-semibold text-slate">Ручная позиция в общем списке</p>
        </div>
      </section>

      {recipes.map((recipe, index) => (
        <article key={recipe.id} className="overflow-hidden rounded-[8px] border border-ink/10 bg-paper shadow-soft">
          <div className={`h-24 ${index % 2 === 0 ? "bg-clay" : "bg-leaf"} relative`}>
            {recipe.photoUrl ? <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${recipe.photoUrl})` }} role="img" aria-label={`Фото рецепта ${recipe.title}`} /> : null}
            <div className={`absolute inset-0 ${recipe.photoUrl ? "bg-ink/10" : "opacity-45 [background:linear-gradient(135deg,transparent_0_34%,rgba(255,255,255,.65)_34%_36%,transparent_36%_64%,rgba(255,255,255,.55)_64%_66%,transparent_66%)]"}`} />
            {!recipe.photoUrl ? (
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-[8px] bg-paper/92 px-3 py-2 text-sm font-bold text-ink">
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
              <div className="mt-3 rounded-[8px] border border-ink/10 bg-white/55 p-3">
                <p className="text-xs font-black uppercase text-leaf">Приготовление</p>
                <p className="mt-1 whitespace-pre-line text-sm font-semibold leading-relaxed text-slate">{recipe.instructions}</p>
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function WeekPanel({
  recipes,
  planItems,
  onAddMeal,
  onUpdateMealServings,
  onRemoveMeal
}: {
  recipes: AppRecipe[];
  planItems: PlannedMeal[];
  onAddMeal: (date: string, slot: MealSlot, recipeId: string) => void;
  onUpdateMealServings: (id: string, servingsMultiplier: number) => void;
  onRemoveMeal: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {weekdayNames.map((day, index) => {
        const dateKey = demoWeekDates[index];
        const mealsBySlot = mealSlotOrder.map((slot) => ({
          slot,
          meals: planItems.filter((item) => item.date === dateKey && item.slot === slot)
        }));

        return (
          <article key={day} className="grid min-w-0 grid-cols-1 gap-3 rounded-[8px] border border-ink/10 bg-paper p-3 sm:grid-cols-[92px_1fr]">
            <div className="min-w-0">
              <h2 className="break-words text-sm font-black uppercase text-ink">{day}</h2>
              <p className="text-xs font-semibold text-slate">{dateKey}</p>
            </div>
            <div className="min-w-0 space-y-3">
              {mealsBySlot.map(({ slot, meals }) => (
                <MealSlotSection key={`${dateKey}-${slot}`} recipes={recipes} date={dateKey} slot={slot} meals={meals} onAddMeal={onAddMeal} onUpdateMealServings={onUpdateMealServings} onRemoveMeal={onRemoveMeal} />
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MealSlotSection({
  recipes,
  date,
  slot,
  meals,
  onAddMeal,
  onUpdateMealServings,
  onRemoveMeal
}: {
  recipes: AppRecipe[];
  date: string;
  slot: MealSlot;
  meals: PlannedMeal[];
  onAddMeal: (date: string, slot: MealSlot, recipeId: string) => void;
  onUpdateMealServings: (id: string, servingsMultiplier: number) => void;
  onRemoveMeal: (id: string) => void;
}) {
  const [selectedRecipeId, setSelectedRecipeId] = useState(recipes[0]?.id ?? "");
  const effectiveRecipeId = recipes.some((recipe) => recipe.id === selectedRecipeId) ? selectedRecipeId : recipes[0]?.id ?? "";

  return (
    <section className="rounded-[8px] bg-white/55 p-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-black uppercase text-leaf">{mealSlotLabels[slot]}</h3>
        <span className="text-xs font-bold text-slate">{meals.length > 0 ? formatRecipeCount(meals.length) : "Свободно"}</span>
      </div>

      <div className="mt-2 space-y-2">
        {meals.map((meal) => {
          const recipe = recipes.find((item) => item.id === meal.recipeId);

          return (
            <div key={meal.id} className="grid grid-cols-[1fr_70px_32px] items-center gap-2 rounded-[7px] border border-ink/10 bg-paper p-2">
              <p className="min-w-0 text-sm font-bold leading-tight text-ink">{recipe?.title}</p>
              <label className="sr-only" htmlFor={`${meal.id}-servings`}>
                Количество порций
              </label>
              <input
                id={`${meal.id}-servings`}
                className="h-9 rounded-[7px] border border-ink/10 bg-white px-2 text-center text-sm font-black outline-none focus:border-clay"
                type="number"
                min="0.25"
                step="0.25"
                value={meal.servingsMultiplier}
                onChange={(event) => onUpdateMealServings(meal.id, Number(event.target.value))}
                aria-label={`Количество для ${recipe?.title ?? "рецепта"}`}
              />
              <button type="button" className="flex h-9 w-8 items-center justify-center rounded-[7px] text-slate hover:bg-ink/5" onClick={() => onRemoveMeal(meal.id)} aria-label={`Убрать ${recipe?.title ?? "рецепт"}`}>
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-[1fr_40px] gap-2">
        <select
          className="h-10 min-w-0 rounded-[7px] border border-ink/10 bg-paper px-2 text-sm font-semibold text-ink outline-none focus:border-clay"
          value={effectiveRecipeId}
          onChange={(event) => setSelectedRecipeId(event.target.value)}
          aria-label={`Рецепт для ${mealSlotLabels[slot].toLowerCase()}`}
        >
          {recipes.map((recipe) => (
            <option key={recipe.id} value={recipe.id}>
              {recipe.title}
            </option>
          ))}
        </select>
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-[7px] bg-ink text-paper" onClick={() => onAddMeal(date, slot, effectiveRecipeId)} aria-label={`Добавить рецепт в ${mealSlotLabels[slot].toLowerCase()}`}>
          <ListPlus size={18} />
        </button>
      </div>
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

function createRecipeId(title: string, recipes: AppRecipe[]) {
  const baseId = createProductKey(title) || "recipe";
  const existingIds = new Set(recipes.map((recipe) => recipe.id));
  let nextId = baseId;
  let index = 2;

  while (existingIds.has(nextId)) {
    nextId = `${baseId}-${index}`;
    index += 1;
  }

  return nextId;
}

function createProductKey(value: string) {
  const cyrillicTranslit: Record<string, string> = {
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

  return value
    .trim()
    .toLowerCase()
    .replace(/[а-яё]/g, (letter) => cyrillicTranslit[letter] ?? letter)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function ShopPanel({
  items,
  extraName,
  extraQuantity,
  extraUnit,
  onExtraNameChange,
  onExtraQuantityChange,
  onExtraUnitChange,
  onAddExtraItem,
  onManualQuantityChange,
  onToggleItem
}: {
  items: Array<{ key: string; name: string; quantity: number; unit: string; source: "generated" | "manual"; checked: boolean }>;
  extraName: string;
  extraQuantity: string;
  extraUnit: string;
  onExtraNameChange: (value: string) => void;
  onExtraQuantityChange: (value: string) => void;
  onExtraUnitChange: (value: string) => void;
  onAddExtraItem: () => void;
  onManualQuantityChange: (id: string, quantity: number) => void;
  onToggleItem: (key: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_70px_62px_44px] gap-2 rounded-[8px] border border-ink/10 bg-paper p-2">
        <input
          className="min-w-0 flex-1 rounded-[7px] border border-ink/10 bg-white/70 px-3 text-base outline-none focus:border-clay"
          placeholder="Добавить продукт"
          value={extraName}
          onChange={(event) => onExtraNameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onAddExtraItem();
            }
          }}
          aria-label="Дополнительный продукт"
        />
        <input
          className="h-11 rounded-[7px] border border-ink/10 bg-white/70 px-2 text-center text-base font-black outline-none focus:border-clay"
          type="number"
          min="0.25"
          step="0.25"
          value={extraQuantity}
          onChange={(event) => onExtraQuantityChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onAddExtraItem();
            }
          }}
          aria-label="Количество продукта"
        />
        <select
          className="h-11 rounded-[7px] border border-ink/10 bg-white/70 px-2 text-center text-sm font-black outline-none focus:border-clay"
          value={extraUnit}
          onChange={(event) => onExtraUnitChange(event.target.value)}
          aria-label="Единица продукта"
        >
          {shoppingUnitOptions.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
        <button type="button" className="flex h-11 w-11 items-center justify-center rounded-[7px] bg-clay text-paper" onClick={onAddExtraItem} aria-label="Добавить продукт">
          <ListPlus size={20} />
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const manualId = item.source === "manual" ? item.key.replace("manual:", "") : null;

          return (
            <div
              key={item.key}
              className={`grid w-full grid-cols-[36px_1fr_auto] items-center gap-3 rounded-[8px] border p-3 text-left transition ${
                item.checked ? "border-leaf/25 bg-leaf/12 text-slate" : "border-ink/10 bg-paper text-ink"
              }`}
            >
              <button type="button" className={`flex h-8 w-8 items-center justify-center rounded-[7px] border ${item.checked ? "border-leaf bg-leaf text-paper" : "border-ink/20"}`} onClick={() => onToggleItem(item.key)} aria-label={item.checked ? `Вернуть ${item.name}` : `Отметить ${item.name}`}>
                {item.checked ? <Check size={17} /> : null}
              </button>
              <button type="button" className="min-w-0 text-left" onClick={() => onToggleItem(item.key)}>
                <span className={`block font-black ${item.checked ? "line-through" : ""}`}>{item.name}</span>
                <span className="text-xs font-semibold uppercase text-slate">{sourceLabels[item.source]}</span>
              </button>
              {manualId ? (
                <div className="grid grid-cols-[32px_56px_30px_32px] items-center gap-1">
                  <button type="button" className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-white/65 text-slate" onClick={() => onManualQuantityChange(manualId, Math.max(0.25, item.quantity - 1))} aria-label={`Уменьшить ${item.name}`}>
                    <Minus size={15} />
                  </button>
                  <input
                    className="h-8 rounded-[7px] border border-ink/10 bg-white/80 px-1 text-center text-sm font-black outline-none focus:border-clay"
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={item.quantity}
                    onChange={(event) => onManualQuantityChange(manualId, Number(event.target.value))}
                    aria-label={`Количество ${item.name}`}
                  />
                  <span className="text-center text-sm font-black text-slate">{item.unit}</span>
                  <button type="button" className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-white/65 text-slate" onClick={() => onManualQuantityChange(manualId, item.quantity + 1)} aria-label={`Увеличить ${item.name}`}>
                    <Plus size={15} />
                  </button>
                </div>
              ) : (
                <span className="rounded-full bg-white/60 px-3 py-1 text-sm font-black">
                  {item.quantity} {item.unit}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-[8px] border border-ink/10 bg-honey/20 p-3 text-sm font-semibold text-slate">
        Каталог готов: {demoProducts.length} продуктов можно использовать для будущих форм рецептов.
      </div>
    </div>
  );
}
