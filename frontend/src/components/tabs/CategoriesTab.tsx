"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Edit,
  Loader2,
  Plus,
  Search,
  Trash2,
  FolderTree,
  Clock,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { useCategories, useDeleteCategory } from "@/hooks/useCategories";
import { useDebounced } from "@/hooks/useDebounced";
import DeleteConfirmModal from "@/components/layout/DeleteConfirmModal";
import Pagination from "@/components/layout/Pagination";
import CategoriesModal from "@/components/categories/modal";

const LIMIT = 10;

type Category = {
  id: string;
  category_name: string;
  description?: string;
  created_at: string;
  updated_at: string;
};

type CategoryForm = {
  category_name: string;
  description: string;
};

const initialForm: CategoryForm = {
  category_name: "",
  description: "",
};

const dateTime = (value?: string) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 500);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);

  const { data, isLoading, isFetching } = useCategories(
    page,
    LIMIT,
    debouncedSearch,
  );
  const deleteCategory = useDeleteCategory();

  const categories = data?.data ?? [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const openAddModal = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
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
      toast.success("Category deleted successfully");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete category");
    }
  };

  const goToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
  };

  const pageNumbers = useMemo(() => {
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [page, totalPages]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage product categories for your business.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <StatCard
          title="Total Categories"
          value={data?.stats?.totalCategories || 0}
          icon={FolderTree}
          subtitle="All product categories"
        />
        <StatCard
          title="With Description"
          value={data?.stats?.categoriesWithDesc || 0}
          icon={FileText}
          subtitle="Categories that have descriptions"
        />
        <StatCard
          title="New This Week"
          value={data?.stats?.recentCategories || 0}
          icon={Clock}
          subtitle="Added in last 7 days"
        />
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search categories by name or description..."
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400"
          />
        </div>
      </div>

      {/* Categories Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="font-bold text-gray-900">All Categories</h2>
            <p className="text-sm text-gray-500">{totalCount} total records</p>
          </div>
          {isFetching ? (
            <Loader2 className="animate-spin text-gray-400" size={20} />
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">SN</th>
                <th className="px-5 py-3">Category Name</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3">Last Updated</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-gray-500"
                  >
                    <Loader2 className="mx-auto mb-2 animate-spin" size={24} />
                    Loading categories...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <FolderTree
                      className="mx-auto mb-3 text-gray-300"
                      size={48}
                    />
                    <h3 className="text-base font-semibold text-gray-900">
                      No categories found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {search
                        ? "Try adjusting your search terms"
                        : "Add your first category to organize products"}
                    </p>
                    {!search && (
                      <button
                        onClick={openAddModal}
                        className="mt-4 cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                      >
                        <Plus size={16} />
                        Add Category
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                categories.map((category, index) => (
                  <tr key={category.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-500">{index + 1}</p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {category.category_name}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-500">
                        {category.description || (
                          <span className="italic text-gray-400">
                            No description
                          </span>
                        )}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {dateTime(category.created_at)}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {dateTime(category.updated_at)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(category)}
                          className="cursor-pointer rounded-xl p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                          aria-label="Edit category"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(category)}
                          className="rounded-xl cursor-pointer p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete category"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          goToPage={goToPage}
          pageNumbers={pageNumbers}
        />
      </div>

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
