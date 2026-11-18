import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { adminApi, type AdminUserRecord } from "@/features/admin/backendApi";
import type { User } from "@/types";

type UserFilters = { query: string; role: string; status: string; page: number };

function mapUser(record: AdminUserRecord): User {
  const date = record.created_at ? new Date(record.created_at) : null;
  return {
    id: String(record.id),
    name: record.name,
    email: record.email,
    initials: record.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase(),
    role: record.role === "admin" ? "Admin" : record.role === "employer" ? "Employer" : "Applicant",
    joined: date && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
      : "Date unavailable",
    status: record.account_status === "active" ? "Active" : "Inactive",
  };
}

export function useUsers(filters: UserFilters) {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!token) return;
    const currentRequestId = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminApi.users(token, {
        search: filters.query.trim() || undefined,
        role: filters.role === "all" ? undefined : filters.role.toLowerCase(),
        status: filters.status === "all" ? undefined : filters.status === "Active" ? "active" : "deactivated",
        page: filters.page,
      });
      if (currentRequestId !== requestId.current) return;
      setUsers(response.data.map(mapUser));
      setPageCount(response.last_page);
      setTotal(response.total);
    } catch (requestError) {
      if (currentRequestId === requestId.current) {
        setError(requestError instanceof Error ? requestError.message : "Unable to load users.");
      }
    } finally {
      if (currentRequestId === requestId.current) setIsLoading(false);
    }
  }, [filters.page, filters.query, filters.role, filters.status, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), filters.query.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, filters.query]);

  const toggleAccess = useCallback(async (id: string) => {
    if (!token || isSavingId) return;
    const selected = users.find((user) => user.id === id);
    if (!selected) return;
    setIsSavingId(id);
    setError(null);
    try {
      await adminApi.updateUserStatus(token, id, selected.status !== "Active");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update account access.");
    } finally {
      setIsSavingId(null);
    }
  }, [isSavingId, load, token, users]);

  return { users, total, pageCount, isLoading, isSavingId, error, toggleAccess, retry: () => void load() };
}
