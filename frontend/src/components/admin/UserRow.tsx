import { Avatar, Button } from "../common";
import { Trash2 } from "lucide-react";
import { Link } from "react-router";
import type { User, UserRole } from "../../types";

const ROLE_STYLES: Record<UserRole, string> = {
  Applicant: "bg-indigo-50 text-indigo-700",
  Employer: "bg-brand-50 text-brand-700",
  Admin: "bg-amber-50 text-amber-700",
};

const IDENTITY_STYLES = {
  pending: "bg-amber-50 text-amber-700",
  verified: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
} as const;

const IDENTITY_LABELS = {
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
} as const;

interface UserRowProps {
  user: User;
  onToggleAccess: (id: string) => void | Promise<void>;
  canDeleteUsers: boolean;
  onDelete: (user: User) => void;
  isSaving?: boolean;
  isDeleting?: boolean;
}

/** A <tr>. Cell order must match the columns passed to DataTable. */
export default function UserRow({
  user,
  onToggleAccess,
  canDeleteUsers,
  onDelete,
  isSaving = false,
  isDeleting = false,
}: UserRowProps) {
  const isActive = user.status === "Active";

  return (
    <tr className="hover:bg-canvas/60">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar initials={user.initials} />
          <div className="min-w-0">
            <p className="font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${ROLE_STYLES[user.role]}`}
        >
          {user.role}
        </span>
      </td>
      <td className="px-5 py-3.5 text-muted">{user.joined}</td>
      <td className="px-5 py-3.5">
        <span className="inline-flex items-center gap-1.5 text-xs">
          <span
            className={`size-1.5 rounded-full ${isActive ? "bg-emerald-600" : "bg-slate-400"}`}
          />
          <span className={isActive ? "text-emerald-700" : "text-muted"}>
            {user.status}
          </span>
        </span>
      </td>
      <td className="px-5 py-3.5">
        {user.role !== "Applicant" ? (
          <span className="text-xs text-muted">—</span>
        ) : user.identityVerification ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${IDENTITY_STYLES[user.identityVerification.status]}`}>
              {IDENTITY_LABELS[user.identityVerification.status]}
            </span>
            <Link
              aria-label={`${user.identityVerification.status === "pending" ? "Review" : "View"} ${user.name}'s identity documents`}
              className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078b8d]/30 ${
                user.identityVerification.status === "pending"
                  ? "bg-[#078b8d] text-white hover:bg-[#067b7d]"
                  : "border border-line bg-white text-ink hover:border-[#078b8d] hover:text-[#078b8d]"
              }`}
              to={`/admin/applicant-verifications?search=${encodeURIComponent(user.email)}&status=all`}
            >
              {user.identityVerification.status === "pending" ? "Review docs" : "View record"}
            </Link>
          </div>
        ) : (
          <span className="text-xs text-muted">Not submitted</span>
        )}
      </td>
      <td className="px-5 py-3.5 text-right">
        <Button
          variant={isActive ? "outline" : "primary"}
          className="h-8 px-3 text-xs"
          disabled={isSaving}
          onClick={() => onToggleAccess(user.id)}
        >
          {isSaving ? "Saving…" : isActive ? "Deactivate" : "Activate"}
        </Button>
      </td>
      {canDeleteUsers && (
        <td className="px-5 py-3.5 text-right">
          {user.role === "Admin" ? (
            <span className="text-xs text-muted">Protected</span>
          ) : (
            <Button
              aria-label={`Delete ${user.name}'s test account`}
              className="h-8 px-3 text-xs"
              disabled={isDeleting || isSaving}
              icon={<Trash2 size={13} />}
              onClick={() => onDelete(user)}
              variant="danger"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          )}
        </td>
      )}
    </tr>
  );
}
