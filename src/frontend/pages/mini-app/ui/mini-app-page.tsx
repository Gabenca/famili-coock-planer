"use client";

import React from "react";
import { useEffect, useState } from "react";

import { demoProducts, type MealSlot } from "@/data/demo";
import type { RecipeIngredient } from "@/lib/shopping-list";
import { readActiveTabFromUrl, readFamilyOpenFromUrl, updateMiniAppUrl, type MiniAppTab } from "@/shared/lib/mini-app-url";
import { AppHeader } from "@/widgets/app-header";
import { FamilyPanel } from "@/widgets/family-panel";
import { RecipesPanel } from "@/widgets/recipes-panel";
import { SectionTabs } from "@/widgets/section-tabs";
import { ShopPanel } from "@/widgets/shop-panel";
import { WeekPanel } from "@/widgets/week-panel";
import {
  addManualShoppingItem,
  addMeal,
  addRecipe,
  bootstrapTelegramAuth,
  createInvite,
  removeMeal,
  resetMiniAppStore,
  selectIsDemoMode,
  selectPlanItemsCount,
  selectRecipesCount,
  selectShoppingItems,
  selectShoppingItemsCount,
  toggleShoppingItem,
  updateManualShoppingQuantity,
  updateMealServings,
  updateRecipePhoto,
  useMiniAppStore,
  type MiniAppInitialData
} from "../model";

type Tab = MiniAppTab;

export function MiniAppPage({ initialData }: { initialData?: MiniAppInitialData }) {
  useState(() => {
    resetMiniAppStore(initialData);
    return true;
  });

  const [activeTab, setActiveTab] = useState<Tab>(() => readActiveTabFromUrl());
  const [familyOpen, setFamilyOpen] = useState(() => readFamilyOpenFromUrl());
  const authState = useMiniAppStore((state) => state.authState);
  const dataLoading = useMiniAppStore((state) => state.dataLoading);
  const dataError = useMiniAppStore((state) => state.dataError);
  const inviteMessage = useMiniAppStore((state) => state.inviteMessage);
  const inviteUrl = useMiniAppStore((state) => state.inviteUrl);
  const inviteLoading = useMiniAppStore((state) => state.inviteLoading);
  const householdMembers = useMiniAppStore((state) => state.householdMembers);
  const recipes = useMiniAppStore((state) => state.recipes);
  const planItems = useMiniAppStore((state) => state.planItems);
  const extraName = useMiniAppStore((state) => state.extraName);
  const extraQuantity = useMiniAppStore((state) => state.extraQuantity);
  const extraUnit = useMiniAppStore((state) => state.extraUnit);
  const setExtraName = useMiniAppStore((state) => state.setExtraName);
  const setExtraQuantity = useMiniAppStore((state) => state.setExtraQuantity);
  const setExtraUnit = useMiniAppStore((state) => state.setExtraUnit);
  const recipesCount = useMiniAppStore(selectRecipesCount);
  const planItemsCount = useMiniAppStore(selectPlanItemsCount);
  const shoppingItemsCount = useMiniAppStore(selectShoppingItemsCount);
  const shoppingItems = useMiniAppStore(selectShoppingItems);
  const showDemoHighlights = useMiniAppStore(selectIsDemoMode);

  useEffect(() => {
    void bootstrapTelegramAuth(initialData);
  }, [initialData]);

  useEffect(() => {
    function syncUrlState() {
      setActiveTab(readActiveTabFromUrl());
      setFamilyOpen(readFamilyOpenFromUrl());
    }

    window.addEventListener("popstate", syncUrlState);

    return () => window.removeEventListener("popstate", syncUrlState);
  }, []);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setFamilyOpen(false);
    updateMiniAppUrl((searchParams) => {
      searchParams.set("tab", tab);
      searchParams.delete("screen");
    });
  }

  function openFamily() {
    setFamilyOpen(true);
    updateMiniAppUrl((searchParams) => {
      searchParams.set("screen", "family");
    });
  }

  function closeFamily() {
    setFamilyOpen(false);
    updateMiniAppUrl((searchParams) => {
      searchParams.delete("screen");
    });
  }

  function handleCreateInvite() {
    void createInvite();
  }

  function handleToggleItem(key: string) {
    void toggleShoppingItem(key);
  }

  function handleAddExtraItem() {
    void addManualShoppingItem();
  }

  function handleManualQuantityChange(id: string, quantity: number) {
    void updateManualShoppingQuantity(id, quantity);
  }

  function handleAddMeal(date: string, slot: MealSlot, recipeId: string) {
    void addMeal({ date, slot, recipeId });
  }

  function handleUpdateMealServings(id: string, servingsMultiplier: number) {
    void updateMealServings(id, servingsMultiplier);
  }

  function handleRemoveMeal(id: string) {
    void removeMeal(id);
  }

  function handleAddRecipe(title: string, ingredients: RecipeIngredient[], instructions: string, sourceUrl?: string, photoFile?: File, photoUrl?: string) {
    return addRecipe({ title, ingredients, instructions, sourceUrl, photoFile, photoUrl });
  }

  function handleUpdateRecipePhoto(recipeId: string, photoFile: File, photoUrl: string) {
    return updateRecipePhoto(recipeId, photoFile, photoUrl);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-8 pt-safe">
      <AppHeader recipesCount={recipesCount} planItemsCount={planItemsCount} shoppingItemsCount={shoppingItemsCount} onOpenFamily={openFamily} />

      {familyOpen ? (
        <FamilyPanel authState={authState} members={householdMembers} inviteMessage={inviteMessage} inviteUrl={inviteUrl} inviteLoading={inviteLoading} onCreateInvite={handleCreateInvite} onBack={closeFamily} />
      ) : (
        <>
          <SectionTabs activeTab={activeTab} onSwitchTab={switchTab} />

          {dataLoading ? <p className="mt-3 rounded-md bg-white/55 px-3 py-2 text-xs font-bold text-slate">Загружаем данные пары...</p> : null}
          {dataError ? <p className="mt-3 rounded-md bg-honey/25 px-3 py-2 text-xs font-bold text-slate">{dataError}</p> : null}

          <section className="mt-5 flex-1" aria-live="polite">
            {activeTab === "recipes" ? <RecipesPanel recipes={recipes} showDemoHighlights={showDemoHighlights} onAddRecipe={handleAddRecipe} onUpdateRecipePhoto={handleUpdateRecipePhoto} /> : null}
            {activeTab === "week" ? <WeekPanel recipes={recipes} planItems={planItems} onAddMeal={handleAddMeal} onUpdateMealServings={handleUpdateMealServings} onRemoveMeal={handleRemoveMeal} /> : null}
            {activeTab === "shop" ? (
              <ShopPanel
                items={shoppingItems}
                extraName={extraName}
                extraQuantity={extraQuantity}
                extraUnit={extraUnit}
                productCount={demoProducts.length}
                onExtraNameChange={setExtraName}
                onExtraQuantityChange={setExtraQuantity}
                onExtraUnitChange={setExtraUnit}
                onAddExtraItem={handleAddExtraItem}
                onManualQuantityChange={handleManualQuantityChange}
                onToggleItem={handleToggleItem}
              />
            ) : null}
          </section>
        </>
      )}
    </main>
  );
}
