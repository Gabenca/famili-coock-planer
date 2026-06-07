import { UsersRound } from "lucide-react";
import React from "react";

import { Metric } from "@/shared/ui/metric";

type AppHeaderProps = {
  recipesCount: number;
  planItemsCount: number;
  shoppingItemsCount: number;
  onOpenFamily: () => void;
};

export function AppHeader({ recipesCount, planItemsCount, shoppingItemsCount, onOpenFamily }: AppHeaderProps) {
  return (
    <header className="rounded-lg border border-ink/10 bg-paper/80 p-4 shadow-soft backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf">Кухня пары</p>
          <h1 className="mt-1 text-3xl font-black leading-none text-ink">Кухня для двоих</h1>
        </div>
        <button type="button" className="flex h-12 w-12 items-center justify-center rounded-lg bg-clay text-paper transition hover:bg-clay/90" onClick={onOpenFamily} aria-label="Открыть семью">
          <UsersRound size={24} />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <Metric label="Рецепты" value={recipesCount} />
        <Metric label="В плане" value={planItemsCount} />
        <Metric label="Купить" value={shoppingItemsCount} />
      </div>
    </header>
  );
}
