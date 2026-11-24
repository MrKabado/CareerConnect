import { useState } from "react";
import { Download, FileCheck2, Trash2 } from "lucide-react";
import { Link } from "react-router";
import UserRow from "../../components/admin/UserRow";
import {
  Button,
  DataTable,
  Modal,
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
  { key: "identity", header: "Verification" },
  { key: "access", header: "Access", headerClassName: "text-right" },
];

const DELETE_COLUMN: Column<User> = {
  key: "delete",
  header: "Test account",
  headerClassName: "text-right",
};

export default function UsersPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const {
    users,
    total,
    pageCount,
    isLoading,
    isSavingId,
    isDeletingId,
    canDeleteUsers,
    error,
    toggleAccess,
    deleteUser,
    retry,
  } =
    useUsers({ query, role, status, page });
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const columns = canDeleteUsers ? [...COLUMNS, DELETE_COLUMN] : COLUMNS;

  const resetPage = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const exportUsers = () => {
    downloadCsv(`careerconnect-users-page-${currentPage}.csv`, [
      ["Name", "Email", "Role", "Joined", "Status"],
      ...users.map((user) => [
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
        subtitle="Manage account access and review applicant and employer verification."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#078b8d] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#067b7d] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#078b8d]/25"
              to="/admin/applicant-verifications?status=pending"
            >
              <FileCheck2 size={14} />
              Review applicant documents
            </Link>
            <Button variant="outline" className="h-10" icon={<Download size={14} />} onClick={exportUsers}>
              Export users
            </Button>
          </div>
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

      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">
          <span>{error}</span><button className="font-semibold underline" onClick={retry} type="button">Try again</button>
        </div>
      )}
      <DataTable
        columns={columns}
        rows={users}
        getRowKey={(u) => u.id}
        renderRow={(u) => (
          <UserRow
            user={u}
            onToggleAccess={toggleAccess}
            canDeleteUsers={canDeleteUsers}
            onDelete={(selectedUser) => {
              setDeleteError(null);
              setDeleteConfirmation("");
              setUserToDelete(selectedUser);
            }}
            isSaving={isSavingId === u.id}
            isDeleting={isDeletingId === u.id}
          />
        )}
        emptyMessage={isLoading ? "Loading users…" : "No users match your filters."}
        footer={
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            summary={
              total === 0
                ? "Showing 0 users"
                : `Showing ${start + 1}–${Math.min(start + users.length, total)} of ${total} users`
            }
          />
        }
      />

      {userToDelete && (
        <Modal
          title="Delete test account?"
          subtitle={`This will permanently remove ${userToDelete.name}'s account.`}
          onClose={() => {
            if (isDeletingId === null) {
              setUserToDelete(null);
              setDeleteConfirmation("");
              setDeleteError(null);
            }
          }}
        >
          <div className="space-y-4 px-6 pb-6">
            <p className="text-sm leading-6 text-muted">
              This testing-only action cannot be undone. Accounts with submitted documents, company records, applications, or interview history cannot be deleted.
            </p>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-ink" htmlFor="delete-account-confirmation">
                Type <span className="font-semibold">{userToDelete.email}</span> to confirm
              </label>
              <input
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-line px-3 text-sm text-ink outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-50/80"
                id="delete-account-confirmation"
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                value={deleteConfirmation}
              />
            </div>
            {deleteError && <p className="text-sm text-red-700" role="alert">{deleteError}</p>}
            <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4">
              <Button
                variant="outline"
                disabled={isDeletingId !== null}
                onClick={() => {
                  setUserToDelete(null);
                  setDeleteConfirmation("");
                  setDeleteError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                icon={<Trash2 size={14} />}
                variant="danger"
                disabled={deleteConfirmation !== userToDelete.email || isDeletingId !== null}
                onClick={async () => {
                  setDeleteError(null);
                  try {
                    await deleteUser(userToDelete.id, deleteConfirmation);
                    setUserToDelete(null);
                    setDeleteConfirmation("");
                    if (users.length === 1 && currentPage > 1) {
                      setPage(currentPage - 1);
                    } else {
                      retry();
                    }
                  } catch (caught) {
                    setDeleteError(
                      caught instanceof Error ? caught.message : "Unable to delete this account.",
                    );
                  }
                }}
              >
                {isDeletingId === userToDelete.id ? "Deleting…" : "Delete account"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
