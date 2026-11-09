"use client";

import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";

import type { PhoneModelStock } from "./PhoneModelPicker";
import { useLang } from "@/lib/i18n";

type Props = {
  value: PhoneModelStock[];
  onChange: (next: PhoneModelStock[]) => void;
  disabled?: boolean;
};

const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

// One row per size with its stock, e.g. S [5]  M [8]  L [3]. Sizes come from
// the category's preset list; more can be added or removed per product. Each
// size is saved as its own stock line, the same way phone models are.
export default function SizeStockPicker({ value, onChange, disabled }: Props) {
  const { t } = useLang();
  const [newSize, setNewSize] = useState("");

  const total = value.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);

  const setQuantity = (size: string, quantity: number) =>
    onChange(
      value.map((v) =>
        same(v.model, size)
          ? { ...v, quantity: Math.max(0, Math.floor(quantity) || 0) }
          : v,
      ),
    );

  const remove = (size: string) =>
    onChange(value.filter((v) => !same(v.model, size)));

  const addSize = () => {
    const size = newSize.trim();
    if (!size) return;
    if (!value.some((v) => same(v.model, size))) {
      onChange([...value, { model: size, quantity: 0 }]);
    }
    setNewSize("");
  };

  return (
    <div className="space-y-3">
      {value.length > 0 ? (
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {value.map((row) => (
            <div key={row.model} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                {row.model}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={disabled || row.quantity <= 0}
                  onClick={() => setQuantity(row.model, row.quantity - 1)}
                  className="rounded-md border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  aria-label={`${t("Fewer")} ${row.model}`}
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={String(row.quantity)}
                  disabled={disabled}
                  onFocus={(e) => e.currentTarget.select()}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) =>
                    setQuantity(
                      row.model,
                      e.target.value === "" ? 0 : parseInt(e.target.value, 10),
                    )
                  }
                  className="w-16 rounded-md border border-slate-200 bg-white px-1 py-1 text-center text-sm outline-none focus:border-slate-400"
                  aria-label={`${t("Quantity for")} ${row.model}`}
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setQuantity(row.model, row.quantity + 1)}
                  className="rounded-md border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  aria-label={`${t("Add one")} ${row.model}`}
                >
                  <Plus size={14} />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => remove(row.model)}
                  className="ml-1 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  aria-label={`${t("Remove size")} ${row.model}`}
                  title={t("Remove size")}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-sm text-slate-500">
          {t("No sizes yet. Add one below.")}
        </p>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newSize}
          onChange={(e) => setNewSize(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSize();
            }
          }}
          disabled={disabled}
          placeholder={t("New size (e.g. XL, 42, Free size)")}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
        />
        <button
          type="button"
          onClick={addSize}
          disabled={disabled || !newSize.trim()}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          <Plus size={14} /> {t("Add size")}
        </button>
      </div>

      <p className="text-xs text-slate-500">
        {value.length} {t("sizes")} · {t("total stock")}{" "}
        <span className="font-semibold text-slate-700">{total}</span>
      </p>
    </div>
  );
}
