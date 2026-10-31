import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import UserRow from "../../components/admin/UserRow";
import {
  Button,
  DataTable,
  PageHeader,
  Pagination,
  SearchBar,
  Select,
  type Column,
} from "../../components/common";
import { useUsers } from "../../hooks/useUsers";
import type { User } from "../../types";
import { downloadCsv } from "../../utils/csv";

const PAGE_SIZE = 6;

const ROLE_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: "Applicant", label: "Applicants" },
  { value: "Employer", label: "Employers" },
  { value: "Admin", label: "Admins" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

// Headers only; UserRow renders the cells in this same order.
const COLUMNS: Column<User>[] = [
  { key: "user", header: "User" },
  { key: "role", header: "Role" },
  { key: "joined", header: "Joined" },
  { key: "status", header: "Status" },
  { key: "access", header: "Access", headerClassName: "text-right" },
];

export default function UsersPage() {
  const { users, toggleAccess } = useUsers();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (role === "all" || u.role === role) &&
        (status === "all" || u.status === status) &&
        (q === "" ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q))
    );
  }, [users, query, role, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  const resetPage = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const exportUsers = () => {
    downloadCsv("careerconnect-users.csv", [
      ["Name", "Email", "Role", "Joined", "Status"],
      ...filtered.map((user) => [
        user.name,
        user.email,
        user.role,
        user.joined,
        user.status,
      ]),
    ]);
  };

  return (
    <section>
      <PageHeader
        title="User management"
        subtitle="Manage access for applicants, employers, and administrators."
        actions={
          <Button variant="outline" className="h-10" icon={<Download size={14} />} onClick={exportUsers}>
            Export users
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2.5">
        <SearchBar
          className="w-full sm:w-80"
          value={query}
          onChange={resetPage(setQuery)}
          placeholder="Search by name or email"
        />
        <Select ariaLabel="Filter by role" value={role} onChange={resetPage(setRole)} options={ROLE_OPTIONS} />
        <Select ariaLabel="Filter by status" value={status} onChange={resetPage(setStatus)} options={STATUS_OPTIONS} />
      </div>

      <DataTable
        columns={COLUMNS}
        rows={pageRows}
        getRowKey={(u) => u.id}
        renderRow={(u) => <UserRow user={u} onToggleAccess={toggleAccess} />}
        emptyMessage="No users match your filters."
        footer={
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            summary={
              filtered.length === 0
                ? "Showing 0 users"
                : `Showing ${start + 1}–${start + pageRows.length} of ${filtered.length} users`
            }
          />
        }
      />
    </section>
  );
}
