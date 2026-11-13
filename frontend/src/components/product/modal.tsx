"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { coverImage } from "@/components/catalog/image";
import toast from "react-hot-toast";
import {
  useCreateProduct,
  useUpdateProduct,
  useSaveProductPhotos,
  type Product,
} from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import {
  initialFormData,
  type ProductFormData,
} from "@/components/tabs/ProductTab";
import type { ProductBatch } from "@/hooks/useProducts";
import { useDebounced } from "@/hooks/useDebounced";
import VariantStockEditor, {
  coverGrid,
  emptyGrid,
  gridActive,
  gridFromProduct,
  gridProblem,
  gridToLines,
  type StockGrid,
} from "./VariantStockEditor";
import { DropdownWithSearch } from "../layout/DropdownWithSearch";
import CategoriesModal from "../categories/modal";
import BatchModal from "../product-batch/modal";
import { GripHorizontal, ImagePlus, Play, RefreshCw, Ruler, Star, X } from "lucide-react";
import { useLang } from "@/lib/i18n";

const MAX_PHOTOS = 10;
// Cloudinary's limits for a single upload on the plan in use
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 100;

// A photo or video in the form: one already saved, or a picked file not
// uploaded yet. `preview` is what the tile shows.
type PhotoItem =
  | { kind: "saved"; id: string; type: "image" | "video"; preview: string }
  | {
      kind: "new";
      key: string;
      type: "image" | "video";
      file: File;
      preview: string;
    };

// Stock lines saved without colour / size / model parts (covers made before
// phone models were kept apart are named only by their batch number)
const partless = (batches: ProductBatch[]) =>
  batches.length > 0 && batches.every((b) => !b.model && !b.variant && !b.size);

const photoKey = (p: PhotoItem) => (p.kind === "saved" ? p.id : p.key);

export default function ProductModal({
  closeModal,
  selectedProduct,
}: {
  closeModal: () => void;
  selectedProduct?: Product | null;
}) {
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const { t, lang, refreshNames } = useLang();
  // Chinese name, shown instead of the English one when the panel is in Chinese
  const [nameZh, setNameZh] = useState("");

  // names changed here should show up right away once the form closes
  useEffect(() => () => refreshNames(), [refreshNames]);
  const [searchCategoryTerm, setSearchCategoryTerm] = useState("");
  const debouncedSearchCategoryTerm = useDebounced(searchCategoryTerm, 300);
  const { data: categoriesData, isLoading: isCategoriesLoading } =
    useCategories(1, 50, debouncedSearchCategoryTerm);

  const categories = categoriesData?.data || [];
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const savePhotosMutation = useSaveProductPhotos();

  const isSubmitting =
    createProductMutation.isPending ||
    updateProductMutation.isPending ||
    savePhotosMutation.isPending;

  const isEditMode = !!selectedProduct;
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showCostPriceDialog, setShowCostPriceDialog] = useState(false);
  const [originalCostPrice, setOriginalCostPrice] = useState<number>(0);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  // "Replace": the photo whose file is being swapped, and its file picker
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [replacingKey, setReplacingKey] = useState<string | null>(null);
  // Stock is one number, or split by size / phone model and/or colour (the
  // grid: clothes, gloves, mobile covers)
  const [grid, setGrid] = useState<StockGrid>(() => emptyGrid());
  // photo that is the size chart (shown to customers as "Size guide")
  const [sizeGuideKey, setSizeGuideKey] = useState<string | null>(null);

  useEffect(() => {
    setNameZh(selectedProduct?.product_name_zh || "");
    if (selectedProduct) {
      setFormData({
        product_name: selectedProduct.product_name || "",
        barcode: selectedProduct.barcode || "",
        description: selectedProduct.description || "",
        status: selectedProduct.status || "Active",
        category_id: selectedProduct.category_id || "",
        unit: selectedProduct.unit || "",
        cost_price: selectedProduct.cost_price || 0,
        sale_price: selectedProduct.sale_price || 0,
        stock_quantity: selectedProduct.stock_quantity || 0,
        variants: [],
      });
      // Existing colours / sizes / phone models, so they can be edited here
      setGrid(
        gridFromProduct(
          (selectedProduct.batches ?? []).filter((b) => !b.is_deleted),
          selectedProduct.photos ?? [],
          [],
          {
            cost: Number(selectedProduct.cost_price) || 0,
            sale: Number(selectedProduct.sale_price) || 0,
          },
        ),
      );
      setSizeGuideKey(
        selectedProduct.photos?.find((p) => p.size_guide)?.id ?? null,
      );
      setOriginalCostPrice(selectedProduct.cost_price || 0);
      setPhotos(savedPhotos(selectedProduct));
    } else {
      setFormData(initialFormData);
      setGrid(emptyGrid());
      setSizeGuideKey(null);
      setOriginalCostPrice(0);
      setPhotos([]);
    }
  }, [selectedProduct]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow picking the same file again later
    if (picked.length === 0) return;

    const usable = picked.filter((f) => {
      const isVideo = f.type.startsWith("video/");
      if (!isVideo && !f.type.startsWith("image/")) {
        toast.error(t("Please select a photo or video."));
        return false;
      }
      const maxMb = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
      if (f.size > maxMb * 1024 * 1024) {
        toast.error(
          isVideo
            ? t("Videos must be under 100 MB.")
            : t("Photos must be under 10 MB."),
        );
        return false;
      }
      return true;
    });

    const room = MAX_PHOTOS - photos.length;
    if (usable.length > room) {
      toast.error(t("A product can have at most 10 photos and videos."));
    }
    const added: PhotoItem[] = usable
      .slice(0, Math.max(room, 0))
      .map((file) => ({
        kind: "new",
        key: `${Date.now()}-${Math.random()}`,
        type: file.type.startsWith("video/") ? "video" : "image",
        file,
        preview: URL.createObjectURL(file),
      }));
    if (added.length) setPhotos((prev) => [...prev, ...added]);
  };

  // Swap one photo's file for another, in the same place: it keeps its spot
  // (and so the cover), its colour and, for a photo, the size-guide mark.
  // a picked file is a photo or video under the size limit
  const usableFile = (file: File) => {
    const isVideo = file.type.startsWith("video/");
    if (!isVideo && !file.type.startsWith("image/")) {
      toast.error(t("Please select a photo or video."));
      return false;
    }
    if (file.size > (isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB) * 1024 * 1024) {
      toast.error(isVideo ? t("Videos must be under 100 MB.") : t("Photos must be under 10 MB."));
      return false;
    }
    return true;
  };

  const handleReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const oldKey = replacingKey;
    setReplacingKey(null);
    if (file && oldKey) replaceWithFile(oldKey, file);
  };

  // A new photo chosen for one colour (in the stock section): it replaces
  // that colour's photo in place, or is added and linked to the colour.
  const photoForColour = (colourKey: string, file: File) => {
    const current = grid.colours.find((c) => c.key === colourKey)?.photoKey;
    if (current && photos.some((p) => photoKey(p) === current)) {
      replaceWithFile(current, file);
      return;
    }
    if (!usableFile(file)) return;
    if (photos.length >= MAX_PHOTOS) {
      toast.error(t("A product can have at most 10 photos and videos."));
      return;
    }
    const key = `${Date.now()}-${Math.random()}`;
    setPhotos((prev) => [
      ...prev,
      {
        kind: "new",
        key,
        type: file.type.startsWith("video/") ? "video" : "image",
        file,
        preview: URL.createObjectURL(file),
      },
    ]);
    setGrid((g) => ({
      ...g,
      colours: g.colours.map((c) => (c.key === colourKey ? { ...c, photoKey: key } : c)),
    }));
    toast.success(t("Photo added. Save to keep it."));
  };

  const replaceWithFile = (oldKey: string, file: File) => {
    if (!usableFile(file)) return;
    const isVideo = file.type.startsWith("video/");
    const key = `${Date.now()}-${Math.random()}`;
    const replacement: PhotoItem = {
      kind: "new",
      key,
      type: isVideo ? "video" : "image",
      file,
      preview: URL.createObjectURL(file),
    };
    setPhotos((prev) => prev.map((p) => (photoKey(p) === oldKey ? replacement : p)));
    // the colour this photo showed now points at the new one
    setGrid((g) => ({
      ...g,
      colours: g.colours.map((c) => (c.photoKey === oldKey ? { ...c, photoKey: key } : c)),
    }));
    if (sizeGuideKey === oldKey) setSizeGuideKey(isVideo ? null : key);
    toast.success(t("Photo replaced. Save to keep it."));
  };

  const removePhoto = (key: string) => {
    setPhotos((prev) => prev.filter((p) => photoKey(p) !== key));
    if (key === sizeGuideKey) setSizeGuideKey(null);
  };

  // Photos are put in order by dragging their handle (mouse or finger): the
  // photo jumps to the spot under the pointer. The first one is the cover.
  const [dragPhoto, setDragPhoto] = useState<string | null>(null);
  const photoTiles = useRef(new Map<string, HTMLDivElement>());
  const onPhotoDrag = (e: React.PointerEvent) => {
    if (!dragPhoto) return;
    let target: string | null = null;
    let best = Infinity;
    for (const [key, el] of photoTiles.current) {
      const r = el.getBoundingClientRect();
      const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      if (d < best) {
        best = d;
        target = key;
      }
    }
    if (!target || target === dragPhoto) return;
    setPhotos((prev) => {
      const from = prev.findIndex((p) => photoKey(p) === dragPhoto);
      const to = prev.findIndex((p) => photoKey(p) === target);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const makeCover = (key: string) =>
    setPhotos((prev) => {
      const target = prev.find((p) => photoKey(p) === key);
      return target ? [target, ...prev.filter((p) => p !== target)] : prev;
    });

  // Colour a photo shows ("" for none) and whether it is the size guide
  const photoLabels = (key: string) => {
    const sizeGuide = key === sizeGuideKey;
    const colour =
      !sizeGuide && grid.useColours
        ? grid.colours.find((c) => c.photoKey === key)?.name.trim() ?? ""
        : "";
    return { variant: colour, size_guide: sizeGuide };
  };

  const photosChanged = () => {
    const saved = selectedProduct?.photos ?? [];
    const before = savedPhotos(selectedProduct).map(photoKey);
    const after = photos.map(photoKey);
    return (
      photos.some((p) => p.kind === "new") ||
      before.length !== after.length ||
      before.some((k, i) => k !== after[i]) ||
      // a colour or the size guide was (un)assigned
      saved.some((p) => {
        const now = photoLabels(p.id);
        return (p.variant || "") !== now.variant || !!p.size_guide !== now.size_guide;
      })
    );
  };

  const savePhotosIfNeeded = async (productId: number | string) => {
    if (!photosChanged()) return;

    const entries = photos.map((p) =>
      p.kind === "saved"
        ? { id: p.id, ...photoLabels(p.id) }
        : { file: p.file, type: p.type, ...photoLabels(p.key) },
    );
    const uploading = photos.some((p) => p.kind === "new");

    // Visible even after the form closes: the toast outlives this modal
    const toastId = toast.loading(
      uploading ? t("Uploading...") : t("Saving photos..."),
    );
    try {
      await savePhotosMutation.mutateAsync({
        id: productId,
        entries,
        onProgress: (done, total, current) => {
          const percent = Math.round(((done + current) / total) * 100);
          toast.loading(
            `${t("Uploading...")} ${Math.min(done + 1, total)}/${total} · ${percent}%`,
            { id: toastId },
          );
        },
      });
      toast.success(t("Photos saved"), { id: toastId });
    } catch (error) {
      console.error("Error saving product photos:", error);
      toast.error(t("Photo upload failed"), { id: toastId });
    }
  };

  const handleChange = (
    field: keyof ProductFormData,
    value: string | number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const categorySizes = (categoryId: string): string[] =>
    categories.find((c) => String(c.id) === String(categoryId))?.sizes ?? [];

  const savedBatches = (selectedProduct?.batches ?? []).filter((b) => !b.is_deleted);
  // Sizes can be edited here when the product has none yet, or when its
  // category has preset sizes (gloves, clothes). Phone models and purchase
  // batches are still managed on the Product Batches page.
  // A cover: its phone models (and colours / prices) are edited here
  const categoryLabel =
    categories.find((c) => String(c.id) === String(formData.category_id))
      ?.category_name ?? "";
  const oldCover =
    isEditMode && partless(savedBatches) && /cover|case/i.test(categoryLabel);
  const savedCover =
    isEditMode && (savedBatches.some((b) => b.model) || oldCover);
  const editSizes =
    isEditMode &&
    (savedBatches.length === 0 ||
      savedCover ||
      savedBatches.some((b) => b.variant || b.size) ||
      categorySizes(selectedProduct?.category_id ?? "").length > 0);
  // Editing a product whose stock lives only on its phone models / batches
  const stockOnModelsOnly =
    isEditMode &&
    !editSizes &&
    savedBatches.length > 0 &&
    Number(selectedProduct?.stock_quantity ?? 0) === 0;
  const gridMode = gridActive(grid) && (!isEditMode || editSizes);
  // stock is kept on lines (sizes / colours / phone models), not one number
  const modelMode = gridMode;

  // An old cover's lines are its phone models: load them once the category
  // shows it is a cover
  const oldCoverLoaded = useRef<string | null>(null);
  useEffect(() => {
    if (!oldCover || !selectedProduct) return;
    if (oldCoverLoaded.current === selectedProduct.id) return;
    oldCoverLoaded.current = selectedProduct.id;
    setGrid(
      gridFromProduct(
        (selectedProduct.batches ?? []).filter((b) => !b.is_deleted),
        selectedProduct.photos ?? [],
        [],
        {
          cost: Number(selectedProduct.cost_price) || 0,
          sale: Number(selectedProduct.sale_price) || 0,
        },
        true,
      ),
    );
  }, [oldCover, selectedProduct]);

  // A mobile cover keeps stock per phone model, optionally by colour
  const setCoverMode = (on: boolean) => setGrid(on ? coverGrid() : emptyGrid());

  const changeGrid = (next: StockGrid) => setGrid(next);

  // product photos a colour can be linked to (not the size guide)
  const gridPhotos = photos
    .filter((p) => photoKey(p) !== sizeGuideKey)
    .map((p) => ({
      key: photoKey(p),
      preview: p.preview,
      local: p.kind === "new",
    }));

  const validateForm = () => {
    if (!formData.product_name.trim()) {
      toast.error(t("Product name is required."));
      return false;
    }

    if (!formData.category_id) {
      toast.error(t("Category is required."));
      return false;
    }

    if (!formData.unit.trim()) {
      toast.error(t("Unit is required."));
      return false;
    }

    if (gridMode) {
      const problem = gridProblem(grid, t, {
        cost: Number(formData.cost_price) || 0,
        sale: Number(formData.sale_price) || 0,
      });
      if (problem) {
        toast.error(problem);
        return false;
      }
    }

    if (Number(formData.cost_price) < 0) {
      toast.error(t("Cost price cannot be negative."));
      return false;
    }

    if (Number(formData.sale_price) < 0) {
      toast.error(t("Sale price cannot be negative."));
      return false;
    }

    if (Number(formData.stock_quantity) < 0) {
      toast.error(t("Stock quantity cannot be negative."));
      return false;
    }

    if (Number(formData.cost_price || 0) > Number(formData.sale_price || 0)) {
      toast.error(t("Cost price cannot be greater than sale price."));
      return false;
    }

    return true;
  };

  // Colours / sizes go as `stock_lines`. In edit mode they replace the saved
  // lines, so they're only sent when editable here; other products' batches
  // are left alone.
  const withSizes = <T extends { variants: unknown }>(payload: T) => {
    const { variants: _variants, ...rest } = payload;
    if (!isEditMode) {
      return gridMode
        ? { ...rest, variants: [], stock_lines: gridToLines(grid) }
        : { ...rest, variants: [] };
    }
    if (!editSizes) return rest;
    if (gridMode) return { ...rest, stock_lines: gridToLines(grid) };
    // Sizes/colours unticked on a product that had them: remove them
    return savedBatches.length > 0 ? { ...rest, stock_lines: [] } : rest;
  };

  const handleUpdateWithCostPriceChange = async () => {
    // Update product with new cost price
    setShowCostPriceDialog(false);

    try {
      const payload = {
        ...formData,
        product_name: formData.product_name.trim(),
        product_name_zh: nameZh.trim(),
        category_id: formData.category_id,
        unit: formData.unit.trim(),
        barcode:
          formData.barcode.trim() === "" ? null : formData.barcode.trim(),
        description:
          formData.description.trim() === ""
            ? null
            : formData.description.trim(),
      };

      if (isEditMode && selectedProduct) {
        await updateProductMutation.mutateAsync({
          ...(withSizes(payload) as typeof payload),
          id: selectedProduct.id,
        });
        void savePhotosIfNeeded(selectedProduct.id);
      }

      closeModal();
    } catch (error) {
      console.error("Error updating product:", error);
    }
  };

  const handleCreateNewBatch = () => {
    setShowCostPriceDialog(false);
    setShowBatchModal(true);
  };

  const handleCostPriceDialogCancel = () => {
    // Revert cost price to original and close dialog
    setShowCostPriceDialog(false);
    setFormData((prev) => ({
      ...prev,
      cost_price: originalCostPrice,
    }));
  };

  const handleBatchModalClose = () => {
    setShowBatchModal(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Check if cost price changed in edit mode
    if (
      isEditMode &&
      selectedProduct &&
      Number(formData.cost_price) !== originalCostPrice
    ) {
      // Show dialog asking how to proceed
      setShowCostPriceDialog(true);
      return;
    }

    // Proceed with normal save if no cost price change
    try {
      const payload = {
        ...formData,
        product_name: formData.product_name.trim(),
        product_name_zh: nameZh.trim(),
        category_id: formData.category_id,
        unit: formData.unit.trim(),
        barcode:
          formData.barcode.trim() === "" ? null : formData.barcode.trim(),
        description:
          formData.description.trim() === ""
            ? null
            : formData.description.trim(),
      };

      if (isEditMode && selectedProduct) {
        await updateProductMutation.mutateAsync({
          ...(withSizes(payload) as typeof payload),
          id: selectedProduct.id,
        });
        // Photo uploads can be slow on mobile; don't keep the form open for it
        void savePhotosIfNeeded(selectedProduct.id);
      } else {
        const result: any = await createProductMutation.mutateAsync(
          withSizes(payload) as typeof payload,
        );
        const newProductId = result?.data?.id ?? result?.id;
        if (newProductId) {
          void savePhotosIfNeeded(newProductId);
        }
      }

      closeModal();
    } catch (error: any) {}
  };

  return (
    <>
      <div
        onClick={() => {
          if (isSubmitting) return;
          closeModal();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-2 backdrop-blur-sm sm:p-4"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="max-h-[94dvh] w-full max-w-3xl overflow-auto rounded-2xl sm:max-h-[90dvh] sm:rounded-3xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {isEditMode ? t("Update Product") : t("Add Product")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isEditMode
                  ? t("Update the product details in your inventory.")
                  : t("Fill in the product details to add a new item.")}
              </p>
            </div>
            <button
              onClick={closeModal}
              disabled={isSubmitting}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
            {/* grid-cols-1 = minmax(0, 1fr): on phones the column must not grow
                to fit wide content, or the whole form runs off the screen */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Photos & Videos")}
                </label>
                <div
                  className={`grid grid-cols-3 gap-2.5 sm:flex sm:flex-wrap sm:gap-3 ${dragPhoto ? "select-none" : ""}`}
                >
                  {photos.map((photo, i) => (
                    <div
                      key={photoKey(photo)}
                      ref={(el) => {
                        if (el) photoTiles.current.set(photoKey(photo), el);
                        else photoTiles.current.delete(photoKey(photo));
                      }}
                      className={`relative aspect-square w-full shrink-0 overflow-hidden rounded-xl border bg-slate-50 sm:h-28 sm:w-28 ${
                        i === 0
                          ? "border-blue-500 ring-2 ring-blue-500/30"
                          : "border-slate-200"
                      } ${dragPhoto === photoKey(photo) ? "z-10 scale-105 opacity-80 shadow-xl" : ""}`}
                    >
                      {photos.length > 1 && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.currentTarget.setPointerCapture(e.pointerId);
                            setDragPhoto(photoKey(photo));
                          }}
                          onPointerMove={onPhotoDrag}
                          onPointerUp={() => setDragPhoto(null)}
                          onPointerCancel={() => setDragPhoto(null)}
                          // a finger drags the photo instead of scrolling the form
                          style={{ touchAction: "none" }}
                          title={t("Drag to move")}
                          aria-label={t("Drag to move")}
                          className={`absolute left-1/2 top-1 z-10 -translate-x-1/2 rounded-full bg-black/55 px-2 py-1 text-white hover:bg-black/75 disabled:opacity-50 ${
                            dragPhoto === photoKey(photo) ? "cursor-grabbing" : "cursor-grab"
                          }`}
                        >
                          <GripHorizontal size={14} />
                        </button>
                      )}
                      {photo.type === "video" && photo.kind === "new" ? (
                        <video
                          src={coverImage(photo.preview, 320)}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Image
                          src={coverImage(photo.preview, 320)}
                          alt={t("Product photo")}
                          width={224}
                          height={224}
                          unoptimized={photo.kind === "new"}
                          className="h-full w-full object-cover"
                        />
                      )}
                      {photo.type === "video" && (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="rounded-full bg-black/55 p-2">
                            <Play size={16} className="fill-white text-white" />
                          </span>
                        </span>
                      )}
                      {i === 0 ? (
                        <span className="absolute left-1 top-1 rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {t("Cover")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => makeCover(photoKey(photo))}
                          disabled={isSubmitting}
                          title={t("Set as cover")}
                          aria-label={t("Set as cover")}
                          className="absolute left-1 top-1 rounded-full bg-black/55 p-1.5 text-white hover:bg-black/75 disabled:opacity-50"
                        >
                          <Star size={12} />
                        </button>
                      )}
                      {(() => {
                        const key = photoKey(photo);
                        const isGuide = key === sizeGuideKey;
                        const colour = photoLabels(key).variant;
                        return (
                          <>
                            {(isGuide || colour) && (
                              <span
                                className={`pointer-events-none absolute inset-x-0 bottom-0 truncate px-1.5 pb-1 pt-4 text-[10px] font-semibold text-white ${
                                  isGuide
                                    ? "bg-gradient-to-t from-amber-700/90 to-transparent"
                                    : "bg-gradient-to-t from-black/75 to-transparent"
                                }`}
                              >
                                {isGuide ? t("Size guide") : colour}
                              </span>
                            )}
                            {photo.type === "image" && (
                              <button
                                type="button"
                                onClick={() => setSizeGuideKey(isGuide ? null : key)}
                                disabled={isSubmitting}
                                title={isGuide ? t("Not the size guide") : t("Mark as size guide")}
                                aria-label={isGuide ? t("Not the size guide") : t("Mark as size guide")}
                                aria-pressed={isGuide}
                                className={`absolute bottom-1 right-1 rounded-full p-1.5 text-white disabled:opacity-50 ${
                                  isGuide ? "bg-amber-500" : "bg-black/55 hover:bg-black/75"
                                }`}
                              >
                                <Ruler size={12} />
                              </button>
                            )}
                          </>
                        );
                      })()}
                      {/* swap this photo for another file, in the same spot */}
                      <button
                        type="button"
                        onClick={() => {
                          setReplacingKey(photoKey(photo));
                          replaceInputRef.current?.click();
                        }}
                        disabled={isSubmitting}
                        title={t("Replace")}
                        aria-label={t("Replace photo")}
                        className="absolute bottom-1 left-1 flex items-center gap-1 rounded-full bg-black/55 p-1.5 text-white hover:bg-black/75 disabled:opacity-50"
                      >
                        <RefreshCw size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePhoto(photoKey(photo))}
                        disabled={isSubmitting}
                        title={t("Remove photo")}
                        aria-label={t("Remove photo")}
                        className="absolute right-1 top-1 rounded-full bg-black/55 p-1.5 text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isSubmitting}
                      className="flex aspect-square w-full shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 px-1 text-center text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-28 sm:w-28"
                    >
                      <ImagePlus size={20} />
                      {t("Add Photos / Videos")}
                    </button>
                  )}
                  <input
                    ref={replaceInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleReplace}
                    disabled={isSubmitting}
                    className="hidden"
                  />
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handlePhotoChange}
                    disabled={isSubmitting}
                    className="hidden"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {t("Up to 10 photos or videos (videos up to 100 MB). The first one is the cover; tap the star to change it.")}{" "}
                  {t("Tap the ruler on the size chart photo to show it as the size guide.")}{" "}
                  {t("Tap the arrows on a photo to replace it with another.")}{" "}
                  {photos.length > 1 && t("Drag the handle at the top of a photo to change the order.")}
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Product Name")}
                </label>
                <input
                  type="text"
                  placeholder={t("Enter product name")}
                  value={formData.product_name}
                  onChange={(e) => handleChange("product_name", e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {lang === "zh" ? "中文名称" : t("Chinese name (中文名称)")}
                </label>
                <input
                  type="text"
                  placeholder="例如：蝴蝶凯蒂猫"
                  value={nameZh}
                  onChange={(e) => setNameZh(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {t("Shown instead of the English name when the panel is in Chinese.")}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Category")}
                </label>
                <DropdownWithSearch
                  options={
                    categoriesData?.data?.map((category) => ({
                      id: category.id,
                      label: category.category_name,
                      sublabel: `${t("Description")}: ${category.description || t("N/A")}`,
                      metadata: category,
                    })) || []
                  }
                  selectedId={formData.category_id}
                  onSelect={(option) => {
                    const categoryId = String(option?.id || "");
                    const sizes: string[] = option?.metadata?.sizes ?? [];
                    const untouched = gridToLines(grid).every(
                      (l) => !l.quantity,
                    );
                    let variants = formData.variants;
                    if (!isEditMode && sizes.length > 0) {
                      // Category has preset sizes: show a box per size, unless
                      // quantities were already typed for this product
                      if (!gridActive(grid) || untouched) {
                        setGrid({ ...grid, useSizes: true, sizes: [...sizes] });
                      }
                      variants = [];
                    } else if (
                      !isEditMode &&
                      /cover|case/i.test(option?.label ?? "") &&
                      !grid.models
                    ) {
                      setGrid(coverGrid());
                    }
                    setFormData({
                      ...formData,
                      category_id: categoryId,
                      variants,
                    });
                  }}
                  isLoading={isCategoriesLoading}
                  placeholder={t("Select category")}
                  searchPlaceholder={t("Search categories...")}
                  disabled={isSubmitting}
                  emptyMessage={t("No categories found")}
                  onSearch={(searchTerm) => {
                    setSearchCategoryTerm(searchTerm);
                  }}
                  showAddNew={true}
                  addNewLabel={t("Add New Category")}
                  onAddNew={() => setShowCategoryModal(true)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Cost Price")}{" "}
                  <span className="font-normal text-slate-400">
                    ({t("optional")})
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t("Optional")}
                  value={formData.cost_price ? String(formData.cost_price) : ""}
                  onChange={(e) =>
                    handleChange(
                      "cost_price",
                      e.target.value === "" ? 0 : parseFloat(e.target.value),
                    )
                  }
                  disabled={isSubmitting}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
                {isEditMode &&
                  Number(formData.cost_price) !== originalCostPrice && (
                    <p className="mt-1 text-xs text-amber-600">
                      {t("Cost price changed from")} NPR{" "}
                      {originalCostPrice.toFixed(2)}
                    </p>
                  )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Sale Price")}{" "}
                  <span className="font-normal text-slate-400">
                    ({t("optional")})
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t("Optional")}
                  value={formData.sale_price ? String(formData.sale_price) : ""}
                  onChange={(e) =>
                    handleChange(
                      "sale_price",
                      e.target.value === "" ? 0 : parseFloat(e.target.value),
                    )
                  }
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>

              {stockOnModelsOnly && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  {t("Stock for this product is kept per size / phone model. Change quantities or add more on the Product Batches page.")}
                </div>
              )}

              {!modelMode && !stockOnModelsOnly && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t("Stock Quantity")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder={t("Enter stock quantity")}
                    value={String(formData.stock_quantity)}
                    onChange={(e) =>
                      handleChange(
                        "stock_quantity",
                        e.target.value === ""
                          ? 0
                          : parseInt(e.target.value, 10),
                      )
                    }
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </div>
              )}

              {(!isEditMode || editSizes) && (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2 sm:p-4">
                  {(!gridActive(grid) || grid.models) &&
                    (!isEditMode || grid.models || savedBatches.length === 0) && (
                    <label className="flex min-h-11 cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={grid.models}
                        onChange={(e) => setCoverMode(e.target.checked)}
                        disabled={isSubmitting}
                        className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300"
                      />
                      <span>
                        <span className="block text-sm font-medium text-slate-700">
                          {t("This is a mobile cover")}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {t("Add the phone models it fits, with stock, colours and price for each. Leave unticked for normal products.")}
                        </span>
                      </span>
                    </label>
                  )}

                  <VariantStockEditor
                    value={grid}
                    onChange={changeGrid}
                    photos={gridPhotos}
                    presetSizes={categorySizes(formData.category_id)}
                    productPrices={{
                      cost: Number(formData.cost_price) || 0,
                      sale: Number(formData.sale_price) || 0,
                    }}
                    disabled={isSubmitting}
                    onNewPhoto={photoForColour}
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Unit")}
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => handleChange("unit", e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="">{t("Select unit")}</option>
                  <option value="Piece">{t("Piece")}</option>
                  <option value="Kg">{t("Kg")}</option>
                  <option value="Liter">{t("Liter")}</option>
                  <option value="Box">{t("Box")}</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Status")}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="Active">{t("Active")}</option>
                  <option value="Inactive">{t("Inactive")}</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("Description")}
                </label>
                <textarea
                  rows={4}
                  placeholder={t("Write a short description")}
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("Cancel")}
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex cursor-pointer min-w-[140px] items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {isEditMode ? t("Updating...") : t("Saving...")}
                  </span>
                ) : isEditMode ? (
                  t("Update Product")
                ) : (
                  t("Save Product")
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Cost Price Change Dialog */}
      {showCostPriceDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2">
                <svg
                  className="h-6 w-6 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {t("Cost Price Changed")}
              </h3>
            </div>

            <p className="mb-4 text-sm text-slate-600">
              {t("The cost price has been changed from")}{" "}
              <span className="font-semibold text-slate-900">
                NPR {originalCostPrice.toFixed(2)}
              </span>{" "}
              {t("to")}{" "}
              <span className="font-semibold text-slate-900">
                NPR {Number(formData.cost_price).toFixed(2)}
              </span>
              . {t("How would you like to proceed?")}
            </p>

            <div className="space-y-3">
              <button
                onClick={handleCreateNewBatch}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {t("Create New Batch with Updated Price")}
              </button>

              <button
                onClick={handleUpdateWithCostPriceChange}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {t("Update Product with New Cost Price")}
              </button>

              <button
                onClick={handleCostPriceDialogCancel}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {t("Cancel and Revert Cost Price")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Modal */}
      {showBatchModal && selectedProduct && (
        <BatchModal
          closeModal={handleBatchModalClose}
          productId={selectedProduct.id}
          defaultCostPrice={Number(formData.cost_price)}
          defaultSalePrice={Number(formData.sale_price)}
        />
      )}

      {showCategoryModal && (
        <CategoriesModal closeModal={() => setShowCategoryModal(false)} />
      )}
    </>
  );
}

function savedPhotos(product?: Product | null): PhotoItem[] {
  if (!product) return [];
  if (product.photos?.length) {
    return product.photos.map((p) => ({
      kind: "saved",
      id: p.id,
      type: p.type === "video" ? "video" : "image",
      preview: p.poster || p.url,
    }));
  }
  // products saved before multi-photo support
  return product.photo_url
    ? [
        {
          kind: "saved",
          id: "legacy",
          type: "image",
          preview: product.photo_url,
        },
      ]
    : [];
}
