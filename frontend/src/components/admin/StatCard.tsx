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
    <Card className="group p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-muted">{label}</span>
        <span className="grid size-9 place-items-center rounded-[10px] bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100">
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-[30px] font-bold leading-none tracking-[-0.6px] text-ink">{value}</p>
      {change && (
        <p className="mt-1 text-xs font-medium text-emerald-700">
          {change} <span className="font-normal text-muted">vs last month</span>
        </p>
      )}
    </Card>
  );
}
