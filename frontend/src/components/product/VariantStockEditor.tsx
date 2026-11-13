"use client";

import { useState } from "react";
import Image from "next/image";
import { coverImage } from "@/components/catalog/image";
import { ImagePlus, ImageOff, Minus, Plus, Trash2, X } from "lucide-react";

import type { ProductBatch } from "@/hooks/useProducts";
import { useLang } from "@/lib/i18n";
import { IPHONE_MODELS, compareModels, compareSizes } from "@/lib/phoneModels";

// Stock split by size, by colour/style, or both (Camo: M 1, L 1, XL 1).
// For mobile covers the second part is the phone model instead of a size
// (Blue: iPhone 13 1, iPhone 15 Pro Max 1).
// Each colour can be linked to the product photo that shows it.
export type StockColour = { key: string; name: string; photoKey: string | null };
export type StockGrid = {
  // `sizes` are phone models (covers) rather than sizes
  models: boolean;
  useSizes: boolean;
  useColours: boolean;
  sizes: string[];
  colours: StockColour[];
  // quantity per `${colourKey}|${size}`; "" stands for "no colour" / "no size"
  qty: Record<string, number>;
  // some colours / sizes have their own price
  usePrices: boolean;
  // own prices per cell; missing = the product's price
  cost: Record<string, number>;
  sale: Record<string, number>;
  // colour × size / model cells that aren't stocked at all (a cover that
  // comes in Red for iPhone 15 but not for iPhone 13); no line is saved
  off: Record<string, true>;
};
// cost_price / sale_price: null = use the product's price
export type StockLine = {
  variant: string;
  size: string;
  model: string;
  quantity: number;
  cost_price: number | null;
  sale_price: number | null;
};
export type ProductPrices = { cost: number; sale: number };
export type GridPhoto = { key: string; preview: string; local: boolean };

const NO_COLOUR = "";
const cell = (colour: string, size: string) => `${colour}|${size}`;
const newKey = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
// "iPhone 12 \ 13" -> "iPhone 12/13": "/" is allowed, but " / " (with spaces)
// splits a line's colour from its size / model, so the spaces go
const cleanSize = (raw: string) => raw.trim().replace(/\s*[\\/]\s*/g, "/");

export const emptyGrid = (sizes: string[] = []): StockGrid => ({
  models: false,
  useSizes: sizes.length > 0,
  useColours: false,
  sizes,
  colours: [],
  qty: {},
  usePrices: false,
  cost: {},
  sale: {},
  off: {},
});

// A grid for a mobile cover: stock per phone model, optionally by colour
export const coverGrid = (models: string[] = []): StockGrid => ({
  ...emptyGrid(),
  models: true,
  useSizes: true,
  sizes: models,
});

// a cell only counts as "off" when both colours and sizes / models are in use
const isOff = (g: StockGrid, key: string) => g.useColours && g.useSizes && !!g.off?.[key];

export const gridActive = (g: StockGrid) => g.useSizes || g.useColours;

// One line per colour × size that is in use
export function gridToLines(g: StockGrid): StockLine[] {
  if (!gridActive(g)) return [];
  const colours = g.useColours ? g.colours : [{ key: NO_COLOUR, name: "", photoKey: null }];
  const sizes = g.useSizes ? g.sizes : [""];
  return colours.flatMap((c) =>
    sizes.filter((s) => !isOff(g, cell(c.key, s))).map((s) => ({
      variant: c.name.trim(),
      size: g.models ? "" : s.trim(),
      model: g.models ? s.trim() : "",
      quantity: g.qty[cell(c.key, s)] || 0,
      cost_price: g.usePrices ? (g.cost[cell(c.key, s)] ?? null) : null,
      sale_price: g.usePrices ? (g.sale[cell(c.key, s)] ?? null) : null,
    })),
  );
}

export const gridTotal = (g: StockGrid) =>
  gridToLines(g).reduce((sum, l) => sum + l.quantity, 0);

// Problems that block saving, or null
export function gridProblem(
  g: StockGrid,
  t: (s: string) => string,
  product?: ProductPrices,
): string | null {
  if (g.useSizes && g.sizes.length === 0) {
    return g.models ? t("Add at least one phone model.") : t("Add at least one size.");
  }
  if (g.useColours) {
    if (g.colours.length === 0) return t("Add at least one colour / style.");
    if (g.colours.some((c) => !c.name.trim())) return t("Give every colour / style a name.");
    const names = g.colours.map((c) => c.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) return t("Each colour / style can only be listed once.");
    if (g.colours.some((c) => c.name.includes("/"))) return t('Colour names cannot contain "/".');
    if (g.models) {
      const bare = g.colours.find((c) => g.sizes.every((s) => isOff(g, cell(c.key, s))));
      if (bare) return `${bare.name.trim()}: ${t("add the phone models this colour comes in, or remove it.")}`;
    }
    if (g.useSizes) {
      const empty = g.sizes.find((s) => g.colours.every((c) => isOff(g, cell(c.key, s))));
      if (empty) {
        return g.models
          ? `${empty}: ${t("pick at least one colour, or remove this phone model.")}`
          : `${empty}: ${t("pick at least one colour, or remove this size.")}`;
      }
    }
  }
  if (g.usePrices && product) {
    const bad = gridToLines(g).find(
      (l) => (l.cost_price ?? product.cost) > (l.sale_price ?? product.sale),
    );
    if (bad) {
      const name = [bad.variant, bad.size || bad.model].filter(Boolean).join(" / ");
      return `${name}: ${t("Cost price cannot be greater than sale price.")}`;
    }
  }
  return null;
}

// Rebuild the editor from a product's saved stock lines and photo labels
export function gridFromProduct(
  batches: ProductBatch[],
  photos: { id: string; variant?: string }[],
  presetSizes: string[],
  // a line priced like the product follows it; any other price is its own
  product?: ProductPrices,
  // lines named only by their batch number are phone models (old covers)
  forceModels = false,
): StockGrid {
  const own = (price: number, base?: number) =>
    base === undefined || Number(price) === Number(base) ? undefined : Number(price);
  // colours split by phone model (a cover): the grid's sizes are models
  const models = forceModels || batches.some((b) => b.model);
  const lines = batches.map((b) => ({
    variant: b.variant || "",
    // size-only lines saved before colours existed are named after the size
    size: b.size || b.model || (b.variant ? "" : b.batch_number),
    quantity: Number(b.quantity) || 0,
    cost: own(b.cost_price, product?.cost),
    sale: own(b.sale_price, product?.sale),
  }));
  if (!lines.length) return emptyGrid(presetSizes);
  const order = models ? compareModels : compareSizes;

  const useColours = lines.some((l) => l.variant);
  const sizes: string[] = [];
  for (const l of lines) if (l.size && !sizes.some((s) => same(s, l.size))) sizes.push(l.size);
  sizes.sort(order);

  const colours: StockColour[] = [];
  if (useColours) {
    // photo order first, then any colour without a photo
    const names: string[] = [];
    for (const p of photos) if (p.variant && lines.some((l) => same(l.variant, p.variant!))) names.push(p.variant);
    for (const l of lines) if (l.variant) names.push(l.variant);
    for (const name of names) {
      if (colours.some((c) => same(c.name, name))) continue;
      const photo = photos.find((p) => p.variant && same(p.variant, name));
      colours.push({ key: newKey(), name, photoKey: photo?.id ?? null });
    }
  }

  const qty: Record<string, number> = {};
  const cost: Record<string, number> = {};
  const sale: Record<string, number> = {};
  for (const l of lines) {
    const colour = useColours ? colours.find((c) => same(c.name, l.variant))?.key ?? NO_COLOUR : NO_COLOUR;
    const size = sizes.find((s) => same(s, l.size)) ?? "";
    qty[cell(colour, size)] = l.quantity;
    if (l.cost !== undefined) cost[cell(colour, size)] = l.cost;
    if (l.sale !== undefined) sale[cell(colour, size)] = l.sale;
  }
  // colour × size / model pairs that have no line aren't stocked
  const off: Record<string, true> = {};
  if (useColours && sizes.length) {
    for (const c of colours) {
      for (const s of sizes) {
        if (!lines.some((l) => same(l.variant, c.name) && same(l.size, s))) off[cell(c.key, s)] = true;
      }
    }
  }
  const usePrices = Object.keys(cost).length + Object.keys(sale).length > 0;
  return {
    models,
    useSizes: models || sizes.length > 0,
    useColours,
    sizes,
    colours,
    qty,
    usePrices,
    cost,
    sale,
    off,
  };
}

type Props = {
  value: StockGrid;
  onChange: (next: StockGrid) => void;
  // product photos a colour can be linked to (the size guide left out)
  photos: GridPhoto[];
  // the category's usual sizes, offered as one-tap chips
  presetSizes: string[];
  // the product's own prices, used where a colour / size has none
  productPrices?: ProductPrices;
  disabled?: boolean;
  // a new photo picked for a colour: it replaces that colour's photo (same
  // spot) or is added and linked to it
  onNewPhoto?: (colourKey: string, file: File) => void;
};

export default function VariantStockEditor({
  value: g,
  onChange,
  photos,
  presetSizes,
  productPrices,
  disabled,
  onNewPhoto,
}: Props) {
  const { t } = useLang();
  const [newSize, setNewSize] = useState("");
  // colour whose photo chooser is open
  const [choosing, setChoosing] = useState<string | null>(null);
  // per colour: phone model just added (or already there), shown under its box
  const [justAdded, setJustAdded] = useState<Record<string, string>>({});
  // per colour: the phone model being typed
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // colours whose phone models get prices of their own
  const [openPrices, setOpenPrices] = useState<string[]>([]);

  const set = (patch: Partial<StockGrid>) => onChange({ ...g, ...patch });

  // own price of some cells; blank goes back to the product's price
  const setPrice = (kind: "cost" | "sale", cells: string[], raw: string) => {
    const next = { ...g[kind] };
    const n = Number(raw);
    for (const c of cells) {
      if (raw.trim() === "" || Number.isNaN(n) || n < 0) delete next[c];
      else next[c] = n;
    }
    set({ [kind]: next });
  };
  // the price all `cells` share, "" when they differ or have none
  const sharedPrice = (kind: "cost" | "sale", cells: string[]) => {
    if (!cells.length) return "";
    const values = cells.map((c) => g[kind][c]);
    return values.every((v) => v !== undefined && v === values[0]) ? String(values[0]) : "";
  };
  // sale in green, cost in orange, so the two are easy to tell apart
  const priceInput = (kind: "cost" | "sale", cells: string[], label: string, compact = false) => (
    <label className={`flex min-w-0 items-center gap-1 ${compact ? "" : "flex-1"}`}>
      <span
        className={`shrink-0 text-[10px] font-semibold uppercase ${
          kind === "sale" ? "text-emerald-700" : "text-orange-600"
        }`}
      >
        {label}
      </span>
      <input
        type="number"
        min="0"
        inputMode="decimal"
        value={sharedPrice(kind, cells)}
        disabled={disabled}
        onWheel={(e) => e.currentTarget.blur()}
        onChange={(e) => setPrice(kind, cells, e.target.value)}
        placeholder={String((kind === "sale" ? productPrices?.sale : productPrices?.cost) ?? 0)}
        className={`h-8 w-full min-w-0 rounded-md border px-1.5 text-xs outline-none ${
          kind === "sale"
            ? cells.some((c) => g[kind][c] !== undefined)
              ? "border-emerald-300 bg-white font-semibold text-emerald-800 focus:border-emerald-500"
              : "border-emerald-200 bg-emerald-50/60 text-emerald-700 placeholder:text-emerald-400 focus:border-emerald-400"
            : cells.some((c) => g[kind][c] !== undefined)
              ? "border-orange-300 bg-white font-semibold text-orange-800 focus:border-orange-500"
              : "border-orange-200 bg-orange-50/60 text-orange-700 placeholder:text-orange-400 focus:border-orange-400"
        }`}
        aria-label={label}
      />
    </label>
  );
  const setQty = (colour: string, size: string, n: number) =>
    set({ qty: { ...g.qty, [cell(colour, size)]: Math.max(0, Math.floor(n) || 0) } });

  const addSize = (raw: string) => {
    const size = cleanSize(raw);
    if (!size || g.sizes.some((s) => same(s, size))) return;
    set({ sizes: [...g.sizes, size] });
  };
  const removeSize = (size: string) => set({ sizes: g.sizes.filter((s) => s !== size) });
  // a colour is / isn't stocked for one size / phone model
  const setOff = (colour: string, size: string, isOffNow: boolean) => {
    const off = { ...g.off };
    if (isOffNow) off[cell(colour, size)] = true;
    else delete off[cell(colour, size)];
    set({ off });
  };

  const toggleSizes = (on: boolean) =>
    set({ useSizes: on, sizes: on && g.sizes.length === 0 ? [...presetSizes] : g.sizes });

  const toggleColours = (on: boolean) => {
    const sizeList = g.useSizes ? g.sizes : [""];
    const hasAny = (colour: string) =>
      sizeList.some((s) => {
        const k = cell(colour, s);
        return (g.qty[k] || 0) > 0 || g.cost[k] !== undefined || g.sale[k] !== undefined;
      });
    if (on) {
      // start with one colour per photo, so the usual case is one tap
      const colours = g.colours.length
        ? g.colours
        : (photos.length ? photos : [null]).map((p, i) => ({
            key: newKey(),
            name: photos.length > 1 ? `${t("Colour")} ${i + 1}` : "",
            photoKey: p?.key ?? null,
          }));
      // stock and prices typed before colours were turned on move to the
      // first colour instead of being lost
      const qty = { ...g.qty };
      const cost = { ...g.cost };
      const sale = { ...g.sale };
      const off = { ...g.off };
      if (hasAny(NO_COLOUR) && !colours.some((c) => hasAny(c.key))) {
        const first = colours[0].key;
        for (const s of sizeList) {
          const from = cell(NO_COLOUR, s);
          const to = cell(first, s);
          if (g.qty[from]) qty[to] = g.qty[from];
          if (g.cost[from] !== undefined) cost[to] = g.cost[from];
          if (g.sale[from] !== undefined) sale[to] = g.sale[from];
          delete off[to];
        }
      }
      // covers are set up colour first: new colours after the first start
      // without phone models, which are then added inside each colour
      if (g.models && !g.colours.length) {
        for (const c of colours.slice(1)) for (const s of g.sizes) off[cell(c.key, s)] = true;
      }
      set({ useColours: true, colours, qty, cost, sale, off });
      return;
    }
    // colours turned off: each size / model keeps the stock of all its colours
    const qty = { ...g.qty };
    const cost = { ...g.cost };
    const sale = { ...g.sale };
    if (!hasAny(NO_COLOUR)) {
      for (const s of sizeList) {
        const stocked = g.colours.filter((c) => !isOff(g, cell(c.key, s)));
        const sum = stocked.reduce((n, c) => n + (g.qty[cell(c.key, s)] || 0), 0);
        if (sum) qty[cell(NO_COLOUR, s)] = sum;
        const priced = (kind: "cost" | "sale") =>
          stocked.map((c) => g[kind][cell(c.key, s)]).find((v) => v !== undefined);
        const c0 = priced("cost");
        const s0 = priced("sale");
        if (c0 !== undefined) cost[cell(NO_COLOUR, s)] = c0;
        if (s0 !== undefined) sale[cell(NO_COLOUR, s)] = s0;
      }
    }
    set({ useColours: false, qty, cost, sale });
  };

  const updateColour = (key: string, patch: Partial<StockColour>) =>
    set({
      colours: g.colours.map((c) => {
        if (c.key === key) return { ...c, ...patch };
        // a photo shows one colour: unlink it from the others
        if (patch.photoKey && c.photoKey === patch.photoKey) return { ...c, photoKey: null };
        return c;
      }),
    });

  const addColour = () => {
    const used = new Set(g.colours.map((c) => c.photoKey));
    const free = photos.find((p) => !used.has(p.key));
    const key = newKey();
    set({ colours: [...g.colours, { key, name: "", photoKey: free?.key ?? null }] });
  };
  const removeColour = (key: string) => set({ colours: g.colours.filter((c) => c.key !== key) });

  const photoOf = (photoKey: string | null) => photos.find((p) => p.key === photoKey) ?? null;
  const sizes = g.useSizes ? g.sizes : [""];
  const total = gridTotal(g);
  // phone models are suggested while typing instead of shown as chips
  const missingPresets = g.models ? [] : presetSizes.filter((p) => !g.sizes.some((s) => same(s, p)));
  const word = g.models
    ? {
        title: t("This cover comes in phone models"),
        hint: t("Set the stock for each phone model (iPhone 13, iPhone 15 Pro Max...)."),
        list: t("Phone models"),
        add: t("Add model"),
        remove: t("Remove model"),
        placeholder: t("Phone model (e.g. iPhone 16 Pro Max)"),
        empty: t("Add phone models above."),
        count: t("models"),
        samePrice: t("Same price for all models"),
        colours: t("Each colour gets its own photo and stock. Customers pick the colour, then see the phone models left in it."),
        prices: t("Different prices for some colours / models"),
        pricesHint: t("Set a selling and cost price for each colour or model. Leave a box empty to use the product's price."),
      }
    : {
        title: t("This product comes in sizes"),
        hint: t("Set the stock for each size (S, M, L...). Preset sizes can be saved on the category."),
        list: t("Sizes"),
        add: t("Add size"),
        remove: t("Remove size"),
        placeholder: t("New size (e.g. XL, 42, Free size)"),
        empty: t("Add sizes above."),
        count: t("sizes"),
        samePrice: t("Same price for all sizes"),
        colours: t("Each colour gets its own photo and stock. Customers pick the colour, then see the sizes left in it."),
        prices: t("Different prices for some colours / sizes"),
        pricesHint: t("Set a selling and cost price for each colour or size. Leave a box empty to use the product's price."),
      };

  const toggle = (checked: boolean, onToggle: (v: boolean) => void, title: string, hint: string) => (
    <label className="flex min-h-11 cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300"
      />
      <span>
        <span className="block text-sm font-medium text-slate-700">{title}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
    </label>
  );

  const stepper = (colour: string, size: string, label?: string) => {
    const n = g.qty[cell(colour, size)] || 0;
    return (
      <div key={size || "_"} className="min-w-0">
        {label !== undefined && (
          <span className="mb-1 block truncate text-center text-xs font-semibold text-slate-600">{label}</span>
        )}
        <div className="flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white">
          <button
            type="button"
            disabled={disabled || n <= 0}
            onClick={() => setQty(colour, size, n - 1)}
            className="flex w-9 shrink-0 items-center justify-center text-slate-600 active:bg-slate-100 disabled:opacity-30"
            aria-label={`${t("Fewer")} ${label ?? ""}`}
          >
            <Minus size={14} />
          </button>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={String(n)}
            disabled={disabled}
            onFocus={(e) => e.currentTarget.select()}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) => setQty(colour, size, e.target.value === "" ? 0 : parseInt(e.target.value, 10))}
            className="h-10 w-full min-w-0 border-x border-slate-200 text-center text-sm font-semibold outline-none focus:bg-slate-50"
            aria-label={`${t("Quantity for")} ${label ?? ""}`}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => setQty(colour, size, n + 1)}
            className="flex w-9 shrink-0 items-center justify-center text-slate-600 active:bg-slate-100 disabled:opacity-30"
            aria-label={`${t("Add one")} ${label ?? ""}`}
          >
            <Plus size={14} />
          </button>
        </div>
        {g.usePrices && (
          <div className="mt-1 space-y-1">
            {priceInput("sale", [cell(colour, size)], t("Sell"))}
            {priceInput("cost", [cell(colour, size)], t("Cost"))}
          </div>
        )}
      </div>
    );
  };

  // one price for every size of a colour
  const colourPrices = (colour: string) =>
    g.usePrices && g.useSizes && g.sizes.length > 1 ? (
      <div className="mb-2 rounded-lg bg-slate-50 p-2">
        <p className="mb-1 text-[11px] font-medium text-slate-500">{word.samePrice}</p>
        <div className="flex gap-2">
          {priceInput("sale", g.sizes.map((s) => cell(colour, s)), t("Sell"))}
          {priceInput("cost", g.sizes.map((s) => cell(colour, s)), t("Cost"))}
        </div>
      </div>
    ) : null;

  // quantities for one colour (or for the product when there are no colours)
  const quantities = (colour: string) =>
    g.useSizes ? (
      g.sizes.length ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {g.sizes.map((s) => stepper(colour, s, s))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">{word.empty}</p>
      )
    ) : (
      <div className="max-w-40">{stepper(colour, "", t("Quantity"))}</div>
    );

  if (g.models) {
    const colourList = g.useColours ? g.colours : [{ key: NO_COLOUR, name: "", photoKey: null }];
    // phone models one colour comes in, newest first
    const modelsOf = (colour: string) =>
      [...g.sizes].filter((m) => !isOff(g, cell(colour, m))).sort(compareModels);

    // add a phone model inside one colour
    const addModelTo = (colour: string, raw: string) => {
      const typed = cleanSize(raw);
      if (!typed) return;
      const found = g.sizes.find((s) => same(s, typed));
      const m = found ?? typed;
      const say = (text: string) => setJustAdded({ ...justAdded, [colour]: text });
      setDrafts({ ...drafts, [colour]: "" });
      if (found && !isOff(g, cell(colour, found))) return say(`${m} ${t("is already added")}`);
      say(`✓ ${m} ${t("added")}`);
      if (found) {
        const off = { ...g.off };
        delete off[cell(colour, found)];
        return set({ off });
      }
      // a new model: only this colour has it so far
      const off = { ...g.off };
      if (g.useColours) for (const c of g.colours) if (c.key !== colour) off[cell(c.key, m)] = true;
      set({ sizes: [...g.sizes, m], off });
    };

    // take a phone model out of one colour; gone from every colour = removed
    const removeModelFrom = (colour: string, m: string) => {
      const k = cell(colour, m);
      const n = g.qty[k] || 0;
      const label = g.useColours ? `${colourName(colour)} ${m}` : m;
      if (n > 0 && !window.confirm(`${t("Remove")} ${label}? ${t("Its stock")} (${n}) ${t("will be removed when you save.")}`)) return;
      const qty = { ...g.qty };
      const cost = { ...g.cost };
      const sale = { ...g.sale };
      delete qty[k];
      delete cost[k];
      delete sale[k];
      const off = { ...g.off };
      if (g.useColours) off[k] = true;
      const stillUsed = g.useColours && g.colours.some((c) => !(c.key === colour ? true : off[cell(c.key, m)]));
      if (stillUsed) return set({ qty, cost, sale, off });
      for (const c of colourList) delete off[cell(c.key, m)];
      set({ sizes: g.sizes.filter((s) => s !== m), qty, cost, sale, off });
    };

    // a new colour starts empty: its phone models are added inside it
    const addColourCard = () => {
      const used = new Set(g.colours.map((c) => c.photoKey));
      const free = photos.find((p) => !used.has(p.key));
      const key = newKey();
      const off = { ...g.off };
      for (const m of g.sizes) off[cell(key, m)] = true;
      set({ colours: [...g.colours, { key, name: "", photoKey: free?.key ?? null }], off });
    };

    const colourName = (key: string) => {
      const c = g.colours.find((x) => x.key === key);
      return c?.name.trim() || `${t("Colour")} ${c ? g.colours.indexOf(c) + 1 : ""}`.trim();
    };

    // quantity box with - and + (no prices)
    const qtyBox = (colour: string, m: string, label: string) => {
      const k = cell(colour, m);
      const n = g.qty[k] || 0;
      return (
        <div className="flex h-10 shrink-0 items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white">
          <button
            type="button"
            disabled={disabled || n <= 0}
            onClick={() => setQty(colour, m, n - 1)}
            className="flex w-10 items-center justify-center text-slate-600 active:bg-slate-100 disabled:opacity-30"
            aria-label={`${t("Fewer")} ${label}`}
          >
            <Minus size={14} />
          </button>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={String(n)}
            disabled={disabled}
            onFocus={(e) => e.currentTarget.select()}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) => setQty(colour, m, e.target.value === "" ? 0 : parseInt(e.target.value, 10))}
            className="w-12 border-x border-slate-200 text-center text-sm font-semibold outline-none focus:bg-slate-50"
            aria-label={`${t("Quantity for")} ${label}`}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => setQty(colour, m, n + 1)}
            className="flex w-10 items-center justify-center text-slate-600 active:bg-slate-100 disabled:opacity-30"
            aria-label={`${t("Add one")} ${label}`}
          >
            <Plus size={14} />
          </button>
        </div>
      );
    };
    // some phone models of this colour have prices of their own
    const pricesDiffer = (cells: string[]) =>
      (["sale", "cost"] as const).some(
        (kind) => cells.some((c) => g[kind][c] !== undefined) && sharedPrice(kind, cells) === "",
      );

    // add a phone model: tap a suggestion or type any other phone
    const modelAdder = (colour: string) => {
      const value = drafts[colour] ?? "";
      const words = value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const mine = modelsOf(colour);
      // models other colours already have come first, then the iPhone list
      const pool: string[] = [];
      for (const m of [...[...g.sizes].sort(compareModels), ...IPHONE_MODELS]) {
        if (!mine.some((x) => same(x, m)) && !pool.some((x) => same(x, m))) pool.push(m);
      }
      const suggestions = words.length
        ? pool.filter((m) => words.every((w) => m.toLowerCase().includes(w))).slice(0, 12)
        : pool.slice(0, 8);
      const exact = pool.some((m) => same(m, value)) || mine.some((m) => same(m, value));
      const note = justAdded[colour];
      return (
        <div className="space-y-2 rounded-lg bg-slate-50 p-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => {
                setDrafts({ ...drafts, [colour]: e.target.value });
                if (note) setJustAdded({ ...justAdded, [colour]: "" });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (value.trim())
                    addModelTo(colour, words.length && suggestions.length === 1 && !exact ? suggestions[0] : value);
                }
              }}
              disabled={disabled}
              enterKeyHint="done"
              autoCapitalize="words"
              placeholder={t("Search or type a phone (e.g. 15 pro, Samsung S24)")}
              className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-base outline-none focus:border-slate-400 sm:text-sm"
            />
            <button
              type="button"
              onClick={() => addModelTo(colour, value)}
              disabled={disabled || !value.trim()}
              className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300"
            >
              <Plus size={14} /> {t("Add")}
            </button>
          </div>
          {note && <p className="text-xs font-medium text-emerald-700">{note}</p>}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={disabled}
                  onClick={() => addModelTo(colour, m)}
                  className="inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 active:bg-slate-100"
                >
                  <Plus size={11} /> {m}
                </button>
              ))}
            </div>
          )}
          {words.length > 0 && !exact && suggestions.length === 0 && (
            <p className="text-xs text-slate-500">{t("Not in the list. Tap Add to add it as a new phone model.")}</p>
          )}
        </div>
      );
    };

    // one colour's (or the product's) phone models with their stock and prices
    const modelList = (colour: string) => {
      const mine = modelsOf(colour);
      const cells = mine.map((m) => cell(colour, m));
      const perModel = g.usePrices && mine.length > 1 && (openPrices.includes(colour) || pricesDiffer(cells));
      return (
        <div className="space-y-2">
          {g.usePrices && mine.length > 0 && (
            <div className="rounded-lg bg-slate-50 p-2">
              {mine.length > 1 && (
                <p className="mb-1 text-[11px] font-medium text-slate-500">{t("Same price for all models")}</p>
              )}
              <div className="flex gap-2">
                {priceInput("sale", cells, t("Sell"))}
                {priceInput("cost", cells, t("Cost"))}
              </div>
              {mine.length > 1 && !perModel && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setOpenPrices([...openPrices, colour])}
                  className="mt-1.5 text-xs font-medium text-blue-600"
                >
                  {t("Different price for each model")}
                </button>
              )}
            </div>
          )}
          {mine.map((m) => {
            const label = g.useColours ? `${colourName(colour)} ${m}` : m;
            return (
              <div key={m}>
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{m}</span>
                  {qtyBox(colour, m, label)}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeModelFrom(colour, m)}
                    className="shrink-0 rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`${t("Remove model")} ${label}`}
                    title={t("Remove model")}
                  >
                    <X size={15} />
                  </button>
                </div>
                {perModel && (
                  <div className="mt-1 flex gap-2 pl-2">
                    {priceInput("sale", [cell(colour, m)], t("Sell"))}
                    {priceInput("cost", [cell(colour, m)], t("Cost"))}
                  </div>
                )}
              </div>
            );
          })}
          {mine.length === 0 && (
            <p className="text-xs text-amber-700">
              {g.useColours ? t("Add the phone models this colour comes in.") : t("Add phone models below.")}
            </p>
          )}
          {modelAdder(colour)}
        </div>
      );
    };

    // pick, upload or clear a colour's photo
    const photoChooser = (c: StockColour) => (
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {photos.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => {
              updateColour(c.key, { photoKey: p.key });
              setChoosing(null);
            }}
            className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${
              p.key === c.photoKey ? "border-blue-500" : "border-transparent"
            }`}
          >
            <Image
              src={coverImage(p.preview, 320)}
              alt=""
              width={112}
              height={112}
              unoptimized={p.local}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
        {onNewPhoto && (
          <label
            className="flex h-14 w-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 text-[10px] font-medium text-blue-700 hover:bg-blue-100"
            title={t("Upload a new photo for this colour")}
          >
            <ImagePlus size={14} />
            {c.photoKey ? t("Replace") : t("New photo")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onNewPhoto(c.key, file);
                setChoosing(null);
              }}
            />
          </label>
        )}
        <button
          type="button"
          onClick={() => {
            updateColour(c.key, { photoKey: null });
            setChoosing(null);
          }}
          className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-[10px] text-slate-500"
        >
          <ImageOff size={14} />
          {t("No photo")}
        </button>
        {photos.length === 0 && (
          <p className="self-center text-xs text-slate-500">{t("Add photos at the top first.")}</p>
        )}
      </div>
    );

    return (
      <div className="space-y-4">
        {toggle(
          g.useColours,
          toggleColours,
          t("This cover comes in colours / styles"),
          t("Add a colour first, then the phone models it comes in, with the stock of each."),
        )}

        {g.useColours ? (
          <div className="space-y-3">
            {g.colours.map((c, i) => {
              const photo = photoOf(c.photoKey);
              const stock = modelsOf(c.key).reduce((n, m) => n + (g.qty[cell(c.key, m)] || 0), 0);
              return (
                <div key={c.key} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setChoosing(choosing === c.key ? null : c.key)}
                      className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border ${
                        choosing === c.key ? "border-blue-500 ring-2 ring-blue-500/30" : "border-slate-200"
                      } bg-slate-50`}
                      aria-label={t("Choose photo")}
                      title={t("Choose photo")}
                    >
                      {photo ? (
                        <Image
                          src={coverImage(photo.preview, 320)}
                          alt=""
                          width={88}
                          height={88}
                          unoptimized={photo.local}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full flex-col items-center justify-center text-[9px] text-slate-400">
                          <ImageOff size={14} />
                          {t("Photo")}
                        </span>
                      )}
                    </button>
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => updateColour(c.key, { name: e.target.value })}
                      disabled={disabled}
                      autoCapitalize="words"
                      placeholder={`${t("Colour / style name")} ${i + 1}`}
                      className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-base font-medium outline-none focus:border-slate-400 sm:text-sm"
                    />
                    <span className="shrink-0 text-xs text-slate-500">
                      {t("stock")} <span className="font-semibold text-slate-700">{stock}</span>
                    </span>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => removeColour(c.key)}
                      className="rounded-lg p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={t("Remove colour")}
                      title={t("Remove colour")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {choosing === c.key && photoChooser(c)}
                  <div className="mt-3 border-l-2 border-slate-100 pl-3">{modelList(c.key)}</div>
                </div>
              );
            })}
            <button
              type="button"
              disabled={disabled}
              onClick={addColourCard}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-sm font-medium text-slate-600 hover:bg-white"
            >
              <Plus size={16} /> {t("Add colour / style")}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{t("Phone models")}</p>
            {modelList(NO_COLOUR)}
          </div>
        )}

        {toggle(
          g.usePrices,
          (on) => set({ usePrices: on }),
          t("Different prices for some colours / models"),
          t("Set a selling and cost price for each colour or phone model. Leave a box empty to use the product's price."),
        )}

        <p className="text-xs text-slate-500">
          {g.useColours && `${g.colours.length} ${t("colours")} · `}
          {`${g.sizes.length} ${t("models")} · `}
          {t("total stock")} <span className="font-semibold text-slate-700">{total}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toggle(
        g.useSizes,
        toggleSizes,
        word.title,
        word.hint,
      )}

      {g.useSizes && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{word.list}</p>
          <div className="flex flex-wrap gap-2">
            {g.sizes.map((s) => (
              <span
                key={s}
                className="inline-flex h-9 items-center gap-1 rounded-full bg-slate-900 pl-3 pr-1 text-sm font-semibold text-white"
              >
                {s}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeSize(s)}
                  className="rounded-full p-1.5 text-white/70 hover:bg-white/20 hover:text-white"
                  aria-label={`${word.remove} ${s}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {missingPresets.map((s) => (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => addSize(s)}
                className="inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Plus size={12} /> {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSize(newSize);
                  setNewSize("");
                }
              }}
              disabled={disabled}
              list={g.models ? "grid-phone-models" : undefined}
              placeholder={word.placeholder}
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
            />
            <button
              type="button"
              onClick={() => {
                addSize(newSize);
                setNewSize("");
              }}
              disabled={disabled || !newSize.trim()}
              className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <Plus size={14} /> {word.add}
            </button>
          </div>
          {g.models && (
            <datalist id="grid-phone-models">
              {IPHONE_MODELS.filter((m) => !g.sizes.some((s) => same(s, m))).map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          )}
        </div>
      )}

      {toggle(
        g.useColours,
        toggleColours,
        t("This product comes in colours / styles"),
        word.colours,
      )}

      {g.useColours ? (
        <div className="space-y-3">
          {g.colours.map((c, i) => {
            const photo = photoOf(c.photoKey);
            return (
              <div key={c.key} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setChoosing(choosing === c.key ? null : c.key)}
                    className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border ${
                      choosing === c.key ? "border-blue-500 ring-2 ring-blue-500/30" : "border-slate-200"
                    } bg-slate-50`}
                    aria-label={t("Choose photo")}
                    title={t("Choose photo")}
                  >
                    {photo ? (
                      <Image
                        src={coverImage(photo.preview, 320)}
                        alt=""
                        width={112}
                        height={112}
                        unoptimized={photo.local}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full flex-col items-center justify-center text-[10px] text-slate-400">
                        <ImageOff size={16} />
                        {t("Photo")}
                      </span>
                    )}
                  </button>
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => updateColour(c.key, { name: e.target.value })}
                    disabled={disabled}
                    placeholder={`${t("Colour / style name")} ${i + 1}`}
                    className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm font-medium outline-none focus:border-slate-400"
                  />
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeColour(c.key)}
                    className="rounded-lg p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={t("Remove colour")}
                    title={t("Remove colour")}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {choosing === c.key && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                    {photos.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => {
                          updateColour(c.key, { photoKey: p.key });
                          setChoosing(null);
                        }}
                        className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                          p.key === c.photoKey ? "border-blue-500" : "border-transparent"
                        }`}
                      >
                        <Image
                          src={coverImage(p.preview, 320)}
                          alt=""
                          width={128}
                          height={128}
                          unoptimized={p.local}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                    {onNewPhoto && (
                      <label
                        className="flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 text-[10px] font-medium text-blue-700 hover:bg-blue-100"
                        title={t("Upload a new photo for this colour")}
                      >
                        <ImagePlus size={14} />
                        {c.photoKey ? t("Replace") : t("New photo")}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={disabled}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file) onNewPhoto(c.key, file);
                            setChoosing(null);
                          }}
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        updateColour(c.key, { photoKey: null });
                        setChoosing(null);
                      }}
                      className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-[10px] text-slate-500"
                    >
                      <ImageOff size={16} />
                      {t("No photo")}
                    </button>
                    {photos.length === 0 && (
                      <p className="self-center text-xs text-slate-500">{t("Add photos at the top first.")}</p>
                    )}
                  </div>
                )}

                <div className="mt-3">
                  {colourPrices(c.key)}
                  {quantities(c.key)}
                </div>
              </div>
            );
          })}
          <button
            type="button"
            disabled={disabled}
            onClick={addColour}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-sm font-medium text-slate-600 hover:bg-white"
          >
            <Plus size={16} /> {t("Add colour / style")}
          </button>
        </div>
      ) : (
        g.useSizes && <div className="rounded-xl border border-slate-200 bg-white p-3">{quantities(NO_COLOUR)}</div>
      )}

      {gridActive(g) &&
        toggle(
          g.usePrices,
          (on) => set({ usePrices: on }),
          word.prices,
          word.pricesHint,
        )}

      {gridActive(g) && (
        <p className="text-xs text-slate-500">
          {g.useColours && `${g.colours.length} ${t("colours")} · `}
          {g.useSizes && `${sizes.length} ${word.count} · `}
          {t("total stock")} <span className="font-semibold text-slate-700">{total}</span>
        </p>
      )}
    </div>
  );
}
