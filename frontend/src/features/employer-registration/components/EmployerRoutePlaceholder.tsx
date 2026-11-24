export default function EmployerRoutePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f5f8f8] px-5 py-10 font-sans text-[#263a3c]">
      <section className="w-full max-w-[560px] rounded-2xl border border-[#e5eeec] bg-white p-8 shadow-[0_8px_30px_rgba(27,54,52,0.08)] max-[520px]:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#078b8d]">
          CareerConnect for employers
        </p>
        <h1 className="mt-3 text-xl font-bold text-[#293d3e]">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#718082]">{description}</p>
      </section>
    </main>
  );
}