import type { ApplicantStatusIcon as ApplicantStatusIconName } from "@/features/employer-applicants/statuses";

type ApplicantStatusIconProps = {
  name: ApplicantStatusIconName;
  className?: string;
};

export default function ApplicantStatusIcon({ name, className = "size-4" }: ApplicantStatusIconProps) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...common}>
      {name === "inbox" ? <><path d="M4 4h16l2 11v4H2v-4L4 4Z" /><path d="M2 15h6l2 3h4l2-3h6" /></> : null}
      {name === "eye" ? <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></> : null}
      {name === "star" ? <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" /> : null}
      {name === "calendar" ? <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></> : null}
      {name === "file-check" ? <><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z" /><path d="M13 3v7h7M8 15l2.5 2.5L16 12" /></> : null}
      {name === "check" ? <path d="m5 12 4 4L19 6" /> : null}
      {name === "x" ? <path d="m6 6 12 12M18 6 6 18" /> : null}
    </svg>
  );
}