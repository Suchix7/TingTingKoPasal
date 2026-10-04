"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Search, X } from "lucide-react";

import { IPHONE_MODELS } from "@/lib/phoneModels";

export type PhoneModelStock = { model: string; quantity: number };

type Props = {
  value: PhoneModelStock[];
  onChange: (next: PhoneModelStock[]) => void;
  disabled?: boolean;
};

const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

// Search, tick a model, set its quantity. Used for mobile covers, where each
// phone model is its own stock line.
export default function PhoneModelPicker({ value, onChange, disabled }: Props) {
  const [search, setSearch] = useState("");
  const [customModel, setCustomModel] = useState("");

  const selected = (model: string) => value.find((v) => same(v.model, model));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return IPHONE_MODELS;
    // match every typed word, so "14 pro" finds iPhone 14 Pro and Pro Max
    const words = q.split(/\s+/);
    return IPHONE_MODELS.filter((m) =>
      words.every((w) => m.toLowerCase().includes(w)),
    );
  }, [search]);

  // Models that were added by hand (not in the built-in list)
  const customSelected = value.filter(
    (v) => !IPHONE_MODELS.some((m) => same(m, v.model)),
  );

  const total = value.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);

  const toggle = (model: string) => {
    if (selected(model)) {
      onChange(value.filter((v) => !same(v.model, model)));
    } else {
      onChange([...value, { model, quantity: 1 }]);
    }
  };

  const setQuantity = (model: string, quantity: number) =>
    onChange(
      value.map((v) =>
        same(v.model, model)
          ? { ...v, quantity: Math.max(0, Math.floor(quantity) || 0) }
          : v,
      ),
    );

  const tickAllShown = () => {
    const missing = filtered.filter((m) => !selected(m));
    if (missing.length) {
      onChange([...value, ...missing.map((model) => ({ model, quantity: 1 }))]);
    }
  };

  const addCustom = () => {
    const model = customModel.trim();
    if (!model) return;
    if (!selected(model)) onChange([...value, { model, quantity: 1 }]);
    setCustomModel("");
  };

  const renderRow = (model: string, isCustom = false) => {
    const row = selected(model);
    const checked = !!row;

    return (
      <div
        key={model}
        className={`flex items-center gap-3 px-3 py-2 ${
          checked ? "bg-blue-50/60" : "hover:bg-slate-50"
        }`}
      >
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={() => toggle(model)}
            className="h-4 w-4 shrink-0 rounded border-slate-300"
          />
          <span className="truncate text-sm text-slate-800">{model}</span>
          {isCustom && (
            <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
              custom
            </span>
          )}
        </label>

        {checked && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={disabled || (row?.quantity ?? 0) <= 0}
              onClick={() => setQuantity(model, (row?.quantity ?? 0) - 1)}
              className="rounded-md border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              aria-label={`Fewer ${model}`}
            >
              <Minus size={14} />
            </button>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={String(row?.quantity ?? 0)}
              disabled={disabled}
              onChange={(e) =>
                setQuantity(
                  model,
                  e.target.value === "" ? 0 : parseInt(e.target.value, 10),
                )
              }
              className="w-14 rounded-md border border-slate-200 bg-white px-1 py-1 text-center text-sm outline-none focus:border-slate-400"
              aria-label={`Quantity for ${model}`}
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => setQuantity(model, (row?.quantity ?? 0) + 1)}
              className="rounded-md border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              aria-label={`More ${model}`}
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={16}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
          placeholder="Search phone model (e.g. 14 pro)"
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm outline-none focus:border-slate-400"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {value.length} selected · total stock{" "}
          <span className="font-semibold text-slate-700">{total}</span>
        </span>
        <span className="flex gap-3">
          <button
            type="button"
            onClick={tickAllShown}
            disabled={disabled || filtered.length === 0}
            className="font-medium text-blue-600 hover:underline disabled:opacity-40"
          >
            Tick all shown
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={disabled || value.length === 0}
            className="font-medium text-slate-500 hover:underline disabled:opacity-40"
          >
            Clear
          </button>
        </span>
      </div>

      <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white">
        {customSelected.map((v) => renderRow(v.model, true))}
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-slate-500">
            No matching model. Add it below.
          </p>
        ) : (
          filtered.map((model) => renderRow(model))
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={customModel}
          onChange={(e) => setCustomModel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          disabled={disabled}
          placeholder="Other model (e.g. Samsung S24)"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={disabled || !customModel.trim()}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}
