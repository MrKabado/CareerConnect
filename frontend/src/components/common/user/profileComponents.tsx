import type { ReactNode } from "react";

type ProfileIconName =
  | "user"
  | "briefcase"
  | "education"
  | "settings"
  | "skills"
  | "resume"
  | "pin";

function ProfileIcon({
  name,
  size = 14,
}: {
  name: ProfileIconName;
  size?: number;
}) {
  const paths: Record<ProfileIconName, ReactNode> = {
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
      </>
    ),
    education: (
      <>
        <path d="m2 9 10-5 10 5-10 5L2 9Z" />
        <path d="M6 11v5c3.5 3 8.5 3 12 0v-5m4-2v6" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.9l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1-.1 1.8Z" />
      </>
    ),
    skills: (
      <>
        <path d="m12 3 2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3Z" />
        <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
      </>
    ),
    resume: (
      <>
        <path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M14 3v5h5m-9 4h5m-5 4h5" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  );
}

export function ProfilePanel({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: ProfileIconName;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[15px] border border-[#e8eeee] bg-white px-4 py-3.5 shadow-[0_5px_16px_rgba(39,85,82,0.045)] max-[680px]:px-3.5 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#344749]">
          <span className="text-[#078b8d]">
            <ProfileIcon name={icon} />
          </span>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export function ProfileField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[8px] font-semibold uppercase tracking-[0.04em] text-[#98a5a5]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-[10px] font-medium text-[#526365]">
        {value || "Not provided"}
      </dd>
    </div>
  );
}

export function ProfileTags({ tags }: { tags: string[] }) {
  return tags.length > 0 ? (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          className="rounded-full bg-[#e5f4f2] px-2 py-1 text-[9px] font-semibold text-[#417976]"
          key={tag}
        >
          {tag}
        </span>
      ))}
    </div>
  ) : (
    <p className="text-[10px] text-[#8a999a]">No details added yet.</p>
  );
}

export function ProfileStrengthCard({
  percentage,
  onComplete,
  description,
}: {
  percentage: number;
  onComplete: () => void;
  description?: string;
}) {
  return (
    <ProfilePanel title="Profile strength" icon="skills">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-[#718184]">Your profile is</span>
        <strong className="text-[#078b8d]">{percentage}%</strong>
      </div>
      <div
        aria-label={`Profile strength ${percentage}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentage}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8f0ef]"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-[#078b8d] transition-[width]"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-2 text-[9px] leading-4 text-[#829092]">
        {description ??
          "Add a resume and complete your preferences to help employers see more of your skills."}
      </p>
      <button
        className="mt-2 inline-flex items-center gap-1 rounded text-[9px] font-bold text-[#078b8d] hover:underline focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
        onClick={onComplete}
        type="button"
      >
        Complete profile <span aria-hidden="true">›</span>
      </button>
    </ProfilePanel>
  );
}

export function ProfileIconBadge({ children }: { children: ReactNode }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#e1efed] bg-[#f0f8f7] text-[#078b8d]">
      {children}
    </span>
  );
}

export function ProfileResumeIcon() {
  return <ProfileIcon name="resume" size={15} />;
}

export function ProfileLocationIcon() {
  return <ProfileIcon name="pin" size={12} />;
}
