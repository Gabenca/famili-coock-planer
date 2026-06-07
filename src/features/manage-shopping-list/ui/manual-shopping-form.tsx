import { ListPlus } from "lucide-react";
import React from "react";

const shoppingUnitOptions = ["шт", "г", "кг", "мл", "л", "уп"];

type ManualShoppingFormProps = {
  extraName: string;
  extraQuantity: string;
  extraUnit: string;
  onExtraNameChange: (value: string) => void;
  onExtraQuantityChange: (value: string) => void;
  onExtraUnitChange: (value: string) => void;
  onAddExtraItem: () => void;
};

export function ManualShoppingForm({ extraName, extraQuantity, extraUnit, onExtraNameChange, onExtraQuantityChange, onExtraUnitChange, onAddExtraItem }: ManualShoppingFormProps) {
  return (
    <form
      className="grid grid-cols-shopping-form gap-2 rounded-lg border border-ink/10 bg-paper p-2"
      onSubmit={(event) => {
        event.preventDefault();
        onAddExtraItem();
      }}
    >
      <input
        className="min-w-0 flex-1 rounded-md border border-ink/10 bg-white/70 px-3 text-base outline-none focus:border-clay"
        placeholder="Добавить продукт"
        value={extraName}
        onChange={(event) => onExtraNameChange(event.target.value)}
        aria-label="Дополнительный продукт"
      />
      <input
        className="h-11 rounded-md border border-ink/10 bg-white/70 px-2 text-center text-base font-black outline-none focus:border-clay"
        type="number"
        min="0.25"
        step="0.25"
        value={extraQuantity}
        onChange={(event) => onExtraQuantityChange(event.target.value)}
        aria-label="Количество продукта"
      />
      <select className="h-11 rounded-md border border-ink/10 bg-white/70 px-2 text-center text-sm font-black outline-none focus:border-clay" value={extraUnit} onChange={(event) => onExtraUnitChange(event.target.value)} aria-label="Единица продукта">
        {shoppingUnitOptions.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>
      <button type="submit" className="flex h-11 w-11 items-center justify-center rounded-md bg-clay text-paper" aria-label="Добавить продукт">
        <ListPlus size={20} />
      </button>
    </form>
  );
}
