import { useCallback, useState } from "react";
import { initialUsers } from "../data/mock";
import type { User } from "../../types";

export function useUsers() {
  const [users, setUsers] = useState<User[]>(initialUsers);

  const toggleAccess = useCallback(
    (id: string) =>
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? { ...u, status: u.status === "Active" ? "Inactive" : "Active" }
            : u
        )
      ),
    []
  );

  return { users, toggleAccess };
}
