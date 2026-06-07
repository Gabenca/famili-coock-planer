import { CalendarDays, ChefHat, ShoppingBasket } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import React from "react";

import type { MiniAppTab } from "@/shared/lib/mini-app-url";

const tabs: Array<{ id: MiniAppTab; label: string; icon: LucideIcon }> = [
  { id: "recipes", label: "Рецепты", icon: ChefHat },
  { id: "week", label: "Неделя", icon: CalendarDays },
  { id: "shop", label: "Покупки", icon: ShoppingBasket }
];

type SectionTabsProps = {
  activeTab: MiniAppTab;
  onSwitchTab: (tab: MiniAppTab) => void;
};

export function SectionTabs({ activeTab, onSwitchTab }: SectionTabsProps) {
  return (
    <nav className="sticky top-2 z-10 mt-4 grid grid-cols-3 gap-2 rounded-lg border border-ink/10 bg-paper/90 p-1 backdrop-blur" aria-label="Разделы">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            className={`flex h-11 items-center justify-center gap-2 rounded-md text-sm font-extrabold transition ${selected ? "bg-ink text-paper" : "text-slate hover:bg-ink/5"}`}
            onClick={() => onSwitchTab(tab.id)}
            aria-pressed={selected}
          >
            <Icon size={17} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
