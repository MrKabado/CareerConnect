import { useState, useSyncExternalStore, type ChangeEvent } from "react";
import { useNavigate } from "react-router";
import Footer from "@/components/common/user/userFooter";
import Header from "@/components/common/user/userHeader";
import { EmailVerificationNotice } from "@/components/common/user/recommendationComponents";
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
import type { OnboardingStepId } from "@/features/onboarding/config/steps";

const maxResumeSize = 10 * 1024 * 1024;
const allowedResumeName = /\.(pdf|doc|docx)$/i;

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

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const onboarding = useSyncExternalStore(
    onboardingStore.subscribe,
    onboardingStore.getSnapshot,
    onboardingStore.getSnapshot,
  );
  const answers = onboarding.answers;
  const isOjtSeeker = answers.goal === "ojt-seeker";
  const providedName = (user?.name || answers.name).trim();
  const name = providedName || "Complete your profile";
  const email = user?.email || answers.email || "Not provided";
  const location = answers.preferredLocations.join(", ") || "Not provided";
  const resume = answers.resumeFile;
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
  const strength = Math.round(
    (profileChecks.filter(Boolean).length / profileChecks.length) * 100,
  );

  function editProfile(step: OnboardingStepId) {
    onboardingStore.setStep(step);
    navigate("/onboarding");
  }

  function changeProfileMode(goal: "job-seeker" | "ojt-seeker") {
    onboardingStore.setAnswer("goal", goal);
    navigate(goal === "ojt-seeker" ? "/ojt-search" : "/job-search");
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
    onboardingStore.setAnswer("resumeFile", file);
    onboardingStore.setAnswer("resumeSkipped", false);
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
  const personalInfoStep: OnboardingStepId = "create-account";
  const skillsStep: OnboardingStepId = isOjtSeeker ? "interests" : "job-skills";
  const preferencesStep: OnboardingStepId = isOjtSeeker
    ? "preferences"
    : "job-preferences";

  return (
    <div className="flex min-h-screen min-w-[320px] flex-col overflow-x-hidden bg-[#f5f8f8] font-sans text-[#263a3c] antialiased">
      <Header />
      <main className="mx-auto w-full max-w-[1136px] flex-1 px-10 pt-5 pb-8 max-[920px]:px-6 max-[680px]:px-4 max-[680px]:pt-4">
        {verificationEmail && !noticeDismissed && (
          <EmailVerificationNotice
            email={verificationEmail}
            onDismiss={() => setNoticeDismissed(true)}
          />
        )}

        <section className="overflow-hidden rounded-[16px] border border-[#e7eeee] bg-white shadow-[0_5px_18px_rgba(32,67,65,0.05)]">
          <div className="h-[112px] bg-[radial-gradient(ellipse_at_77%_0%,rgba(194,236,228,0.22),transparent_44%),linear-gradient(112deg,#078b8d_0%,#079f98_53%,#12a99a_100%)] max-[680px]:h-[82px]" />
          <div className="px-5 pb-4 max-[680px]:px-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-end gap-3">
                <span className="-mt-9 grid size-[58px] shrink-0 place-items-center rounded-[12px] border-[3px] border-white bg-[#078b8d] text-[16px] font-bold text-white shadow-sm max-[680px]:-mt-7 max-[680px]:size-[48px]">
                  {getInitials(providedName) || "?"}
                </span>
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
                      ? [answers.course, answers.school].filter(Boolean).join(" · ") ||
                        email
                      : [
                          answers.desiredJobTitles[0],
                          answers.preferredLocations[0],
                        ]
                          .filter(Boolean)
                          .join(" · ") || email}
                  </p>
                </div>
              </div>
              <button
                className="mb-1 inline-flex items-center gap-1.5 rounded-lg border border-[#e0e9e8] bg-white px-3 py-2 text-[9px] font-semibold text-[#526365] hover:bg-[#f6faf9] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 max-[680px]:ml-auto"
                onClick={() => editProfile(personalInfoStep)}
                type="button"
              >
                Edit profile
              </button>
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

        <div className="mt-4 grid grid-cols-[minmax(0,1.65fr)_minmax(250px,0.85fr)] items-start gap-4 max-[760px]:grid-cols-1">
          <div className="flex min-w-0 flex-col gap-3">
            <ProfilePanel
              icon="user"
              onEdit={() => editProfile(personalInfoStep)}
              title="Personal info"
            >
              <dl className="grid grid-cols-2 gap-x-5 gap-y-3 max-[480px]:grid-cols-1">
                <ProfileField label="Full name" value={name} />
                <ProfileField label="Location" value={location} />
                <ProfileField label="Email" value={email} />
                <ProfileField label="Phone" value="Not provided" />
              </dl>
            </ProfilePanel>

            <ProfilePanel
              icon="briefcase"
              onEdit={() => editProfile(skillsStep)}
              title="Work experience"
            >
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
            </ProfilePanel>

            <ProfilePanel
              icon="education"
              onEdit={() =>
                editProfile(isOjtSeeker ? "school" : "job-skills")
              }
              title="Education"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#078b8d]" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-[#526365]">
                    {answers.course || "Education details not added"}
                  </p>
                  <p className="mt-1 text-[9px] text-[#849293]">
                    {[answers.school, answers.yearLevel]
                      .filter(Boolean)
                      .join(" · ") || "Add your education details to your profile."}
                  </p>
                </div>
              </div>
            </ProfilePanel>

            <ProfilePanel
              icon="settings"
              onEdit={() => editProfile(preferencesStep)}
              title="Work preferences"
            >
              <ProfileTags
                tags={[
                  ...(isOjtSeeker
                    ? answers.trainingFields
                    : answers.jobCategories),
                  ...answers.desiredJobTitles,
                  ...answers.employmentTypes,
                  answers.workSetup,
                  ...answers.preferredLocations,
                ].filter(Boolean)}
              />
              <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-[#edf1f1] pt-3">
                <ProfileField
                  label={isOjtSeeker ? "Allowance preference" : "Expected salary"}
                  value={
                    isOjtSeeker
                      ? answers.allowancePreference || "Not provided"
                      : answers.minimumSalary || answers.maximumSalary
                        ? `₱${answers.minimumSalary || "Any"} – ₱${answers.maximumSalary || "Any"} monthly`
                        : "Not provided"
                  }
                />
                <ProfileField
                  label={isOjtSeeker ? "Required OJT hours" : "Experience level"}
                  value={
                    isOjtSeeker
                      ? answers.requiredOjtHours
                        ? `${answers.requiredOjtHours} hours`
                        : "Not provided"
                      : answers.experienceLevel || "Not provided"
                  }
                />
              </dl>
            </ProfilePanel>
          </div>

          <aside className="flex min-w-0 flex-col gap-3">
            <ProfileStrengthCard
              onComplete={() => editProfile(preferencesStep)}
              percentage={strength}
            />
            <ProfilePanel
              icon="skills"
              onEdit={() => editProfile(skillsStep)}
              title="Skills"
            >
              <ProfileTags tags={answers.skills} />
            </ProfilePanel>
            <ProfilePanel icon="resume" title="Resume">
              {resume ? (
                <>
                  <div className="flex items-center gap-2 rounded-lg bg-[#f2f8f7] p-2">
                    <ProfileIconBadge>
                      <ProfileResumeIcon />
                    </ProfileIconBadge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[9px] font-semibold text-[#526365]">
                        {resume.name}
                      </p>
                      <p className="mt-0.5 text-[8px] text-[#93a0a1]">
                        {formatFileSize(resume.size)}
                      </p>
                    </div>
                    <button
                      aria-label="Download resume"
                      className="rounded p-1 text-[#728385] hover:bg-white hover:text-[#078b8d] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-1"
                      onClick={downloadResume}
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
                      onClick={() => onboardingStore.setAnswer("resumeFile", null)}
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
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}