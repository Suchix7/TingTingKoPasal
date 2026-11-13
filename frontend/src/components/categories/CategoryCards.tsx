"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Edit,
  FolderTree,
  GripVertical,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSaveCategoryOrder, type ShopOrderCategory } from "@/hooks/useCategories";
import { useLang } from "@/lib/i18n";
import { Skeleton } from "@/components/layout/Skeleton";

type Props = {
  // every category, in the saved shop order
  categories: ShopOrderCategory[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  search: string;
  onAdd: () => void;
  onEdit: (c: ShopOrderCategory) => void;
  onDelete: (c: ShopOrderCategory) => void;
};

// The categories as cards, in the order customers see them on the shop.
// Drag a card by its handle (mouse or finger) or use the arrows to move it;
// nothing changes on the shop until "Save order".
export default function CategoryCards({
  categories,
  loading,
  error,
  onRetry,
  search,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const { t, lang } = useLang();
  const save = useSaveCategoryOrder();
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const cards = useRef(new Map<string, HTMLLIElement>());

  const savedIds = useMemo(() => categories.map((c) => c.id), [categories]);
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  // the order on screen: moved cards first, then any category added meanwhile
  const ordered = useMemo(() => {
    const ids = orderIds.filter((id) => byId.has(id));
    for (const id of savedIds) if (!ids.includes(id)) ids.push(id);
    return ids.map((id) => byId.get(id)!);
  }, [orderIds, savedIds, byId]);
  const dirty = ordered.map((c) => c.id).join(",") !== savedIds.join(",");

  // a fresh saved order replaces the screen order unless there are unsaved moves
  useEffect(() => {
    if (!dirty) setOrderIds(savedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedIds.join(",")]);

  const q = search.trim().toLowerCase();
  const shown = q
    ? ordered.filter((c) =>
        [c.category_name, c.category_name_zh, c.description]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q)),
      )
    : ordered;
  // moving only makes sense on the full list
  const canMove = !q;

  const name = (c: ShopOrderCategory) => (lang === "zh" && c.category_name_zh) || c.category_name;
  const other = (c: ShopOrderCategory) =>
    lang === "zh" ? (c.category_name_zh ? c.category_name : null) : c.category_name_zh;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ordered.length || from === to) return;
    const ids = ordered.map((c) => c.id);
    const [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    setOrderIds(ids);
  };

  // dragging: the card follows the finger from slot to slot
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragId) return;
    const y = e.clientY;
    const from = ordered.findIndex((c) => c.id === dragId);
    let to = 0;
    for (const c of ordered) {
      if (c.id === dragId) continue;
      const r = cards.current.get(c.id)?.getBoundingClientRect();
      if (r && r.top + r.height / 2 < y) to++;
    }
    if (to !== from) move(from, to);
    // near the top or bottom of the page area: scroll along
    const main = document.querySelector("main");
    if (main) {
      const m = main.getBoundingClientRect();
      if (y < m.top + 80) main.scrollBy(0, -14);
      else if (y > m.bottom - 80) main.scrollBy(0, 14);
    }
  };

  const onSave = async () => {
    try {
      await save.mutateAsync(ordered.map((c) => c.id));
      toast.success(t("Shop order saved"));
    } catch (err: unknown) {
      const reason = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(t(reason || "Failed to save the order"));
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-500">
        {t("Couldn't load categories.")}{" "}
        <button type="button" onClick={onRetry} className="font-semibold text-gray-800 underline">
          {t("Try again")}
        </button>
      </div>
    );
  }
  if (shown.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-16 text-center">
        <FolderTree className="mx-auto mb-3 text-gray-300" size={48} />
        <h3 className="text-base font-semibold text-gray-900">{t("No categories found")}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {q ? t("Try adjusting your search terms") : t("Add your first category to organize products")}
        </p>
        {!q && (
          <button
            onClick={onAdd}
            className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            <Plus size={16} />
            {t("Add Category")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 px-1 text-sm text-gray-500">
        {canMove
          ? t("This is the order customers see on the shop. Drag a card by its handle, or use the arrows, then save.")
          : t("Clear the search to change the order.")}
      </p>

      {/* no text highlighting while a card is being dragged */}
      <ol className={`space-y-3 ${dragId ? "select-none" : ""}`}>
        {shown.map((c) => {
          const i = ordered.indexOf(c);
          const dragging = dragId === c.id;
          return (
            <li
              key={c.id}
              ref={(el) => {
                if (el) cards.current.set(c.id, el);
                else cards.current.delete(c.id);
              }}
              className={`flex gap-2 rounded-2xl border bg-white p-3 transition-shadow sm:gap-3 sm:p-4 ${
                dragging
                  ? "relative z-10 border-gray-900/20 shadow-xl ring-2 ring-gray-900/10"
                  : "border-gray-200 hover:shadow-sm"
              }`}
            >
              {canMove && (
                <button
                  type="button"
                  aria-label={`${t("Drag to move")} ${name(c)}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDragId(c.id);
                  }}
                  onPointerMove={onDragMove}
                  onPointerUp={() => setDragId(null)}
                  onPointerCancel={() => setDragId(null)}
                  // a finger drags the card instead of scrolling the page (set
                  // here: the site-wide button style would win over a class)
                  style={{ touchAction: "none" }}
                  className={`-my-1 -ml-1 flex w-8 shrink-0 touch-none flex-col items-center justify-center gap-1 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 sm:w-9 ${
                    dragging ? "cursor-grabbing bg-gray-100 text-gray-900" : "cursor-grab"
                  }`}
                >
                  <span className="text-xs font-bold tabular-nums text-gray-500">{i + 1}</span>
                  <GripVertical size={20} />
                </button>
              )}

              {c.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.thumbnail_url}
                  alt=""
                  draggable={false}
                  className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-gray-200 sm:h-16 sm:w-16"
                />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-300 sm:h-16 sm:w-16">
                  <FolderTree size={22} />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{name(c)}</p>
                    {other(c) && <p className="truncate text-xs text-gray-500">{other(c)}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {c.products} {t(c.products === 1 ? "product" : "products")}
                  </span>
                </div>
                {(c.sizes?.length ?? 0) > 0 && (
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {t("Sizes")}: {c.sizes!.join(", ")}
                  </p>
                )}
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">{c.description}</p>
                )}

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEdit(c)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-gray-600 transition hover:bg-blue-50 hover:text-blue-600"
                      aria-label={t("Edit category")}
                    >
                      <Edit size={16} />
                      <span className="hidden sm:inline">{t("Edit")}</span>
                    </button>
                    <button
                      onClick={() => onDelete(c)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-600"
                      aria-label={t("Delete category")}
                    >
                      <Trash2 size={16} />
                      <span className="hidden sm:inline">{t("Delete")}</span>
                    </button>
                  </div>
                  {canMove && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => move(i, i - 1)}
                        disabled={i === 0}
                        aria-label={`${t("Move up")}: ${name(c)}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, i + 1)}
                        disabled={i === ordered.length - 1}
                        aria-label={`${t("Move down")}: ${name(c)}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 px-1 text-xs text-gray-500">
        {t("A category shows on the shop once it has a product with a photo.")}
      </p>

      {/* unsaved moves: a bar that stays in view */}
      {dirty && (
        <div className="sticky bottom-3 z-20 mt-4 flex items-center justify-between gap-3 rounded-2xl bg-gray-900 px-4 py-3 text-white shadow-xl">
          <span className="text-sm font-medium">{t("You changed the order")}</span>
          <span className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setOrderIds(savedIds)}
              disabled={save.isPending}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-sm font-medium hover:bg-white/20 disabled:opacity-50"
            >
              <RotateCcw size={15} />
              {t("Undo")}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={save.isPending}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-60"
            >
              {save.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {t("Save order")}
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
