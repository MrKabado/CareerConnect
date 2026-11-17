import { useCallback, useState } from "react";
import { initialCategories } from "../data/mock";
import type { Category, CategoryFormValues } from "../../types";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  const addCategory = useCallback(
    (values: CategoryFormValues) =>
      setCategories((prev) => [
        ...prev,
        { id: crypto.randomUUID(), ...values, jobCount: 0, icon: "general" },
      ]),
    []
  );

  const updateCategory = useCallback(
    (id: string, values: CategoryFormValues) =>
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...values } : c))),
    []
  );

  return { categories, addCategory, updateCategory };
}
