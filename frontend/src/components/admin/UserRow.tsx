import { Avatar, Button } from "../common";
import type { User, UserRole } from "../../types";

const ROLE_STYLES: Record<UserRole, string> = {
  Applicant: "bg-indigo-50 text-indigo-700",
  Employer: "bg-brand-50 text-brand-700",
  Admin: "bg-amber-50 text-amber-700",
};

interface UserRowProps {
  user: User;
  onToggleAccess: (id: string) => void;
}

/** A <tr>. Cell order must match the columns passed to DataTable. */
export default function UserRow({ user, onToggleAccess }: UserRowProps) {
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
      <td className="px-5 py-3.5 text-right">
        <Button
          variant={isActive ? "outline" : "primary"}
          className="h-8 px-3 text-xs"
          onClick={() => onToggleAccess(user.id)}
        >
          {isActive ? "Deactivate" : "Activate"}
        </Button>
      </td>
    </tr>
  );
}
