import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white shadow-[0_2px_8px_rgba(7,139,141,.18)] hover:bg-brand-700 hover:shadow-[0_4px_12px_rgba(7,139,141,.22)]",
  outline: "border border-line bg-white text-ink shadow-sm hover:border-[#cad8d7] hover:bg-[#fafcfc]",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
};

export default function Button({
  variant = "primary",
  icon,
  children,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-[13px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
