import { cn } from "@/lib/cn";

import Skeleton from "./Skeleton";

export type SkeletonAvatarProps = {
  size?: string;
  className?: string;
};

export default function SkeletonAvatar({ size = "h-10 w-10", className }: SkeletonAvatarProps) {
  return <Skeleton className={cn(size, className)} shape="circle" />;
}
