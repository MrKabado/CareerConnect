import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

type SkeletonShape = "line" | "circle" | "rect";

export type SkeletonProps = ComponentPropsWithoutRef<"div"> & {
  shape?: SkeletonShape;
};

export default function Skeleton({
  className,
  shape = "line",
  ...props
}: SkeletonProps) {
  const shapeClassName =
    shape === "circle"
      ? "rounded-full"
      : shape === "line"
        ? "rounded-full"
        : "rounded-xl";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "skeleton-base skeleton-shimmer relative block bg-[#edf3f2] text-transparent",
        shapeClassName,
        className,
      )}
      {...props}
    />
  );
}
