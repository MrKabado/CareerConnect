interface AvatarProps {
  initials: string;
  shape?: "square" | "round";
  className?: string;
}

export default function Avatar({
  initials,
  shape = "round",
  className = "",
}: AvatarProps) {
  const shapeClass =
    shape === "square" ? "size-10 rounded-xl" : "size-8 rounded-full";
  return (
    <span
      className={`grid shrink-0 place-items-center bg-brand-50 text-xs font-semibold text-brand-700 ${shapeClass} ${className}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
