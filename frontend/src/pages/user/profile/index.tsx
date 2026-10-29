import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from "react";
import { Link, useNavigate } from "react-router";
import Footer from "@/components/common/user/userFooter";
import Header from "@/components/common/user/userHeader";
import ProfilePreferencesEditor, {
  type ProfilePreferencesDraft,
} from "@/components/common/user/ProfilePreferencesEditor";
import SavedOpportunitiesModal from "@/components/common/user/SavedOpportunitiesModal";
import {
  ProfileField,
  ProfileIconBadge,
  ProfileLocationIcon,
  ProfilePanel,
  ProfileResumeIcon,
  ProfileStrengthCard,
  ProfileTags,
} from "@/components/common/user/profileComponents";
import { useAuth } from "@/features/auth/useAuth";
import { onboardingStore } from "@/features/onboarding/store";
import { ojtProfileExample as ojtSeekerExample } from "@/features/onboarding/ojtProfileExample";
import type { OnboardingStepId } from "@/features/onboarding/config/steps";

const maxResumeSize = 10 * 1024 * 1024;
const allowedResumeName = /\.(pdf|doc|docx)$/i;
const profilePictureStorageKey = "careerconnect.profile-picture";
const maxProfilePictureSize = 2 * 1024 * 1024;

function getStoredProfilePicture() {
  try {
    const storedPicture = localStorage.getItem(profilePictureStorageKey);
    return storedPicture?.startsWith("data:image/") ? storedPicture : null;
  } catch {
    return null;
  }
}

const jobSeekerExample = {
  name: "Jamie Dela Cruz",
  email: "jamie.delacruz@example.com",
  location: "Quezon City, Metro Manila",
  phone: "+63 917 456 2038",
  title: "Frontend Developer",
  workExperience: [
    {
      title: "Junior Frontend Developer",
      company: "Pixelwave Studio · Full-time",
      period: "2024 – Present",
      description:
        "Build responsive customer portals and reusable React components for Philippine SMEs.",
    },
    {
      title: "Web Development Intern",
      company: "Cloudstaff Philippines · Internship",
      period: "2023 · 5 months",
      description: "",
    },
  ],
  education: {
    course: "BS Information Technology",
    school: "Polytechnic University of the Philippines",
    period: "2020 – 2024",
  },
  skills: ["React", "JavaScript", "Figma", "Communication", "Git", "Responsive Design"],
  jobCategories: ["Information Technology"],
  employmentTypes: ["Full-time"],
  workSetups: ["Hybrid", "Remote"],
  locations: ["Metro Manila"],
  minimumSalary: "45,000",
  maximumSalary: "65,000",
  experienceLevel: "1–3 years",
  resumeName: "Jamie_Dela_Cruz_Resume.pdf",
  resumeDetails: "Uploaded June 12, 2026 · 1.2 MB",
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toLocaleUpperCase())
    .join("");
}

function formatFileSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(date);
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [profilePictureError, setProfilePictureError] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(
    getStoredProfilePicture(),
  );
  const [sampleResumeRemoved, setSampleResumeRemoved] = useState(false);
  const [isPreferencesEditorOpen, setIsPreferencesEditorOpen] = useState(false);
  const [isBookmarksModalOpen, setIsBookmarksModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isProfilePictureMenuOpen, setIsProfilePictureMenuOpen] = useState(false);
  const [isProfilePicturePreviewOpen, setIsProfilePicturePreviewOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const profilePictureMenuRef = useRef<HTMLDivElement>(null);
  const profilePictureInputRef = useRef<HTMLInputElement>(null);
  const onboarding = useSyncExternalStore(
    onboardingStore.subscribe,
    onboardingStore.getSnapshot,
    onboardingStore.getSnapshot,
  );
  const answers = onboarding.answers;
  const isOjtSeeker = answers.goal === "ojt-seeker";
  const useJobSeekerExample = !isOjtSeeker;
  const providedName = (user?.name || answers.name).trim();
  const name =
    providedName ||
    (isOjtSeeker || useJobSeekerExample
      ? jobSeekerExample.name
      : "Complete your profile");
  const email =
    user?.email ||
    answers.email ||
    (isOjtSeeker || useJobSeekerExample
      ? jobSeekerExample.email
      : "Not provided");
  const location =
    answers.preferredLocations.join(", ") ||
    (isOjtSeeker
      ? "Quezon City, Metro Manila"
      : useJobSeekerExample
        ? jobSeekerExample.location
        : "Not provided");
  const resume = answers.resumeFile;
  const showSampleResume =
    !resume && !sampleResumeRemoved;
  const skills =
    answers.skills.length > 0
      ? answers.skills
      : isOjtSeeker
        ? ojtSeekerExample.skills
        : jobSeekerExample.skills;
  const profileChecks = [
    Boolean(providedName),
    Boolean(email !== "Not provided"),
    Boolean(
      isOjtSeeker
        ? answers.school || answers.course
        : answers.jobCategories.length || answers.desiredJobTitles.length,
    ),
    answers.skills.length > 0,
    answers.preferredLocations.length > 0,
    Boolean(answers.workSetup),
    Boolean(resume),
  ];
  const strength =
    useJobSeekerExample || isOjtSeeker
      ? 88
      : Math.round(
          (profileChecks.filter(Boolean).length / profileChecks.length) * 100,
        );

  function editProfile(step: OnboardingStepId) {
    onboardingStore.setStep(step);
    navigate("/onboarding");
  }

  function openPreferencesEditor() {
    setIsActionMenuOpen(false);
    setIsPreferencesEditorOpen(true);
  }

  function openBookmarks() {
    setIsActionMenuOpen(false);
    setIsBookmarksModalOpen(true);
  }

  async function handleLogout() {
    setLogoutError(null);
    setIsActionMenuOpen(false);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setLogoutError("Unable to log out. Please try again.");
      setIsActionMenuOpen(true);
    }
  }

  useEffect(() => {
    if (!isActionMenuOpen && !isProfilePictureMenuOpen && !isProfilePicturePreviewOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (actionMenuRef.current && !actionMenuRef.current.contains(target)) {
        setIsActionMenuOpen(false);
      }
      if (
        profilePictureMenuRef.current &&
        !profilePictureMenuRef.current.contains(target)
      ) {
        setIsProfilePictureMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsActionMenuOpen(false);
        setIsProfilePictureMenuOpen(false);
        setIsProfilePicturePreviewOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActionMenuOpen, isProfilePictureMenuOpen, isProfilePicturePreviewOpen]);

  function changeProfileMode(goal: "job-seeker" | "ojt-seeker") {
    setSampleResumeRemoved(false);
    onboardingStore.setAnswer("goal", goal);
  }

  function handleResumeUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const hasAllowedType =
      !file.type ||
      file.type === "application/pdf" ||
      file.type === "application/msword" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!allowedResumeName.test(file.name) || !hasAllowedType) {
      setResumeError("Choose a PDF, DOC, or DOCX file.");
      return;
    }
    if (file.size > maxResumeSize) {
      setResumeError("Your resume must be 10 MB or smaller.");
      return;
    }

    setResumeError(null);
    setSampleResumeRemoved(false);
    onboardingStore.setAnswer("resumeFile", file);
    onboardingStore.setAnswer("resumeSkipped", false);
  }

  function handleProfilePictureUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsProfilePictureMenuOpen(false);

    const hasSupportedExtension = /\.(jpe?g|png|webp)$/i.test(file.name);
    const hasSupportedType =
      ["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      (!file.type && hasSupportedExtension);
    if (!hasSupportedType) {
      setProfilePictureError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > maxProfilePictureSize) {
      setProfilePictureError("Profile pictures must be 2 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setProfilePictureError("We could not read that image. Try another file.");
        return;
      }

      try {
        localStorage.setItem(profilePictureStorageKey, reader.result);
        setProfilePicture(reader.result);
        setProfilePictureError(null);
      } catch {
        setProfilePictureError("Unable to save this image in your browser.");
      }
    };
    reader.onerror = () =>
      setProfilePictureError("We could not read that image. Try another file.");
    reader.readAsDataURL(file);
  }

  function removeProfilePicture() {
    try {
      localStorage.removeItem(profilePictureStorageKey);
      setProfilePicture(null);
      setProfilePictureError(null);
      setIsProfilePictureMenuOpen(false);
    } catch {
      setProfilePictureError("Unable to remove the saved profile picture.");
    }
  }

  function downloadResume() {
    if (!resume) return;
    const url = URL.createObjectURL(resume);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = resume.name;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const verificationEmail =
    user && !user.email_verified_at
      ? user.email
      : onboarding.accountCreated && !user
        ? answers.email
        : "";
  const isEmailVerified = Boolean(user?.email_verified_at);
  const hasEmailVerificationStatus = Boolean(user) || onboarding.accountCreated;
  const emailStatusClass = `flex flex-wrap items-center justify-between gap-3 rounded-[14px] border px-4 py-3 ${
    isEmailVerified
      ? "border-[#cfe8d5] bg-[#f0f8f1]"
      : verificationEmail
        ? "border-[#f0dfbd] bg-[#fff9ed]"
        : "border-[#e5ebea] bg-white"
  }`;
  const emailStatusContent = (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-bold ${
            isEmailVerified
              ? "bg-[#e0f1e4] text-[#287a45]"
              : verificationEmail
                ? "bg-[#fff0d6] text-[#9b7026]"
                : "bg-[#eef2f1] text-[#778687]"
          }`}
        >
          {isEmailVerified ? "✓" : "!"}
        </span>
        <div className="min-w-0">
          <h2 className="text-[11px] font-bold text-[#344749]">
            {isEmailVerified
              ? "Email verified"
              : verificationEmail
                ? "Email not verified"
                : "Email verification status unavailable"}
          </h2>
          <p className="mt-0.5 truncate text-[9px] text-[#758486]">
            {isEmailVerified
              ? user?.email
              : verificationEmail
                ? `Verify ${verificationEmail} to secure your account.`
                : hasEmailVerificationStatus
                  ? "Verification status could not be loaded."
                  : "This profile has no registered account status."}
          </p>
        </div>
      </div>
      {verificationEmail && !isEmailVerified && (
        <span className="ml-10 rounded-lg bg-[#078b8d] px-3 py-2 text-[9px] font-semibold text-white max-[520px]:ml-0">
          Verify email <span aria-hidden="true">→</span>
        </span>
      )}
    </>
  );
  const preferencesStep: OnboardingStepId = isOjtSeeker
    ? "preferences"
    : "job-preferences";
  const preferencesForEditor: ProfilePreferencesDraft = {
    school: answers.school || (isOjtSeeker ? ojtSeekerExample.school : ""),
    course:
      answers.course ||
      (isOjtSeeker
        ? ojtSeekerExample.course
        : useJobSeekerExample
          ? jobSeekerExample.education.course
          : ""),
    yearLevel: answers.yearLevel || (isOjtSeeker ? ojtSeekerExample.yearLevel : ""),
    requiredOjtHours:
      answers.requiredOjtHours ||
      (isOjtSeeker ? ojtSeekerExample.requiredOjtHours : ""),
    requiresMoa: answers.requiresMoa,
    trainingFields:
      answers.trainingFields.length > 0
        ? answers.trainingFields
        : isOjtSeeker
          ? ojtSeekerExample.trainingFields
          : [],
    jobCategories:
      answers.jobCategories.length > 0
        ? answers.jobCategories
        : useJobSeekerExample
          ? jobSeekerExample.jobCategories
          : [],
    desiredJobTitles:
      answers.desiredJobTitles.length > 0
        ? answers.desiredJobTitles
        : useJobSeekerExample
          ? [jobSeekerExample.title]
          : [],
    employmentTypes:
      answers.employmentTypes.length > 0
        ? answers.employmentTypes
        : useJobSeekerExample
          ? jobSeekerExample.employmentTypes
          : [],
    experienceLevel:
      answers.experienceLevel ||
      (useJobSeekerExample ? jobSeekerExample.experienceLevel : ""),
    minimumSalary:
      answers.minimumSalary ||
      (useJobSeekerExample ? jobSeekerExample.minimumSalary : ""),
    maximumSalary:
      answers.maximumSalary ||
      (useJobSeekerExample ? jobSeekerExample.maximumSalary : ""),
    skills:
      answers.skills.length > 0
        ? answers.skills
        : isOjtSeeker
          ? ojtSeekerExample.skills
          : jobSeekerExample.skills,
    preferredStartDate:
      answers.preferredStartDate ||
      (isOjtSeeker ? ojtSeekerExample.preferredStartDate : ""),
    allowancePreference:
      answers.allowancePreference ||
      (isOjtSeeker ? ojtSeekerExample.allowancePreference : ""),
    workSetup:
      answers.workSetup ||
      (isOjtSeeker
        ? ojtSeekerExample.workSetup
        : useJobSeekerExample
          ? jobSeekerExample.workSetups[0]
          : ""),
    preferredLocations:
      answers.preferredLocations.length > 0
        ? answers.preferredLocations
        : isOjtSeeker
          ? ojtSeekerExample.preferredLocations
          : useJobSeekerExample
            ? jobSeekerExample.locations
            : [],
  };

  return (
    <div className="flex min-h-screen min-w-[320px] flex-col overflow-x-hidden bg-[#f5f8f8] font-sans text-[#263a3c] antialiased">
      <Header />
      <main className="mx-auto w-full max-w-[1136px] flex-1 px-10 pt-5 pb-8 max-[920px]:px-6 max-[680px]:px-4 max-[680px]:pt-4">
        <section className="overflow-visible rounded-[16px] border border-[#e7eeee] bg-white shadow-[0_5px_18px_rgba(32,67,65,0.05)]">
          <div className="h-[112px] rounded-t-[15px] bg-[radial-gradient(ellipse_at_77%_0%,rgba(194,236,228,0.22),transparent_44%),linear-gradient(112deg,#078b8d_0%,#079f98_53%,#12a99a_100%)] max-[680px]:h-[82px]" />
          <div className="px-5 pb-4 max-[680px]:px-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-end gap-3">
                <div
                  className="relative -mt-9 size-[58px] shrink-0 max-[680px]:-mt-7 max-[680px]:size-[48px]"
                  ref={profilePictureMenuRef}
                >
                  <button
                    aria-expanded={isProfilePictureMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Profile picture options"
                    className="grid size-full place-items-center overflow-hidden rounded-[12px] border-[3px] border-white bg-[#078b8d] text-[16px] font-bold text-white shadow-sm focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
                    onClick={() =>
                      setIsProfilePictureMenuOpen((isOpen) => !isOpen)
                    }
                    title="Profile picture options"
                    type="button"
                  >
                    {profilePicture ? (
                      <img
                        alt={`${name} profile`}
                        className="size-full object-cover"
                        src={profilePicture}
                      />
                    ) : (
                      getInitials(name) || "?"
                    )}
                  </button>
                  <input
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    className="sr-only"
                    onChange={handleProfilePictureUpload}
                    ref={profilePictureInputRef}
                    type="file"
                  />
                  {isProfilePictureMenuOpen && (
                    <div
                      aria-label="Profile picture options"
                      className="absolute top-full left-0 z-40 mt-2 w-48 rounded-xl border border-[#e5eeec] bg-white p-1.5 shadow-[0_12px_30px_rgba(27,54,52,0.16)]"
                      role="menu"
                    >
                      {profilePicture && (
                        <button
                          className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-[10px] font-medium text-[#526365] hover:bg-[#f2f8f6] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[-2px]"
                          onClick={() => {
                            setIsProfilePictureMenuOpen(false);
                            setIsProfilePicturePreviewOpen(true);
                          }}
                          role="menuitem"
                          type="button"
                        >
                          See profile picture
                        </button>
                      )}
                      <button
                        className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-[10px] font-medium text-[#526365] hover:bg-[#f2f8f6] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[-2px]"
                        onClick={() => profilePictureInputRef.current?.click()}
                        role="menuitem"
                        type="button"
                      >
                        {profilePicture ? "Change profile picture" : "Choose profile picture"}
                      </button>
                      {profilePicture && (
                        <button
                          className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-[10px] font-medium text-[#a2534c] hover:bg-[#fff5f4] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[-2px]"
                          onClick={removeProfilePicture}
                          role="menuitem"
                          type="button"
                        >
                          Remove profile picture
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="min-w-0 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-[17px] font-bold text-[#293d3e]">
                      {name}
                    </h1>
                    <span className="rounded-full bg-[#e5f4f2] px-2 py-1 text-[8px] font-semibold text-[#32817e]">
                      {isOjtSeeker ? "OJT Seeker" : "Job Seeker"}
                    </span>
                  </div>
                  <p className="mt-1 text-[9px] text-[#829092]">
                    {isOjtSeeker
                      ? [
                          answers.course || ojtSeekerExample.course,
                          answers.yearLevel || ojtSeekerExample.yearLevel,
                        ].join(" · ")
                      : [
                          answers.desiredJobTitles[0],
                          answers.preferredLocations[0],
                        ]
                          .filter(Boolean)
                          .join(" · ") ||
                            (useJobSeekerExample
                              ? `${jobSeekerExample.title} · ${jobSeekerExample.location}`
                              : email)}
                  </p>
                  {profilePictureError && (
                    <p className="mt-1 text-[9px] text-[#b34b4b]" role="alert">
                      {profilePictureError}
                    </p>
                  )}
                </div>
              </div>
              <div
                className="relative mb-1 max-[680px]:ml-auto"
                ref={actionMenuRef}
              >
                <button
                  aria-expanded={isActionMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Profile actions"
                  className="inline-grid size-9 place-items-center rounded-lg bg-white text-[#526365] hover:bg-[#f6faf9] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
                  onClick={() => setIsActionMenuOpen((open) => !open)}
                  title="Profile actions"
                  type="button"
                >
                  <svg
                    aria-hidden="true"
                    className="size-4"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <circle cx="8" cy="3" r="1.25" />
                    <circle cx="8" cy="8" r="1.25" />
                    <circle cx="8" cy="13" r="1.25" />
                  </svg>
                </button>
                {isActionMenuOpen && (
                  <div
                    aria-label="Profile actions"
                    className="absolute top-full right-0 z-30 mt-2 w-52 rounded-xl border border-[#e5eeec] bg-white p-1.5 shadow-[0_12px_30px_rgba(27,54,52,0.16)]"
                    role="menu"
                  >
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[11px] font-medium text-[#526365] hover:bg-[#f2f8f6] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[-2px]"
                      onClick={openPreferencesEditor}
                      role="menuitem"
                      type="button"
                    >
                      <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 5 4 4M4 20l4-.8L19.2 8a2.1 2.1 0 0 0-3-3L5 16.2 4 20Z" />
                      </svg>
                      Edit preferences
                    </button>
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[11px] font-medium text-[#526365] hover:bg-[#f2f8f6] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[-2px]"
                      onClick={openBookmarks}
                      role="menuitem"
                      type="button"
                    >
                      <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 4h12v17l-6-4-6 4V4Z" />
                      </svg>
                      Bookmarks
                    </button>
                    <div className="my-1 border-t border-[#edf1f1]" />
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[11px] font-medium text-[#a2534c] hover:bg-[#fff5f4] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-[-2px]"
                      onClick={() => void handleLogout()}
                      role="menuitem"
                      type="button"
                    >
                      <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
                      </svg>
                      Log out
                    </button>
                    {logoutError && (
                      <p className="px-3 py-2 text-[9px] text-[#a2534c]" role="alert">
                        {logoutError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f1] pt-3">
              <div>
                <h2 className="text-[10px] font-bold text-[#526365]">
                  Profile mode
                </h2>
                <p className="mt-0.5 text-[9px] text-[#93a0a1]">
                  Switch modes to manage separate job and OJT preferences.
                </p>
              </div>
              <div
                aria-label="Profile mode"
                className="inline-flex rounded-lg bg-[#edf4f3] p-1"
                role="group"
              >
                <button
                  aria-pressed={!isOjtSeeker}
                  className={`rounded-md px-3 py-1.5 text-[9px] font-semibold ${
                    !isOjtSeeker
                      ? "bg-[#078b8d] text-white shadow-sm"
                      : "text-[#708384] hover:text-[#087879]"
                  }`}
                  onClick={() => changeProfileMode("job-seeker")}
                  type="button"
                >
                  Job Seeker
                </button>
                <button
                  aria-pressed={isOjtSeeker}
                  className={`rounded-md px-3 py-1.5 text-[9px] font-semibold ${
                    isOjtSeeker
                      ? "bg-[#078b8d] text-white shadow-sm"
                      : "text-[#708384] hover:text-[#087879]"
                  }`}
                  onClick={() => changeProfileMode("ojt-seeker")}
                  type="button"
                >
                  OJT Seeker
                </button>
              </div>
            </div>
          </div>
        </section>

        {verificationEmail && !isEmailVerified ? (
          <Link
            aria-label={`Email not verified. Verify ${verificationEmail}`}
            className={`mt-4 block cursor-pointer transition-shadow hover:shadow-[0_4px_14px_rgba(27,75,72,0.08)] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 ${emailStatusClass}`}
            to={`/verify-email?email=${encodeURIComponent(verificationEmail)}`}
          >
            {emailStatusContent}
          </Link>
        ) : (
          <aside className={`mt-4 ${emailStatusClass}`} role="status">
            {emailStatusContent}
          </aside>
        )}

        <div className="mt-4 grid grid-cols-[minmax(0,1.65fr)_minmax(250px,0.85fr)] items-start gap-4 max-[760px]:grid-cols-1">
          <div className="flex min-w-0 flex-col gap-3">
            <ProfilePanel
              icon="user"
              title="Personal info"
            >
              <dl className="grid grid-cols-2 gap-x-5 gap-y-3 max-[480px]:grid-cols-1">
                <ProfileField label="Full name" value={name} />
                <ProfileField label="Location" value={location} />
                <div className="min-w-0">
                  <dt className="text-[8px] font-semibold uppercase tracking-[0.04em] text-[#98a5a5]">
                    Email
                  </dt>
                  <dd className="mt-1 break-words text-[10px] font-medium text-[#526365]">
                    {email}
                  </dd>
                </div>
                <ProfileField
                  label="Mobile"
                  value={
                    isOjtSeeker || useJobSeekerExample
                      ? jobSeekerExample.phone
                      : "Not provided"
                  }
                />
              </dl>
            </ProfilePanel>

            {isOjtSeeker ? (
              <ProfilePanel
                icon="education"
                title="School & OJT requirements"
              >
                <dl className="grid grid-cols-2 gap-x-5 gap-y-3">
                  <ProfileField
                    label="School"
                    value={answers.school || ojtSeekerExample.school}
                  />
                  <ProfileField
                    label="Course"
                    value={answers.course || ojtSeekerExample.course}
                  />
                  <ProfileField
                    label="Year level"
                    value={answers.yearLevel || ojtSeekerExample.yearLevel}
                  />
                  <ProfileField
                    label="Required hours"
                    value={`${answers.requiredOjtHours || ojtSeekerExample.requiredOjtHours} hours`}
                  />
                </dl>
                <p className="mt-3 rounded-lg bg-[#eff9f7] px-3 py-2.5 text-[9px] text-[#6f8584]">
                  <span className="mr-2 font-bold text-[#078b8d]">✓</span>
                  {answers.requiresMoa
                    ? "My school requires a MOA with the company."
                    : "My school does not require a MOA with the company."}
                </p>
              </ProfilePanel>
            ) : (
              <ProfilePanel
                icon="briefcase"
                title="Work experience"
              >
                {useJobSeekerExample ? (
                  <div className="space-y-4 border-l border-[#e7eeee] pl-3">
                    {jobSeekerExample.workExperience.map((experience) => (
                      <div className="relative min-w-0" key={experience.title}>
                        <span className="absolute -left-[15px] top-1 size-1.5 rounded-full bg-[#078b8d]" />
                        <p className="text-[10px] font-semibold text-[#526365]">
                          {experience.title}
                        </p>
                        <p className="mt-1 text-[9px] text-[#849293]">
                          {experience.company}
                        </p>
                        <p className="text-[8px] text-[#9aa6a7]">
                          {experience.period}
                        </p>
                        {experience.description && (
                          <p className="mt-2 text-[9px] leading-4 text-[#849293]">
                            {experience.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#078b8d]" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-[#526365]">
                        {answers.experienceLevel || "Experience details not added"}
                      </p>
                      <p className="mt-1 text-[9px] leading-4 text-[#849293]">
                        {answers.desiredJobTitles.length > 0
                          ? `Interested in ${answers.desiredJobTitles.join(", ")}`
                          : "Add your career interests to improve your recommendations."}
                      </p>
                    </div>
                  </div>
                )}
              </ProfilePanel>
            )}

            <ProfilePanel
              icon="education"
              title="Education"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#078b8d]" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-[#526365]">
                    {answers.course ||
                      (isOjtSeeker
                        ? ojtSeekerExample.course
                        : useJobSeekerExample
                        ? jobSeekerExample.education.course
                        : "Education details not added")}
                  </p>
                  <p className="mt-1 text-[9px] text-[#849293]">
                    {[
                      answers.school ||
                        (isOjtSeeker
                          ? ojtSeekerExample.school
                          : useJobSeekerExample
                            ? jobSeekerExample.education.school
                            : ""),
                      isOjtSeeker
                        ? ojtSeekerExample.educationPeriod
                        : answers.yearLevel ||
                          (useJobSeekerExample
                            ? jobSeekerExample.education.period
                            : ""),
                    ]
                      .filter(Boolean)
                      .join(" · ") ||
                      "Add your education details to your profile."}
                  </p>
                </div>
              </div>
            </ProfilePanel>

            <ProfilePanel
              icon="settings"
              title={isOjtSeeker ? "OJT preferences" : "Work preferences"}
            >
              <ProfileTags
                tags={[
                  ...(isOjtSeeker
                    ? answers.trainingFields.length > 0
                      ? answers.trainingFields
                      : ojtSeekerExample.trainingFields
                    : answers.jobCategories.length > 0
                      ? answers.jobCategories
                      : useJobSeekerExample
                        ? jobSeekerExample.jobCategories
                        : []),
                  ...(answers.desiredJobTitles.length > 0
                    ? answers.desiredJobTitles
                    : useJobSeekerExample
                      ? [jobSeekerExample.title]
                      : []),
                  ...(answers.employmentTypes.length > 0
                    ? answers.employmentTypes
                    : useJobSeekerExample
                      ? jobSeekerExample.employmentTypes
                      : []),
                  ...(answers.workSetup
                    ? [answers.workSetup]
                    : isOjtSeeker
                      ? [ojtSeekerExample.workSetup]
                      : useJobSeekerExample
                        ? jobSeekerExample.workSetups
                        : []),
                  ...(answers.preferredLocations.length > 0
                    ? answers.preferredLocations
                    : isOjtSeeker
                      ? ojtSeekerExample.preferredLocations
                      : useJobSeekerExample
                        ? jobSeekerExample.locations
                        : []),
                  ...(isOjtSeeker
                    ? [
                        answers.allowancePreference ||
                          ojtSeekerExample.allowancePreference,
                        ...(answers.requiresMoa ? ["MOA required"] : []),
                      ]
                    : []),
                ].filter(Boolean)}
              />
              <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-[#edf1f1] pt-3">
                <ProfileField
                  label={isOjtSeeker ? "Preferred start date" : "Expected salary"}
                  value={
                    isOjtSeeker
                      ? formatDate(
                          answers.preferredStartDate ||
                            ojtSeekerExample.preferredStartDate,
                        )
                      : answers.minimumSalary || answers.maximumSalary
                        ? `₱${answers.minimumSalary || "Any"} – ₱${answers.maximumSalary || "Any"} monthly`
                        : useJobSeekerExample
                          ? `₱${jobSeekerExample.minimumSalary} – ₱${jobSeekerExample.maximumSalary} monthly`
                          : "Not provided"
                  }
                />
                <ProfileField
                  label={isOjtSeeker ? "Required training" : "Experience level"}
                  value={
                    isOjtSeeker
                      ? `${answers.requiredOjtHours || ojtSeekerExample.requiredOjtHours} hours`
                      : answers.experienceLevel ||
                        (useJobSeekerExample
                          ? jobSeekerExample.experienceLevel
                          : "Not provided")
                  }
                />
              </dl>
            </ProfilePanel>
          </div>

          <aside className="flex min-w-0 flex-col gap-3">
            <ProfileStrengthCard
              onComplete={() => editProfile(preferencesStep)}
              percentage={strength}
              description={
                isOjtSeeker
                  ? "Add a letter from your school to strengthen your OJT profile."
                  : useJobSeekerExample
                    ? "Add a portfolio link to help employers see more of your work."
                    : undefined
              }
            />
            <ProfilePanel
              icon="skills"
              title="Skills"
            >
              <ProfileTags tags={skills} />
            </ProfilePanel>
            <ProfilePanel icon="resume" title="Resume">
              {resume || showSampleResume ? (
                <>
                  <div className="flex items-center gap-2 rounded-lg bg-[#f2f8f7] p-2">
                    <ProfileIconBadge>
                      <ProfileResumeIcon />
                    </ProfileIconBadge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[9px] font-semibold text-[#526365]">
                        {resume?.name ||
                          (isOjtSeeker
                            ? ojtSeekerExample.resumeName
                            : jobSeekerExample.resumeName)}
                      </p>
                      <p className="mt-0.5 text-[8px] text-[#93a0a1]">
                        {resume
                          ? formatFileSize(resume.size)
                          : isOjtSeeker
                            ? ojtSeekerExample.resumeDetails
                            : jobSeekerExample.resumeDetails}
                      </p>
                    </div>
                    <button
                      aria-label="Download resume"
                      className="rounded p-1 text-[#728385] hover:bg-white hover:text-[#078b8d] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-1"
                      onClick={downloadResume}
                      disabled={!resume}
                      type="button"
                    >
                      ↓
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <label className="cursor-pointer rounded-md border border-[#e0e9e8] px-2 py-1 text-[8px] font-semibold text-[#526365] hover:bg-[#f6faf9]">
                      Replace
                      <input
                        accept=".pdf,.doc,.docx"
                        className="sr-only"
                        onChange={handleResumeUpload}
                        type="file"
                      />
                    </label>
                    <button
                      className="rounded px-1 py-1 text-[8px] font-semibold text-[#078b8d] hover:underline"
                      onClick={() => {
                        onboardingStore.setAnswer("resumeFile", null);
                        setSampleResumeRemoved(true);
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#d6e5e3] bg-[#f8fbfb] p-2.5 hover:border-[#078b8d]">
                  <ProfileIconBadge>
                    <ProfileResumeIcon />
                  </ProfileIconBadge>
                  <span className="text-[9px] font-semibold text-[#526365]">
                    Upload a PDF, DOC, or DOCX
                  </span>
                  <input
                    accept=".pdf,.doc,.docx"
                    className="sr-only"
                    onChange={handleResumeUpload}
                    type="file"
                  />
                </label>
              )}
              {resumeError && (
                <p className="mt-2 text-[9px] text-[#b34b4b]" role="alert">
                  {resumeError}
                </p>
              )}
              {location !== "Not provided" && (
                <p className="mt-2 flex items-center gap-1 text-[8px] text-[#9aa6a7]">
                  <ProfileLocationIcon />
                  Profile location: {location}
                </p>
              )}
            </ProfilePanel>
            {isOjtSeeker && (
              <ProfilePanel icon="skills" title="OJT readiness">
                <ul className="space-y-2.5 text-[9px] text-[#829092]">
                  <li className="flex items-center gap-2">
                    <span className="font-bold text-[#46b99e]">✓</span>
                    School details complete
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold text-[#46b99e]">✓</span>
                    Required hours provided
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold text-[#46b99e]">✓</span>
                    MOA requirement shared
                  </li>
                </ul>
              </ProfilePanel>
            )}
          </aside>
        </div>
      </main>
      {isPreferencesEditorOpen && (
        <ProfilePreferencesEditor
          initialPreferences={preferencesForEditor}
          isOjtSeeker={isOjtSeeker}
          onClose={() => setIsPreferencesEditorOpen(false)}
          onSave={(preferences) => {
            onboardingStore.setAnswer("skills", preferences.skills);
            onboardingStore.setAnswer(
              "workSetup",
              preferences.workSetup,
            );
            onboardingStore.setAnswer(
              "preferredLocations",
              preferences.preferredLocations,
            );

            if (isOjtSeeker) {
              onboardingStore.setAnswer("school", preferences.school);
              onboardingStore.setAnswer("course", preferences.course);
              onboardingStore.setAnswer("yearLevel", preferences.yearLevel);
              onboardingStore.setAnswer(
                "requiredOjtHours",
                preferences.requiredOjtHours,
              );
              onboardingStore.setAnswer("requiresMoa", preferences.requiresMoa);
              onboardingStore.setAnswer(
                "trainingFields",
                preferences.trainingFields,
              );
              onboardingStore.setAnswer(
                "preferredStartDate",
                preferences.preferredStartDate,
              );
              onboardingStore.setAnswer(
                "allowancePreference",
                preferences.allowancePreference,
              );
            } else {
              onboardingStore.setAnswer(
                "jobCategories",
                preferences.jobCategories,
              );
              onboardingStore.setAnswer(
                "desiredJobTitles",
                preferences.desiredJobTitles,
              );
              onboardingStore.setAnswer(
                "employmentTypes",
                preferences.employmentTypes,
              );
              onboardingStore.setAnswer(
                "minimumSalary",
                preferences.minimumSalary,
              );
              onboardingStore.setAnswer(
                "maximumSalary",
                preferences.maximumSalary,
              );
              onboardingStore.setAnswer(
                "experienceLevel",
                preferences.experienceLevel,
              );
            }

            setIsPreferencesEditorOpen(false);
          }}
        />
      )}
      {isBookmarksModalOpen && (
        <SavedOpportunitiesModal
          onClose={() => setIsBookmarksModalOpen(false)}
        />
      )}
      {isProfilePicturePreviewOpen && profilePicture && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            aria-label="Close profile picture preview"
            className="absolute inset-0 size-full cursor-default bg-[#1f3333]/70"
            onClick={() => setIsProfilePicturePreviewOpen(false)}
            type="button"
          />
          <section
            aria-label={`${name} profile picture`}
            aria-modal="true"
            className="relative z-10 flex max-h-[calc(100dvh-2rem)] max-w-[min(90vw,720px)] items-center justify-center rounded-[16px] bg-white p-2 shadow-[0_16px_48px_rgba(0,0,0,0.3)]"
            role="dialog"
          >
            <img
              alt={`${name} profile`}
              className="max-h-[calc(100dvh-3rem)] max-w-full rounded-xl object-contain"
              src={profilePicture}
            />
            <button
              aria-label="Close profile picture preview"
              className="absolute -top-3 -right-3 grid size-8 place-items-center rounded-full border border-[#e5eeec] bg-white text-[18px] text-[#526365] shadow-md hover:bg-[#f1f6f5] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
              onClick={() => setIsProfilePicturePreviewOpen(false)}
              type="button"
            >
              ×
            </button>
          </section>
        </div>
      )}
      <Footer />
    </div>
  );
}