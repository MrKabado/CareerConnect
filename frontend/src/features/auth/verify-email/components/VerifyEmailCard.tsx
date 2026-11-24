import type { ReactNode } from "react";

export function VerifyEmailCard({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#eaf6f4] px-5 py-10 font-sans text-[#263538]">
      <section className="w-full max-w-[440px] rounded-2xl bg-white p-8 shadow-[0_16px_50px_rgba(27,75,72,0.08)] max-[520px]:p-5">
        {children}
      </section>
    </main>
  );
}
