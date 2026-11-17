import type {
  Category,
  CategoryFormValues,
  EmployerVerification,
  User,
} from "../../types";

// Not wired up yet: the hooks still use mock data. When your backend exists,
// call these from the hooks (useEffect + setState) instead of reading data/mock.ts.

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} failed (${res.status})`);
  return res.json() as Promise<T>;
}

export const api = {
  verifications: {
    list: () => request<EmployerVerification[]>("/admin/verifications"),
    approve: (id: string) =>
      request<void>(`/admin/verifications/${id}/approve`, { method: "POST" }),
    reject: (id: string, reason: string) =>
      request<void>(`/admin/verifications/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
  },
  users: {
    list: () => request<User[]>("/admin/users"),
    setStatus: (id: string, status: User["status"]) =>
      request<User>(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  },
  categories: {
    list: () => request<Category[]>("/admin/categories"),
    create: (values: CategoryFormValues) =>
      request<Category>("/admin/categories", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    update: (id: string, values: CategoryFormValues) =>
      request<Category>(`/admin/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      }),
  },
};
