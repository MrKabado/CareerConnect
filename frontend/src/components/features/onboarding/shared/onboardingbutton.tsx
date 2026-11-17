import type { ButtonHTMLAttributes, ReactNode } from "react";

type OnboardingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "back";
};

const variants = {
  primary:
    "gap-2 border border-[#008b98] bg-[#008b98] px-5 text-white shadow-[0_5px_12px_rgba(0,128,139,0.18)] hover:border-[#007985] hover:bg-[#007985]",
  secondary:
    "gap-2 border border-[#dfe9e9] bg-white px-4 text-[#526365] hover:border-[#b8cece] hover:bg-[#f7fbfa]",
  back: "gap-2 border border-[#edf1f1] bg-white px-4 text-[#98a4a5] hover:border-[#d5e0e0] hover:text-[#526365]",
} as const;

export default function OnboardingButton({
  children,
  className = "",
  icon,
  variant = "primary",
  ...props
}: OnboardingButtonProps) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center rounded-[10px] text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078b8d] disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}