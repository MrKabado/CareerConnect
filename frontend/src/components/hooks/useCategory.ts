import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { adminApi } from "@/features/admin/backendApi";
import type { Category, CategoryFormValues } from "../../types";

export function useCategories() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminApi.categories(token);
      setCategories(response.data.map((category) => ({
        id: String(category.id),
        name: category.name,
        description: category.description ?? "",
        jobCount: category.job_count,
        icon: "general",
      })));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load categories.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Loading state updates after the category request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const addCategory = useCallback(async (values: CategoryFormValues) => {
    if (!token) return;
    await adminApi.createCategory(token, values);
    await load();
  }, [load, token]);

  const updateCategory = useCallback(async (id: string, values: CategoryFormValues) => {
    if (!token) return;
    await adminApi.updateCategory(token, id, values);
    await load();
  }, [load, token]);

  const deleteCategory = useCallback(async (id: string) => {
    if (!token) return;
    await adminApi.deleteCategory(token, id);
    await load();
  }, [load, token]);

  return { categories, addCategory, updateCategory, deleteCategory, isLoading, error, retry: load };
}
