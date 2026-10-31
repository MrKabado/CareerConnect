import { useState } from "react";
import { Plus, Search } from "lucide-react";
import CategoryCard from "../../components/admin/CategoryCard";
import CreateCategoryModal from "../../components/admin/modals/CreateCategoryModal";
import EditCategoryModal from "../../components/admin/modals/EditCategoryModal";
import { Button, PageHeader } from "../../components/common";
import { useCategories } from "../../hooks/useCategories";
import type { Category } from "../../types";

type ModalState = { mode: "create" } | { mode: "edit"; category: Category } | null;

export default function CategoriesPage() {
  const { categories, addCategory, updateCategory } = useCategories();
  const [modal, setModal] = useState<ModalState>(null);
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
            className="h-10"
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

      <div className="grid gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onEdit={(c) => setModal({ mode: "edit", category: c })}
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
    </section>
  );
}
