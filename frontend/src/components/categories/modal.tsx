"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  removeCategoryThumbnail,
  uploadCategoryThumbnail,
  useCreateCategory,
  useUpdateCategory,
} from "@/hooks/useCategories";
import { ImagePlus, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";

type CategoryForm = {
  category_name: string;
  description: string;
};

const initialForm: CategoryForm = {
  category_name: "",
  description: "",
};

export default function CategoriesModal({ closeModal, editingCategory }: any) {
  const [formData, setFormData] = useState<CategoryForm>(initialForm);
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeThumb, setRemoveThumb] = useState(false);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  let isSubmitting = createCategory.isPending || updateCategory.isPending;

  useEffect(() => {
    setFile(null);
    setRemoveThumb(false);
    setPreview(editingCategory?.thumbnail_url ?? null);
  }, [editingCategory]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (editingCategory) {
      setFormData({
        category_name: editingCategory.category_name,
        description: editingCategory.description,
      });
    } else {
      setFormData(initialForm);
    }
  }, [editingCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category_name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      let saved: any;
      if (editingCategory) {
        saved = await updateCategory.mutateAsync({
          ...editingCategory,
          category_name: formData.category_name,
          description: formData.description,
        });
        toast.success("Category updated successfully");
      } else {
        saved = await createCategory.mutateAsync({
          category_name: formData.category_name,
          description: formData.description,
        });
        toast.success("Category created successfully");
      }

      closeModal();

      // upload the thumbnail in the background so the popup closes right away
      const id = saved?.data?.id ?? editingCategory?.id;
      if (id && (file || removeThumb)) {
        const job = file
          ? uploadCategoryThumbnail(id, file)
          : removeCategoryThumbnail(id);
        job
          .then(() => queryClient.invalidateQueries({ queryKey: ["categories"] }))
          .catch(() =>
            toast.error("Category saved, but the thumbnail upload failed"),
          );
      }
    } catch (error: any) {
      const message = error?.response?.data?.message;
      console.log(message);
      toast.error(
        editingCategory
          ? message || "Failed to update category"
          : message || "Failed to create category",
      );
    }
  };
  return (
    <div
      onClick={closeModal}
      className="fixed h-dvh inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900">
            {editingCategory ? "Edit Category" : "Add New Category"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {editingCategory
              ? "Update the category details below."
              : "Fill in the details to create a new category."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              value={formData.category_name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category_name: e.target.value,
                })
              }
              placeholder="e.g., Electronics, Clothing, Furniture"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-gray-400"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              placeholder="Enter a brief description of this category (optional)"
              rows={4}
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-gray-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Thumbnail
            </label>
            <p className="mb-2 text-xs text-gray-500">
              Shown on the customer site&apos;s category menu.
            </p>
            <div className="flex items-center gap-3">
              <label className="flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-400 transition hover:border-gray-400">
                {preview && !removeThumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus size={24} />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setRemoveThumb(false);
                    e.target.value = "";
                  }}
                />
              </label>
              {(file || (preview && !removeThumb)) && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setRemoveThumb(Boolean(editingCategory?.thumbnail_url));
                  }}
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
                >
                  <X size={14} /> Remove
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl cursor-pointer border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting
                ? "Saving..."
                : editingCategory
                  ? "Update Category"
                  : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
