export default function EmployerOpportunityTypeBadge({
  children,
}: {
  children: string;
}) {
  const isTrainingOpportunity = /ojt|intern/i.test(children);

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${
        isTrainingOpportunity
          ? "bg-[#fff0d9] text-[#b8791d]"
          : "bg-[#e3f5f2] text-[#188783]"
      }`}
    >
      {children}
    </span>
  );
}
