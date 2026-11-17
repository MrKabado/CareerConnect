import type { HTMLAttributes } from "react";

export default function Card({
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[16px] border border-[#e5eceb] bg-white shadow-[0_1px_2px_rgba(29,49,51,.025),0_8px_24px_rgba(29,49,51,.035)] ${className}`}
      {...rest}
    />
  );
}
