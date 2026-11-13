"use client";

import { useMemo, useState } from "react";
import { Plus, Search, FolderTree, Clock, FileText } from "lucide-react";
import toast from "react-hot-toast";
import {
  useCategoryOrder,
  useDeleteCategory,
  type ShopOrderCategory,
} from "@/hooks/useCategories";
import DeleteConfirmModal from "@/components/layout/DeleteConfirmModal";
import CategoriesModal from "@/components/categories/modal";
import CategoryCards from "@/components/categories/CategoryCards";
import { useLang } from "@/lib/i18n";
import { StatCardsSkeleton } from "@/components/layout/Skeleton";

type Category = {
  id: string;
  category_name: string;
  description?: string;
  thumbnail_url?: string | null;
  sizes?: string[];
  created_at: string;
  updated_at: string;
};

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: typeof FolderTree;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle ? (
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          ) : null}
        </div>
        <div className="rounded-xl bg-gray-100 p-3 text-gray-700">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);

  // every category, in the order the shop shows them
  const { data: categories = [], isLoading, isError, refetch } = useCategoryOrder();
  const deleteCategory = useDeleteCategory();

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total: categories.length,
      withDesc: categories.filter((c) => (c.description || "").trim()).length,
      recent: categories.filter((c) => new Date(c.created_at).getTime() >= weekAgo).length,
    };
  }, [categories]);

  const openAddModal = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const openEditModal = (category: ShopOrderCategory) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteCategory.mutateAsync(deleteConfirm.id);
      toast.success(t("Category deleted successfully"));
      setDeleteConfirm(null);
    } catch {
      toast.error(t("Failed to delete category"));
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {t("Categories")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("Manage product categories for your business.")}
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          <Plus size={18} />
          {t("Add Category")}
        </button>
      </div>

      {/* Statistics Cards */}
      {isLoading ? (
        <StatCardsSkeleton count={3} className="stat-grid grid gap-4 grid-cols-2 md:grid-cols-3" />
      ) : (
        <div className="stat-grid grid gap-4 grid-cols-2 md:grid-cols-3">
          <StatCard
            title={t("Total Categories")}
            value={stats.total}
            icon={FolderTree}
            subtitle={t("All product categories")}
          />
          <StatCard
            title={t("With Description")}
            value={stats.withDesc}
            icon={FileText}
            subtitle={t("Categories that have descriptions")}
          />
          <StatCard
            title={t("New This Week")}
            value={stats.recent}
            icon={Clock}
            subtitle={t("Added in last 7 days")}
          />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("Search categories by name or description...")}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400"
        />
      </div>

      {/* the categories, as cards, in shop order (drag / arrows to change) */}
      <CategoryCards
        categories={categories}
        loading={isLoading}
        error={isError}
        onRetry={() => refetch()}
        search={search}
        onAdd={openAddModal}
        onEdit={openEditModal}
        onDelete={(c) => setDeleteConfirm(c)}
      />

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <CategoriesModal
          closeModal={closeModal}
          editingCategory={editingCategory}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          invoiceNo={deleteConfirm.category_name}
          label="category"
          isPending={deleteCategory.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
