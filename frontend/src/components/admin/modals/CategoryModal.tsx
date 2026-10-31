import { useState, type FormEvent } from "react";
import { Button, Modal } from "../../common";
import type { CategoryFormValues } from "../../../types";

const NAME_MAX = 40;
const DESCRIPTION_MAX = 120;

interface CategoryModalProps {
  mode: "create" | "edit";
  initial?: CategoryFormValues;
  onClose: () => void;
  onSubmit: (values: CategoryFormValues) => void;
}

/** One modal for both "Create category" and "Edit category". */
export default function CategoryModal({
  mode,
  initial,
  onClose,
  onSubmit,
}: CategoryModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  const isEdit = mode === "edit";
  const canSubmit = name.trim().length > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ name: name.trim(), description: description.trim() });
  };

  return (
    <Modal
      title={isEdit ? "Edit category" : "Create category"}
      subtitle={
        isEdit
          ? "Update how this category appears to employers and applicants."
          : "Use a clear label applicants and employers will understand."
      }
      onClose={onClose}
      widthClass="max-w-[640px]"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-5 px-10 py-2 pb-6">
          <div>
            <label htmlFor="category-name" className="mb-2 block text-[16px] font-semibold text-ink">
              {isEdit ? "Category name" : "Category name"} <span className="text-red-500">*</span>
            </label>
            <input
              id="category-name"
              autoFocus
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Finance"
              className="h-14 w-full rounded-[14px] border border-line px-5 text-[16px] outline-none placeholder:text-[#9aa8a8] focus:border-brand-600"
            />
          </div>

          <div>
            <label
              htmlFor="category-description"
              className="mb-2 block text-[16px] font-semibold text-ink"
            >
              Description
            </label>
            <textarea
              id="category-description"
              rows={3}
              value={description}
              maxLength={DESCRIPTION_MAX}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isEdit ? "People operations, recruiting, and talent development." : "A short description of roles in this category"}
              className="h-[86px] w-full resize-none rounded-[14px] border border-line px-5 py-4 text-[16px] outline-none placeholder:text-[#9aa8a8] focus:border-brand-600"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-10 pb-8 pt-4">
          <Button variant="outline" className="h-12 rounded-[14px] px-6 text-[15px]" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="h-12 rounded-[14px] px-6 text-[15px]" disabled={!canSubmit}>
            {isEdit ? "Save changes" : "Create category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
