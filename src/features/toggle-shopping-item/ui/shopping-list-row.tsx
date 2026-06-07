import { Check, Minus, Plus } from "lucide-react";
import React from "react";

import type { ShoppingListItem } from "@/entities/shopping-list";

const sourceLabels = {
  generated: "из плана",
  manual: "добавлено"
};

type ShoppingListRowProps = {
  item: ShoppingListItem;
  onManualQuantityChange: (id: string, quantity: number) => void;
  onToggleItem: (key: string) => void;
};

export function ShoppingListRow({ item, onManualQuantityChange, onToggleItem }: ShoppingListRowProps) {
  const manualId = item.source === "manual" ? item.key.replace("manual:", "") : null;

  return (
    <div className={`grid w-full grid-cols-shopping-item items-center gap-3 rounded-lg border p-3 text-left transition ${item.checked ? "border-leaf/25 bg-leaf/12 text-slate" : "border-ink/10 bg-paper text-ink"}`}>
      <button type="button" className={`flex h-8 w-8 items-center justify-center rounded-md border ${item.checked ? "border-leaf bg-leaf text-paper" : "border-ink/20"}`} onClick={() => onToggleItem(item.key)} aria-label={item.checked ? `Вернуть ${item.name}` : `Отметить ${item.name}`}>
        {item.checked ? <Check size={17} /> : null}
      </button>
      <button type="button" className="min-w-0 text-left" onClick={() => onToggleItem(item.key)}>
        <span className={`block font-black ${item.checked ? "line-through" : ""}`}>{item.name}</span>
        <span className="text-xs font-semibold uppercase text-slate">{sourceLabels[item.source]}</span>
      </button>
      {manualId ? (
        <div className="grid grid-cols-quantity-stepper items-center gap-1">
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md bg-white/65 text-slate" onClick={() => onManualQuantityChange(manualId, Math.max(0.25, item.quantity - 1))} aria-label={`Уменьшить ${item.name}`}>
            <Minus size={15} />
          </button>
          <input
            className="h-8 rounded-md border border-ink/10 bg-white/80 px-1 text-center text-sm font-black outline-none focus:border-clay"
            type="number"
            min="0.25"
            step="0.25"
            value={item.quantity}
            onChange={(event) => onManualQuantityChange(manualId, Number(event.target.value))}
            aria-label={`Количество ${item.name}`}
          />
          <span className="text-center text-sm font-black text-slate">{item.unit}</span>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md bg-white/65 text-slate" onClick={() => onManualQuantityChange(manualId, item.quantity + 1)} aria-label={`Увеличить ${item.name}`}>
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
}
