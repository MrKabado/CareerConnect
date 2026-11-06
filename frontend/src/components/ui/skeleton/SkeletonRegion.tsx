import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type SkeletonRegionProps = {
  children: ReactNode;
  className?: string;
  label?: string;
};

export default function SkeletonRegion({
  children,
  className,
  label = "Loading content",
}: SkeletonRegionProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn("relative", className)}
      role="status"
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}
