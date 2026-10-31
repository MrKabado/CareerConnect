import type { Category, CategoryFormValues } from "../../../types";
import CategoryModal from "./CategoryModal";

interface EditCategoryModalProps {
  category: Category;
  onClose: () => void;
  onSubmit: (values: CategoryFormValues) => void;
}

export default function EditCategoryModal({
  category,
  onClose,
  onSubmit,
}: EditCategoryModalProps) {
  return (
    <CategoryModal
      mode="edit"
      initial={{ name: category.name, description: category.description }}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
