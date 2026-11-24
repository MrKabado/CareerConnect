import { useState } from "react";
import { Plus, Search } from "lucide-react";
import CategoryCard from "../../components/admin/CategoryCard";
import CreateCategoryModal from "../../components/admin/modals/CreateCategoryModal";
import EditCategoryModal from "../../components/admin/modals/EditCategoryModal";
import { Button, Modal, PageHeader } from "../../components/common";
import { useCategories } from "../../hooks/useCategories";
import type { Category } from "../../types";

type ModalState = { mode: "create" } | { mode: "edit"; category: Category } | null;

export default function CategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory, isLoading, error, retry } = useCategories();
  const [modal, setModal] = useState<ModalState>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const closeModal = () => setModal(null);
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <section>
      <PageHeader
        title="Job categories"
        subtitle="Organize how jobs are grouped across CareerConnect."
        actions={
          <Button
            icon={<Plus size={14} />}
            className="h-11 rounded-xl bg-[#078b8d] px-5 text-sm shadow-[0_6px_16px_rgba(7,139,141,.16)]"
            onClick={() => setModal({ mode: "create" })}
          >
            Create category
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-3 max-[680px]:items-end">
        <label className="flex h-[44px] w-[320px] items-center gap-2 rounded-xl border border-line bg-white px-3 text-[11px] text-[#718181] max-[680px]:w-full">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent outline-none placeholder:text-[#718181]"
            placeholder="Search categories"
          />
        </label>
        <span className="shrink-0 whitespace-nowrap text-[10px] text-[#718181]">{filteredCategories.length} categories</span>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <span>{error}</span>
          <button className="ml-3 font-semibold underline" onClick={() => void retry()} type="button">Try again</button>
        </div>
      )}

      <div className="grid gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <div className="col-span-full rounded-xl border border-line bg-white px-5 py-10 text-center text-sm text-muted">
            Loading categories…
          </div>
        )}
        {filteredCategories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onEdit={(c) => setModal({ mode: "edit", category: c })}
            onDelete={(c) => {
              setDeleteError(null);
              setCategoryToDelete(c);
            }}
          />
        ))}
      </div>

      {modal?.mode === "create" && (
        <CreateCategoryModal
          onClose={closeModal}
          onSubmit={(values) => {
            addCategory(values);
            closeModal();
          }}
        />
      )}

      {modal?.mode === "edit" && (
        <EditCategoryModal
          key={modal.category.id}
          category={modal.category}
          onClose={closeModal}
          onSubmit={(values) => {
            updateCategory(modal.category.id, values);
            closeModal();
          }}
        />
      )}
      {categoryToDelete && (
        <Modal
          title="Delete category?"
          subtitle={`This will remove "${categoryToDelete.name}" from CareerConnect.`}
          onClose={() => {
            if (!isDeletingCategory) setCategoryToDelete(null);
          }}
        >
          <div className="space-y-4 px-6 pb-6">
            <p className="text-sm leading-6 text-muted">
              This action cannot be undone. Existing listings may no longer be grouped under this category.
            </p>
            {deleteError && <p className="text-sm text-red-700" role="alert">{deleteError}</p>}
            <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4">
              <Button
                variant="outline"
                disabled={isDeletingCategory}
                onClick={() => setCategoryToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={isDeletingCategory}
                onClick={async () => {
                  setIsDeletingCategory(true);
                  setDeleteError(null);
                  try {
                    await deleteCategory(categoryToDelete.id);
                    setCategoryToDelete(null);
                  } catch (caught) {
                    setDeleteError(
                      caught instanceof Error ? caught.message : "Unable to delete this category.",
                    );
                  } finally {
                    setIsDeletingCategory(false);
                  }
                }}
              >
                {isDeletingCategory ? "Deleting…" : "Delete category"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
