import React from "react";

import type { ShoppingListItem } from "@/entities/shopping-list";
import { ManualShoppingForm } from "@/features/manage-shopping-list";
import { ShoppingListRow } from "@/features/toggle-shopping-item";

type ShopPanelProps = {
  items: ShoppingListItem[];
  extraName: string;
  extraQuantity: string;
  extraUnit: string;
  productCount: number;
  onExtraNameChange: (value: string) => void;
  onExtraQuantityChange: (value: string) => void;
  onExtraUnitChange: (value: string) => void;
  onAddExtraItem: () => void;
  onManualQuantityChange: (id: string, quantity: number) => void;
  onToggleItem: (key: string) => void;
};

export function ShopPanel({ items, extraName, extraQuantity, extraUnit, productCount, onExtraNameChange, onExtraQuantityChange, onExtraUnitChange, onAddExtraItem, onManualQuantityChange, onToggleItem }: ShopPanelProps) {
  return (
    <div className="space-y-4">
      <ManualShoppingForm extraName={extraName} extraQuantity={extraQuantity} extraUnit={extraUnit} onExtraNameChange={onExtraNameChange} onExtraQuantityChange={onExtraQuantityChange} onExtraUnitChange={onExtraUnitChange} onAddExtraItem={onAddExtraItem} />

      <div className="space-y-2">
        {items.map((item) => (
          <ShoppingListRow key={item.key} item={item} onManualQuantityChange={onManualQuantityChange} onToggleItem={onToggleItem} />
        ))}
      </div>

      <div className="rounded-lg border border-ink/10 bg-honey/20 p-3 text-sm font-semibold text-slate">Каталог готов: {productCount} продуктов можно использовать для будущих форм рецептов.</div>
    </div>
  );
}
