import type { ReactNode } from "react";

type AuthProviderButtonProps = {
  children: ReactNode;
  icon: ReactNode;
};

export default function AuthProviderButton({
  children,
  icon,
}: AuthProviderButtonProps) {
  return (
    <button
      className="inline-flex h-10 items-center justify-center gap-2 rounded-[9px] border border-[#e3eaea] bg-white text-[12px] font-semibold text-[#394649] transition hover:bg-[#f8fbfb] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#078b8d] max-[760px]:h-8 max-[760px]:gap-1.5 max-[760px]:rounded-lg max-[760px]:text-[10px]"
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}
