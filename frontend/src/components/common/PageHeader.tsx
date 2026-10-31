import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4 max-[680px]:flex-col">
      <div>
        <h1 className="text-[20px] font-bold tracking-[-0.3px] text-[#263638]">{title}</h1>
        {subtitle && <p className="mt-1 text-[11px] text-[#718181]">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0 max-[680px]:w-full">{actions}</div>}
    </div>
  );
}
