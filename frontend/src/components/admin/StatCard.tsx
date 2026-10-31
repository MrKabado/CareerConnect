import type { LucideIcon } from "lucide-react";
import { Card } from "../common";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  icon: LucideIcon;
}

export default function StatCard({ label, value, change, icon: Icon }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {change && (
        <p className="mt-1 text-xs font-medium text-emerald-700">
          {change} <span className="font-normal text-muted">vs last month</span>
        </p>
      )}
    </Card>
  );
}
