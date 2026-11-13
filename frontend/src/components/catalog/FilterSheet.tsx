"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";

import { compareModelOrSize } from "@/lib/phoneModels";
import type { CatalogModel } from "@/hooks/useCatalog";
import { same, type Tr } from "./format";

type Props = {
  open: boolean;
  onClose: () => void;
  models: CatalogModel[];
  selectedModels: string[];
  onApply: (models: string[]) => void;
  t?: Tr;
};

// Bottom sheet on phones: tick phone models.
export default function FilterSheet({
  open,
  onClose,
  models,
  selectedModels,
  onApply,
  t = same,
}: Props) {
  const [draftModels, setDraftModels] = useState<string[]>(selectedModels);
  const [search, setSearch] = useState("");

  const sorted = useMemo(
    () =>
      // one straight line: iPhone X, XR, XS ... 11, 11 Pro, 11 Pro Max, 12...
      [...models].sort((a, b) => compareModelOrSize(a.model, b.model)),
    [models],
  );

  const visible = useMemo(() => {
    const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return sorted;
    return sorted.filter((m) =>
      words.every((w) => m.model.toLowerCase().includes(w)),
    );
  }, [sorted, search]);

  if (!open) return null;

  const toggle = (model: string) =>
    setDraftModels((cur) =>
      cur.includes(model) ? cur.filter((m) => m !== model) : [...cur, model],
    );

  const count = draftModels.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center">
      <button
        type="button"
        aria-label={t("Close filters")}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative flex max-h-[88dvh] w-full flex-col rounded-t-3xl bg-white sm:max-w-md sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-base font-semibold text-gray-900">{t("Filter")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label={t("Close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("Phone model")}
            </h3>
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Find a model")}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-gray-400"
              />
            </div>
            <ul>
              {visible.map((m) => {
                const on = draftModels.includes(m.model);
                return (
                  <li key={m.model}>
                    <button
                      type="button"
                      onClick={() => toggle(m.model)}
                      className="flex w-full items-center gap-3 rounded-lg px-1 py-3 text-left active:bg-gray-50"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          on
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {on && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="flex-1 text-sm text-gray-900">
                        {m.model}
                      </span>
                      <span className="text-xs text-gray-400">{m.count}</span>
                    </button>
                  </li>
                );
              })}
              {visible.length === 0 && (
                <li className="py-6 text-center text-sm text-gray-500">
                  {t("No models found")}
                </li>
              )}
            </ul>
          </section>
        </div>

        <div className="flex gap-3 border-t border-gray-100 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={() => {
              setDraftModels([]);
            }}
            className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700"
          >
            {t("Clear")}
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draftModels);
              onClose();
            }}
            className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white"
          >
            {t("Show covers")}{count ? ` (${count})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
