import type { HTMLAttributes } from "react";

export default function Card({
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-line bg-white shadow-sm ${className}`}
      {...rest}
    />
  );
}
