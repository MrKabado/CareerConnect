import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-7 flex items-end justify-between gap-5 max-[680px]:flex-col max-[680px]:items-start">
      <div>
        <div className="mb-2 h-1 w-8 rounded-full bg-brand-600" aria-hidden="true" />
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.8px] text-ink max-[680px]:text-2xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0 max-[680px]:w-full">{actions}</div>}
    </div>
  );
}
