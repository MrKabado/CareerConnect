import type { CategoryFormValues } from "../../../types";
import CategoryModal from "./CategoryModal";

interface CreateCategoryModalProps {
  onClose: () => void;
  onSubmit: (values: CategoryFormValues) => void;
}

export default function CreateCategoryModal({ onClose, onSubmit }: CreateCategoryModalProps) {
  return <CategoryModal mode="create" onClose={onClose} onSubmit={onSubmit} />;
}
