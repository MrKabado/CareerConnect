import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  outline: "border border-line bg-white text-ink hover:bg-canvas",
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
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-4 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
