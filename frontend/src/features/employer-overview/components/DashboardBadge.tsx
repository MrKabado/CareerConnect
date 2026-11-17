export default function DashboardBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#e3f5f2] px-2.5 py-1 text-[9px] font-semibold text-[#188783]">
      {children}
    </span>
  );
}
