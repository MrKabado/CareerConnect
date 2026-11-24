import { cn } from "@/lib/cn";

import Skeleton from "./Skeleton";

export type SkeletonButtonProps = {
  className?: string;
  width?: string;
};

export default function SkeletonButton({ className, width = "w-28" }: SkeletonButtonProps) {
  return <Skeleton className={cn("h-11 rounded-xl", width, className)} shape="rect" />;
}
