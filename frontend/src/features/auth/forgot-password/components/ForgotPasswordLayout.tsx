import type { ReactNode } from "react";
import { ForgotPasswordHeroPanel } from "./ForgotPasswordHeroPanel";

export function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#edf7f5] px-4 py-8">
      <div className="mx-auto grid max-w-[1200px] overflow-hidden rounded-[28px] border border-[#dfece8] bg-white shadow-[0_16px_50px_rgba(27,75,72,0.08)] lg:grid-cols-[1.02fr_0.98fr]">
        <ForgotPasswordHeroPanel />

        <section className="flex flex-col justify-center bg-white px-8 py-10 max-[760px]:px-5 max-[760px]:py-6">
          {children}
        </section>
      </div>
    </main>
  );
}
