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
import {
  applicantFilesApi,
  downloadApplicantFile,
  type ApplicantProfileData,
  type ApplicantResumeFile,
} from "@/features/user-profile/backendApi";

const maxResumeSize = 10 * 1024 * 1024;
const allowedResumeName = /\.(pdf|doc|docx)$/i;
const profilePictureStorageKey = "careerconnect.profile-picture";
const maxProfilePictureSize = 2 * 1024 * 1024;

type ProfileDocument = {
  title: string;
  fileName: string;
  file?: File;
  url?: string;
  content?: string;
};

function ProfileDocumentCard({
  title,
  file,
  fileName,
  details,
  sampleContent,
  onPreview,
  onPreviewSample,
  onDownload,
  onDownloadSample,
}: {
  title: string;
  file: File | null;
  fileName: string;
  details: string;
  sampleContent?: string;
  onPreview: (file: File, title: string) => void;
  onPreviewSample: (title: string, fileName: string, content: string) => void;
  onDownload: (file: File) => void;
  onDownloadSample: (fileName: string, content: string) => void;
}) {
  const canPreview = Boolean(file || sampleContent);

  return (
    <div className="rounded-lg bg-[#f2f8f7] p-2">
      <div className="flex items-center gap-2">
        <ProfileIconBadge>
          <ProfileResumeIcon />
        </ProfileIconBadge>
        <button
          aria-label={`${canPreview ? "Preview" : title}: ${fileName}`}
          className="min-w-0 flex-1 text-left focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 disabled:cursor-default"
          disabled={!canPreview}
          onClick={() => {
            if (file) onPreview(file, title);
            else if (sampleContent) {
              onPreviewSample(title, fileName, sampleContent);
            }
          }}
          type="button"
        >
          <span className="block text-[8px] font-semibold text-[#078b8d]">
            {title}
          </span>
          <span className="block truncate text-[9px] font-semibold text-[#526365]">
            {fileName}
          </span>
          <span className="mt-0.5 block text-[8px] text-[#93a0a1]">
            {details}
          </span>
        </button>
        <button
          aria-label={`Download ${title}`}
          className="rounded p-1 text-[#728385] hover:bg-white hover:text-[#078b8d] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canPreview}
          onClick={() => {
            if (file) onDownload(file);
            else if (sampleContent) onDownloadSample(fileName, sampleContent);
          }}
          type="button"
        >
          ↓
        </button>
      </div>
      {!file && (
        <p className="mt-1 pl-10 text-[8px] text-[#93a0a1]">
          Sample document
        </p>
      )}
    </div>
  );
}

function getStoredProfilePicture() {
  try {
    const storedPicture = localStorage.getItem(profilePictureStorageKey);
    return storedPicture?.startsWith("data:image/") ? storedPicture : null;
  } catch {
    return null;
  }
}

const sampleResumeContent = `JAMIE DELA CRUZ
Frontend Developer
Quezon City, Metro Manila | jamie.delacruz@example.com | +63 917 456 2038

PROFESSIONAL SUMMARY
Frontend developer experienced in building responsive customer portals and reusable React components for Philippine SMEs. Enjoys turning product requirements into accessible, reliable user experiences.

SKILLS
React · JavaScript · Figma · Git · Responsive Design · Communication

WORK EXPERIENCE
Junior Frontend Developer | Pixelwave Studio
2024 – Present
Build responsive customer portals and reusable React components for Philippine SMEs.

Web Development Intern | Cloudstaff Philippines
2023 · 5 months
Supported the development and testing of web application features.

EDUCATION
BS Information Technology
Polytechnic University of the Philippines | 2020 – 2024`;

const sampleCoverLetterContent = `JAMIE DELA CRUZ
Quezon City, Metro Manila
jamie.delacruz@example.com | +63 917 456 2038

October 31, 2026

Dear Hiring Manager,

I am writing to express my interest in the Frontend Developer opportunity. I have hands-on experience building responsive customer portals and reusable React components, and I would be excited to bring that experience to your team.

At Pixelwave Studio, I work on customer-facing interfaces for Philippine SMEs, with a focus on clear, responsive layouts. My background in React, JavaScript, and collaborative product work has helped me deliver practical improvements while continuing to grow as a developer.

Thank you for considering my application. I would welcome the opportunity to discuss how my experience and enthusiasm could contribute to your team.

Sincerely,
Jamie Dela Cruz`;

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
  resumeName: "Jamie_Dela_Cruz_Resume.txt",
  resumeDetails: "Sample profile document",
  coverLetterName: "Jamie_Dela_Cruz_Cover_Letter.txt",
  coverLetterDetails: "Sample profile document",
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
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null);
  const [profilePictureError, setProfilePictureError] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(
    user?.role === "applicant" ? null : getStoredProfilePicture(),
  );
  const [applicantProfile, setApplicantProfile] =
    useState<ApplicantProfileData | null>(null);
  const [serverResume, setServerResume] = useState<ApplicantResumeFile | null>(null);
  const [resumeLoading, setResumeLoading] = useState(user?.role === "applicant" && Boolean(token));
  const [resumeUploadProgress, setResumeUploadProgress] = useState<number | null>(null);
  const [photoUploadProgress, setPhotoUploadProgress] = useState<number | null>(null);
  const [sampleResumeRemoved, setSampleResumeRemoved] = useState(false);
  const [sampleCoverLetterRemoved, setSampleCoverLetterRemoved] =
    useState(false);
  const [isPreferencesEditorOpen, setIsPreferencesEditorOpen] = useState(false);
  const [isBookmarksModalOpen, setIsBookmarksModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isProfilePictureMenuOpen, setIsProfilePictureMenuOpen] = useState(false);
  const [isProfilePicturePreviewOpen, setIsProfilePicturePreviewOpen] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<ProfileDocument | null>(null);
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
  const isBackendApplicant = user?.role === "applicant" && Boolean(token);
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
    isBackendApplicant
      ? applicantProfile?.city ||
        applicantProfile?.preferred_locations?.join(", ") ||
        "No location provided"
      : answers.preferredLocations.join(", ") ||
        (isOjtSeeker
          ? "Quezon City, Metro Manila"
          : useJobSeekerExample
            ? jobSeekerExample.location
            : "Not provided");
  const resume = isBackendApplicant ? null : answers.resumeFile;
  const coverLetter = isBackendApplicant ? null : answers.coverLetterFile;
  const showSampleResume =
    !isBackendApplicant && !resume && !sampleResumeRemoved;
  const showSampleCoverLetter =
    !isBackendApplicant && !coverLetter && !sampleCoverLetterRemoved;
  const skills =
    answers.skills.length > 0
      ? answers.skills
      : isOjtSeeker
        ? ojtSeekerExample.skills
        : jobSeekerExample.skills;
  const isProfileOjtSeeker = isOjtSeeker;
  const otherProfileLink =
    typeof applicantProfile?.profile_links?.other === "object"
      ? applicantProfile.profile_links.other
      : null;
  const profileChecks = isProfileOjtSeeker
    ? [
        Boolean(providedName),
        Boolean(email !== "Not provided"),
        isBackendApplicant
          ? Boolean(applicantProfile?.phone)
          : Boolean(jobSeekerExample.phone),
        isBackendApplicant
          ? Boolean(applicantProfile?.city)
          : Boolean(location !== "Not provided"),
        Boolean(applicantProfile?.profile_photo_url),
        Boolean(applicantProfile?.ojt_details?.school),
        Boolean(applicantProfile?.ojt_details?.course),
        Boolean(applicantProfile?.ojt_details?.year_level),
        Boolean(applicantProfile?.ojt_details?.required_hours),
        Boolean(applicantProfile?.ojt_details?.requires_moa !== null &&
          applicantProfile?.ojt_details?.requires_moa !== undefined),
        Boolean(applicantProfile?.skills.length),
        Boolean(applicantProfile?.interests.length),
        Boolean(applicantProfile?.preferred_locations?.length),
        Boolean(applicantProfile?.work_setups?.length),
        Boolean(applicantProfile?.ojt_details?.preferred_start_date),
        Boolean(applicantProfile?.ojt_details?.allowance_preference),
        Boolean(serverResume),
      ]
    : [
        Boolean(providedName),
        Boolean(email !== "Not provided"),
        isBackendApplicant
          ? Boolean(applicantProfile?.phone)
          : Boolean(jobSeekerExample.phone),
        isBackendApplicant
          ? Boolean(applicantProfile?.city)
          : Boolean(location !== "Not provided"),
        Boolean(applicantProfile?.profile_photo_url),
        Boolean(applicantProfile?.interests.length),
        Boolean(applicantProfile?.desired_titles?.length),
        Boolean(applicantProfile?.skills.length),
        Boolean(applicantProfile?.preferred_locations?.length),
        Boolean(applicantProfile?.work_setups?.length),
        Boolean(applicantProfile?.employment_types?.length),
        Boolean(applicantProfile?.experience_level),
        Boolean(applicantProfile?.ojt_details?.school &&
          applicantProfile?.ojt_details?.course &&
          applicantProfile?.ojt_details?.year_level),
        Boolean(serverResume),
      ];
  const strength = isBackendApplicant
    ? Math.round(
        (profileChecks.filter(Boolean).length / profileChecks.length) * 100,
      )
    : 88;

  useEffect(() => {
    if (!isBackendApplicant || !token) {
        return;
    }

    let active = true;
    applicantFilesApi
        .resume(token)
        .then((currentResume) => {
          if (active) setServerResume(currentResume);
        })
        .catch((requestError: unknown) => {
          if (active) {
            setResumeError(
              requestError instanceof Error
                ? requestError.message
                : "Unable to load your resume.",
            );
          }
        })
        .finally(() => {
          if (active) setResumeLoading(false);
        });

    applicantFilesApi
        .profile(token)
        .then((response) => {
          if (active) {
            setApplicantProfile(response.data);
            setProfilePicture(response.data.profile_photo_url);
            onboardingStore.setAnswer(
              "goal",
              response.data.looking_for_ojt && !response.data.looking_for_jobs
                ? "ojt-seeker"
                : "job-seeker",
            );
          }
        })
        .catch((requestError: unknown) => {
          if (active) {
            setProfilePictureError(
              requestError instanceof Error
                ? requestError.message
                : "Unable to load your profile photo.",
            );
          }
        });

    return () => {
        active = false;
    };
  }, [isBackendApplicant, token]);

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
    if (
      !isActionMenuOpen &&
      !isProfilePictureMenuOpen &&
      !isProfilePicturePreviewOpen &&
      !documentPreview
    ) {
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
        setDocumentPreview(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isActionMenuOpen,
    isProfilePictureMenuOpen,
    isProfilePicturePreviewOpen,
    documentPreview,
  ]);

  useEffect(() => {
    const url = documentPreview?.url;
    if (!url) return;

    return () => URL.revokeObjectURL(url);
  }, [documentPreview]);

  function changeProfileMode(goal: "job-seeker" | "ojt-seeker") {
    setSampleResumeRemoved(false);
    onboardingStore.setAnswer("goal", goal);
  }

  async function handleDocumentUpload(
    event: ChangeEvent<HTMLInputElement>,
    documentType: "resume" | "cover-letter",
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const hasAllowedType =
      !file.type ||
      file.type === "application/pdf" ||
      (documentType === "cover-letter" && file.type === "application/msword") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const allowedName =
      documentType === "resume" && isBackendApplicant
        ? /\.(pdf|docx)$/i
        : allowedResumeName;
    if (!allowedName.test(file.name) || !hasAllowedType) {
      if (documentType === "resume") {
        setResumeError(
          isBackendApplicant
            ? "Choose a PDF or DOCX resume."
            : "Choose a PDF, DOC, or DOCX file.",
        );
      } else {
        setCoverLetterError("Choose a PDF, DOC, or DOCX file.");
        onboardingStore.setAnswer("coverLetterFile", null);
      }
      return;
    }
    if (file.size > (isBackendApplicant ? 5 * 1024 * 1024 : maxResumeSize)) {
      if (documentType === "resume") {
        setResumeError(
          isBackendApplicant
            ? "Your resume must be 5 MB or smaller."
            : "Your resume must be 10 MB or smaller.",
        );
      } else {
        setCoverLetterError("Your cover letter must be 10 MB or smaller.");
        onboardingStore.setAnswer("coverLetterFile", null);
      }
      return;
    }

    if (documentType === "resume") {
      setResumeError(null);
      setSampleResumeRemoved(false);
      if (isBackendApplicant && token) {
        if (!/^resume\.(pdf|docx)$/i.test(file.name)) {
          setResumeError(
            "Rename the resume file to resume.pdf or resume.docx before uploading.",
          );
          return;
        }
        setResumeUploadProgress(0);
        try {
          setServerResume(
            await applicantFilesApi.uploadResume(token, file, setResumeUploadProgress),
          );
        } catch (requestError) {
          setResumeError(
            requestError instanceof Error
              ? requestError.message
              : "The resume could not be uploaded.",
          );
        } finally {
          setResumeUploadProgress(null);
        }
      } else {
        onboardingStore.setAnswer("resumeFile", file);
        onboardingStore.setAnswer("resumeSkipped", false);
      }
    } else {
      setCoverLetterError(null);
      setSampleCoverLetterRemoved(false);
      onboardingStore.setAnswer("coverLetterFile", file);
    }
  }

  async function removeResume() {
    if (isBackendApplicant && token) {
      setResumeError(null);
      try {
        await applicantFilesApi.deleteResume(token);
        setServerResume(null);
      } catch (requestError) {
        setResumeError(
          requestError instanceof Error
            ? requestError.message
            : "The resume could not be removed.",
        );
      }
      return;
    }

    onboardingStore.setAnswer("resumeFile", null);
    setResumeError(null);
    setSampleResumeRemoved(true);
  }

  async function downloadServerResume() {
    if (!token || !serverResume) return;
    setResumeError(null);
    try {
      downloadApplicantFile(
        await applicantFilesApi.downloadResume(token),
        serverResume.original_filename,
      );
    } catch (requestError) {
      setResumeError(
        requestError instanceof Error
          ? requestError.message
          : "The resume could not be downloaded.",
      );
    }
  }

  function previewDocument(file: File, title: string) {
    setDocumentPreview({
      title,
      fileName: file.name,
      file,
      url: URL.createObjectURL(file),
    });
  }

  function previewSampleDocument(
    title: string,
    fileName: string,
    content: string,
  ) {
    setDocumentPreview({ title, fileName, content });
  }

  function closeDocumentPreview() {
    setDocumentPreview(null);
  }

  function downloadDocument(file: File) {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadSampleDocument(fileName: string, content: string) {
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleProfilePictureUpload(event: ChangeEvent<HTMLInputElement>) {
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

    if (isBackendApplicant && token) {
      setPhotoUploadProgress(0);
      setProfilePictureError(null);
      try {
        const uploadedUrl = await applicantFilesApi.uploadPhoto(
          token,
          file,
          setPhotoUploadProgress,
        );
        setProfilePicture(uploadedUrl);
        window.dispatchEvent(
          new CustomEvent("careerconnect-profile-photo-changed", {
            detail: uploadedUrl,
          }),
        );
      } catch (requestError) {
        setProfilePictureError(
          requestError instanceof Error
            ? requestError.message
            : "The profile photo could not be uploaded.",
        );
      } finally {
        setPhotoUploadProgress(null);
      }
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

  async function removeProfilePicture() {
    if (isBackendApplicant && token) {
      setProfilePictureError(null);
      try {
        await applicantFilesApi.deletePhoto(token);
        setProfilePicture(null);
        window.dispatchEvent(
          new CustomEvent("careerconnect-profile-photo-changed", {
            detail: null,
          }),
        );
        setIsProfilePictureMenuOpen(false);
      } catch (requestError) {
        setProfilePictureError(
          requestError instanceof Error
            ? requestError.message
            : "The profile photo could not be removed.",
        );
      }
      return;
    }

    try {
      localStorage.removeItem(profilePictureStorageKey);
      setProfilePicture(null);
      setProfilePictureError(null);
      setIsProfilePictureMenuOpen(false);
    } catch {
      setProfilePictureError("Unable to remove the saved profile picture.");
    }
  }

  const verificationEmail =
    user && !user.email_verified_at
      ? user.email
      : onboarding.accountCreated && !user
        ? answers.email
        : "";
  const documentPreviewIsPdf = Boolean(
    documentPreview &&
      documentPreview.file &&
      (documentPreview.file.type === "application/pdf" ||
        /\.pdf$/i.test(documentPreview.file.name)),
  );
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
  const preferencesForEditor: ProfilePreferencesDraft = {
    name: applicantProfile?.name || providedName,
    phone: applicantProfile?.phone || "",
    city: applicantProfile?.city || "",
    portfolioLink: applicantProfile?.profile_links?.portfolio || "",
    githubLink: applicantProfile?.profile_links?.github || "",
    linkedinLink: applicantProfile?.profile_links?.linkedin || "",
    otherLinkLabel: otherProfileLink?.label || "",
    otherLink: otherProfileLink?.url || "",
    school: isBackendApplicant
      ? applicantProfile?.ojt_details?.school || ""
      : answers.school || (isOjtSeeker ? ojtSeekerExample.school : ""),
    course:
      isBackendApplicant
        ? applicantProfile?.ojt_details?.course || ""
        : answers.course ||
          (isOjtSeeker
            ? ojtSeekerExample.course
            : useJobSeekerExample
              ? jobSeekerExample.education.course
              : ""),
    yearLevel: isBackendApplicant
      ? applicantProfile?.ojt_details?.year_level
        ? String(applicantProfile.ojt_details.year_level)
        : ""
      : answers.yearLevel || (isOjtSeeker ? ojtSeekerExample.yearLevel : ""),
    requiredOjtHours:
      isBackendApplicant
        ? applicantProfile?.ojt_details?.required_hours
          ? String(applicantProfile.ojt_details.required_hours)
          : ""
        : answers.requiredOjtHours ||
          (isOjtSeeker ? ojtSeekerExample.requiredOjtHours : ""),
    requiresMoa: isBackendApplicant
      ? applicantProfile?.ojt_details?.requires_moa ?? false
      : answers.requiresMoa,
    trainingFields:
      answers.trainingFields.length > 0
        ? answers.trainingFields
        : isOjtSeeker
          ? ojtSeekerExample.trainingFields
          : [],
    jobCategories:
      isBackendApplicant
        ? applicantProfile?.interests.map((interest) => interest.name) || []
        : answers.jobCategories.length > 0
        ? answers.jobCategories
        : useJobSeekerExample
          ? jobSeekerExample.jobCategories
          : [],
    desiredJobTitles:
      isBackendApplicant
        ? applicantProfile?.desired_titles || []
        : answers.desiredJobTitles.length > 0
        ? answers.desiredJobTitles
        : useJobSeekerExample
          ? [jobSeekerExample.title]
          : [],
    employmentTypes:
      isBackendApplicant
        ? applicantProfile?.employment_types || []
        : answers.employmentTypes.length > 0
        ? answers.employmentTypes
        : useJobSeekerExample
          ? jobSeekerExample.employmentTypes
          : [],
    experienceLevel:
      isBackendApplicant
        ? applicantProfile?.experience_level || ""
        : answers.experienceLevel ||
          (useJobSeekerExample ? jobSeekerExample.experienceLevel : ""),
    minimumSalary:
      isBackendApplicant
        ? applicantProfile?.salary_min ? String(applicantProfile.salary_min) : ""
        : answers.minimumSalary ||
          (useJobSeekerExample ? jobSeekerExample.minimumSalary : ""),
    maximumSalary:
      isBackendApplicant
        ? applicantProfile?.salary_max ? String(applicantProfile.salary_max) : ""
        : answers.maximumSalary ||
          (useJobSeekerExample ? jobSeekerExample.maximumSalary : ""),
    skills:
      isBackendApplicant
        ? applicantProfile?.skills || []
        : answers.skills.length > 0
        ? answers.skills
        : isOjtSeeker
          ? ojtSeekerExample.skills
          : jobSeekerExample.skills,
    preferredStartDate:
      answers.preferredStartDate ||
      (isOjtSeeker ? ojtSeekerExample.preferredStartDate : ""),
    allowancePreference:
      isBackendApplicant
        ? applicantProfile?.ojt_details?.allowance_preference || ""
        : answers.allowancePreference ||
          (isOjtSeeker ? ojtSeekerExample.allowancePreference : ""),
    workSetup:
      isBackendApplicant
        ? applicantProfile?.work_setups?.[0] || ""
        : answers.workSetup ||
          (isOjtSeeker
            ? ojtSeekerExample.workSetup
            : useJobSeekerExample
              ? jobSeekerExample.workSetups[0]
              : ""),
    preferredLocations:
      isBackendApplicant
        ? applicantProfile?.preferred_locations || []
        : answers.preferredLocations.length > 0
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
                    {isBackendApplicant
                      ? isOjtSeeker
                        ? [
                            applicantProfile?.ojt_details?.course,
                            applicantProfile?.ojt_details?.year_level
                              ? `Year ${applicantProfile.ojt_details.year_level}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "OJT details not added"
                        : [
                            applicantProfile?.desired_titles?.[0],
                            applicantProfile?.preferred_locations?.[0],
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Career preferences not added"
                      : isOjtSeeker
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
                  {photoUploadProgress !== null && (
                    <p className="mt-1 text-[9px] text-[#087879]" role="status">
                      Uploading profile photo… {photoUploadProgress}%
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
                    isBackendApplicant
                      ? applicantProfile?.phone || ""
                      : isOjtSeeker || useJobSeekerExample
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
                    value={
                      isBackendApplicant
                        ? applicantProfile?.ojt_details?.school || ""
                        : answers.school || ojtSeekerExample.school
                    }
                  />
                  <ProfileField
                    label="Course"
                    value={
                      isBackendApplicant
                        ? applicantProfile?.ojt_details?.course || ""
                        : answers.course || ojtSeekerExample.course
                    }
                  />
                  <ProfileField
                    label="Year level"
                    value={
                      isBackendApplicant
                        ? applicantProfile?.ojt_details?.year_level
                          ? String(applicantProfile.ojt_details.year_level)
                          : ""
                        : answers.yearLevel || ojtSeekerExample.yearLevel
                    }
                  />
                  <ProfileField
                    label="Required hours"
                    value={
                      isBackendApplicant
                        ? applicantProfile?.ojt_details?.required_hours
                          ? `${applicantProfile.ojt_details.required_hours} hours`
                          : ""
                        : `${answers.requiredOjtHours || ojtSeekerExample.requiredOjtHours} hours`
                    }
                  />
                </dl>
                <p className="mt-3 rounded-lg bg-[#eff9f7] px-3 py-2.5 text-[9px] text-[#6f8584]">
                  <span className="mr-2 font-bold text-[#078b8d]">✓</span>
                  {isBackendApplicant
                    ? applicantProfile?.ojt_details?.requires_moa === true
                      ? "My school requires a MOA with the company."
                      : applicantProfile?.ojt_details?.requires_moa === false
                        ? "My school does not require a MOA with the company."
                        : "MOA requirement not provided."
                    : answers.requiresMoa
                      ? "My school requires a MOA with the company."
                      : "My school does not require a MOA with the company."}
                </p>
              </ProfilePanel>
            ) : (
              <ProfilePanel
                icon="briefcase"
                title="Work experience"
              >
                {isBackendApplicant ? (
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#078b8d]" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-[#526365]">
                        {applicantProfile?.experience_level
                          ? `Experience level: ${applicantProfile.experience_level}`
                          : "Work experience not added"}
                      </p>
                      <p className="mt-1 text-[9px] leading-4 text-[#849293]">
                        {applicantProfile?.desired_titles?.length
                          ? `Interested in ${applicantProfile.desired_titles.join(", ")}`
                          : "Use Edit preferences to add your desired roles."}
                      </p>
                    </div>
                  </div>
                ) : useJobSeekerExample ? (
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
                    {isBackendApplicant
                      ? applicantProfile?.ojt_details?.course || "Education details not added"
                      : answers.course ||
                        (isOjtSeeker
                          ? ojtSeekerExample.course
                          : useJobSeekerExample
                            ? jobSeekerExample.education.course
                            : "Education details not added")}
                  </p>
                  <p className="mt-1 text-[9px] text-[#849293]">
                    {isBackendApplicant
                      ? [
                          applicantProfile?.ojt_details?.school,
                          applicantProfile?.ojt_details?.year_level
                            ? `Year ${applicantProfile.ojt_details.year_level}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") ||
                        "Education details not added. Use Edit preferences to add them."
                      : [
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
              percentage={strength}
              description={
                isOjtSeeker
                  ? "Add a letter from your school to strengthen your OJT profile."
                  : useJobSeekerExample
                    ? "Add a portfolio link to help employers see more of your work."
                    : undefined
              }
            />
            <ProfilePanel icon="briefcase" title="Professional links">
              {[
                ["Portfolio", applicantProfile?.profile_links?.portfolio],
                ["GitHub", applicantProfile?.profile_links?.github],
                ["LinkedIn", applicantProfile?.profile_links?.linkedin],
                [otherProfileLink?.label || "Other", otherProfileLink?.url || null],
              ].filter(([, url]) => Boolean(url)).length > 0 ? (
                <div className="space-y-2">
                  {[
                    ["Portfolio", applicantProfile?.profile_links?.portfolio],
                    ["GitHub", applicantProfile?.profile_links?.github],
                    ["LinkedIn", applicantProfile?.profile_links?.linkedin],
                    [otherProfileLink?.label || "Other", otherProfileLink?.url || null],
                  ].map(([label, url]) =>
                    url ? (
                      <a
                        className="block truncate rounded-lg bg-[#eff8f6] px-3 py-2 text-[9px] font-semibold text-[#078b8d] hover:bg-[#e5f4f2] hover:underline"
                        href={url}
                        key={label}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {label}: {url}
                      </a>
                    ) : null,
                  )}
                </div>
              ) : (
                <p className="text-[10px] leading-4 text-[#8a999a]">
                  No professional links added. This is optional; use Edit preferences to add a portfolio, GitHub, LinkedIn, or another link.
                </p>
              )}
            </ProfilePanel>
            <ProfilePanel
              icon="skills"
              title="Skills"
            >
              <ProfileTags tags={skills} />
            </ProfilePanel>
            <ProfilePanel icon="resume" title="Documents">
              {resumeLoading ? (
                <p className="rounded-lg bg-[#f2f8f7] p-3 text-[9px] text-[#526365]" role="status">
                  Loading resume…
                </p>
              ) : serverResume ? (
                <div className="rounded-lg bg-[#f2f8f7] p-2">
                  <div className="flex items-center gap-2">
                    <ProfileIconBadge>
                      <ProfileResumeIcon />
                    </ProfileIconBadge>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[8px] font-semibold text-[#078b8d]">Resume</span>
                      <span className="block truncate text-[9px] font-semibold text-[#526365]">
                        {serverResume.original_filename}
                      </span>
                      <span className="mt-0.5 block text-[8px] text-[#93a0a1]">
                        {formatFileSize(serverResume.file_size)}
                      </span>
                    </div>
                    <button
                      aria-label="Download resume"
                      className="rounded p-1 text-[#078b8d] hover:bg-white"
                      onClick={() => void downloadServerResume()}
                      type="button"
                    >
                      ↓
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <label className="cursor-pointer rounded-md border border-[#e0e9e8] px-2 py-1 text-[8px] font-semibold text-[#526365] hover:bg-white">
                      Replace
                      <input
                        accept=".pdf,.docx"
                        className="sr-only"
                        disabled={resumeUploadProgress !== null}
                        onChange={(event) => void handleDocumentUpload(event, "resume")}
                        type="file"
                      />
                    </label>
                    <button
                      className="rounded px-1 py-1 text-[8px] font-semibold text-[#a2534c] hover:underline"
                      disabled={resumeUploadProgress !== null}
                      onClick={() => void removeResume()}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : resume || showSampleResume ? (
                <>
                  <ProfileDocumentCard
                    details={
                      resume
                        ? formatFileSize(resume.size)
                        : isOjtSeeker
                          ? ojtSeekerExample.resumeDetails
                          : jobSeekerExample.resumeDetails
                    }
                    file={resume}
                    fileName={
                      resume?.name ||
                      (isOjtSeeker
                        ? ojtSeekerExample.resumeName
                        : jobSeekerExample.resumeName)
                    }
                    onDownload={downloadDocument}
                    onPreview={previewDocument}
                    onDownloadSample={downloadSampleDocument}
                    onPreviewSample={previewSampleDocument}
                    sampleContent={resume ? undefined : sampleResumeContent}
                    title="Resume"
                  />
                  <div className="mt-2 flex items-center gap-3">
                    <label className="cursor-pointer rounded-md border border-[#e0e9e8] px-2 py-1 text-[8px] font-semibold text-[#526365] hover:bg-[#f6faf9]">
                      Replace
                      <input
                        accept={isBackendApplicant ? ".pdf,.docx" : ".pdf,.doc,.docx"}
                        className="sr-only"
                        onChange={(event) => void handleDocumentUpload(event, "resume")}
                        type="file"
                      />
                    </label>
                    <button
                      className="rounded px-1 py-1 text-[8px] font-semibold text-[#078b8d] hover:underline"
                      onClick={() => void removeResume()}
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
                    {isBackendApplicant ? "Upload a PDF or DOCX · up to 5 MB" : "Upload a PDF, DOC, or DOCX"}
                  </span>
                  <input
                    accept={isBackendApplicant ? ".pdf,.docx" : ".pdf,.doc,.docx"}
                    className="sr-only"
                    onChange={(event) => void handleDocumentUpload(event, "resume")}
                    type="file"
                  />
                </label>
              )}
              {resumeError && (
                <p className="mt-2 text-[9px] text-[#b34b4b]" role="alert">
                  {resumeError}
                </p>
              )}
              {resumeUploadProgress !== null && (
                <p className="mt-2 text-[9px] text-[#087879]" role="status">
                  Uploading resume… {resumeUploadProgress}%
                </p>
              )}

              {isBackendApplicant ? (
                <p className="mt-4 border-t border-[#edf1f1] pt-3 text-[9px] leading-4 text-[#849394]">
                  Cover-letter uploads are not yet supported by the backend and are not saved.
                </p>
              ) : (
                <div className="mt-4 border-t border-[#edf1f1] pt-3">
                {coverLetter || showSampleCoverLetter ? (
                  <>
                    <ProfileDocumentCard
                      details={
                        coverLetter
                          ? formatFileSize(coverLetter.size)
                          : jobSeekerExample.coverLetterDetails
                      }
                      file={coverLetter}
                      fileName={
                        coverLetter?.name || jobSeekerExample.coverLetterName
                      }
                      onDownload={downloadDocument}
                      onPreview={previewDocument}
                      onDownloadSample={downloadSampleDocument}
                      onPreviewSample={previewSampleDocument}
                      sampleContent={
                        coverLetter ? undefined : sampleCoverLetterContent
                      }
                      title="Cover letter"
                    />
                    <div className="mt-2 flex items-center gap-3">
                      <label className="cursor-pointer rounded-md border border-[#e0e9e8] px-2 py-1 text-[8px] font-semibold text-[#526365] hover:bg-[#f6faf9]">
                        Replace
                        <input
                          accept=".pdf,.doc,.docx"
                          className="sr-only"
                          onChange={(event) =>
                            handleDocumentUpload(event, "cover-letter")
                          }
                          type="file"
                        />
                      </label>
                      <button
                        className="rounded px-1 py-1 text-[8px] font-semibold text-[#078b8d] hover:underline"
                        onClick={() => {
                          onboardingStore.setAnswer("coverLetterFile", null);
                          setCoverLetterError(null);
                          setSampleCoverLetterRemoved(true);
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
                      Upload a cover letter
                    </span>
                    <input
                      accept=".pdf,.doc,.docx"
                      className="sr-only"
                      onChange={(event) =>
                        handleDocumentUpload(event, "cover-letter")
                      }
                      type="file"
                    />
                  </label>
                )}
                {coverLetterError && (
                  <p className="mt-2 text-[9px] text-[#b34b4b]" role="alert">
                    {coverLetterError}
                  </p>
                )}
                </div>
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
                    <span className={`font-bold ${applicantProfile?.ojt_details?.school ? "text-[#46b99e]" : "text-[#9aa6a7]"}`}>
                      {applicantProfile?.ojt_details?.school ? "✓" : "—"}
                    </span>
                    {applicantProfile?.ojt_details?.school ? "School details provided" : "School details not provided"}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`font-bold ${applicantProfile?.ojt_details?.required_hours ? "text-[#46b99e]" : "text-[#9aa6a7]"}`}>
                      {applicantProfile?.ojt_details?.required_hours ? "✓" : "—"}
                    </span>
                    {applicantProfile?.ojt_details?.required_hours ? "Required hours provided" : "Required OJT hours not provided"}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`font-bold ${applicantProfile?.ojt_details?.requires_moa !== null && applicantProfile?.ojt_details?.requires_moa !== undefined ? "text-[#46b99e]" : "text-[#9aa6a7]"}`}>
                      {applicantProfile?.ojt_details?.requires_moa !== null && applicantProfile?.ojt_details?.requires_moa !== undefined ? "✓" : "—"}
                    </span>
                    {applicantProfile?.ojt_details?.requires_moa !== null && applicantProfile?.ojt_details?.requires_moa !== undefined
                      ? "MOA requirement shared"
                      : "MOA requirement not provided"}
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
          onSave={async (preferences) => {
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

            if (isBackendApplicant && token) {
              await applicantFilesApi.updateProfile(token, {
                name: preferences.name,
                phone: preferences.phone || null,
                city: preferences.city || null,
              });

              const workSetupMap: Record<string, string> = {
                Onsite: "onsite",
                "On-site": "onsite",
                Hybrid: "hybrid",
                Remote: "remote",
              };
              const employmentTypeMap: Record<string, string> = {
                "Full-time": "full_time",
                "Part-time": "part_time",
                Contract: "contract",
              };
              const experienceLevelMap: Record<string, string> = {
                "Fresh graduate": "fresh_graduate",
                "1–3 years": "1_3_years",
                "1-3 years": "1_3_years",
                "3–5 years": "3_5_years",
                "3-5 years": "3_5_years",
                "5+ years": "5_plus_years",
              };

              const ojtDetails = isOjtSeeker
                ? {
                    school: preferences.school || null,
                    course: preferences.course || null,
                    year_level: preferences.yearLevel ? Number(preferences.yearLevel.replace(/\D/g, "")) || null : null,
                    required_hours: preferences.requiredOjtHours ? Number(preferences.requiredOjtHours) : null,
                    preferred_start_date: preferences.preferredStartDate || null,
                    allowance_preference: preferences.allowancePreference === "Paid only"
                      ? "paid_only"
                      : preferences.allowancePreference === "Unpaid OK"
                        ? "unpaid_ok"
                        : "no_preference",
                    requires_moa: preferences.requiresMoa,
                  }
                : preferences.school || preferences.course || preferences.yearLevel
                  ? {
                      school: preferences.school || null,
                      course: preferences.course || null,
                      year_level: preferences.yearLevel ? Number(preferences.yearLevel.replace(/\D/g, "")) || null : null,
                    }
                  : undefined;

              const updated = await applicantFilesApi.updatePreferences(token, {
                skills: preferences.skills,
                work_setups: preferences.workSetup
                  ? [workSetupMap[preferences.workSetup] || preferences.workSetup.toLowerCase()]
                  : [],
                preferred_locations: preferences.preferredLocations,
                desired_titles: preferences.desiredJobTitles,
                employment_types: preferences.employmentTypes
                  .map((type) => employmentTypeMap[type] || type.toLowerCase())
                  .filter(Boolean),
                salary_min: preferences.minimumSalary ? Number(preferences.minimumSalary) : null,
                salary_max: preferences.maximumSalary ? Number(preferences.maximumSalary) : null,
                experience_level: preferences.experienceLevel
                  ? experienceLevelMap[preferences.experienceLevel] || null
                  : null,
                profile_links: {
                  portfolio: preferences.portfolioLink.trim() || null,
                  github: preferences.githubLink.trim() || null,
                  linkedin: preferences.linkedinLink.trim() || null,
                  other: preferences.otherLink.trim()
                    ? {
                        label: preferences.otherLinkLabel.trim() || "Other",
                        url: preferences.otherLink.trim(),
                      }
                    : null,
                },
                ...(ojtDetails ? { ojt_details: ojtDetails } : {}),
              });
              setApplicantProfile(updated.data);
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
      {documentPreview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            aria-label="Close document preview"
            className="absolute inset-0 size-full cursor-default bg-[#1f3333]/70"
            onClick={closeDocumentPreview}
            type="button"
          />
          <section
            aria-labelledby="document-preview-title"
            aria-modal="true"
            className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-[900px] flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.3)]"
            role="dialog"
          >
            <header className="flex items-center justify-between gap-3 border-b border-[#edf1f1] px-4 py-3">
              <div className="min-w-0">
                <h2
                  className="text-[14px] font-bold text-[#2c3e40]"
                  id="document-preview-title"
                >
                  {documentPreview.title}
                </h2>
                <p className="truncate text-[10px] text-[#829091]">
                  {documentPreview.fileName}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  className="rounded-lg bg-[#078b98] px-3 py-2 text-[10px] font-semibold text-white hover:bg-[#06767f] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
                  onClick={() => {
                    if (documentPreview.file) {
                      downloadDocument(documentPreview.file);
                    } else if (documentPreview.content) {
                      downloadSampleDocument(
                        documentPreview.fileName,
                        documentPreview.content,
                      );
                    }
                  }}
                  type="button"
                >
                  Download
                </button>
                <button
                  aria-label="Close document preview"
                  className="grid size-8 place-items-center rounded-full text-[20px] text-[#526365] hover:bg-[#f1f6f5] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
                  onClick={closeDocumentPreview}
                  type="button"
                >
                  ×
                </button>
              </div>
            </header>
            {documentPreview.content ? (
              <div className="min-h-0 flex-1 overflow-y-auto bg-[#f3f6f6] p-5 max-[600px]:p-3">
                <article className="mx-auto min-h-full max-w-[700px] bg-white px-10 py-12 shadow-sm max-[600px]:px-5 max-[600px]:py-7">
                  <p className="mb-6 text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8b999a]">
                    Sample profile document
                  </p>
                  <pre className="whitespace-pre-wrap break-words font-sans text-[12px] leading-7 text-[#344648] max-[600px]:text-[11px] max-[600px]:leading-6">
                    {documentPreview.content}
                  </pre>
                </article>
              </div>
            ) : documentPreviewIsPdf && documentPreview.url ? (
              <iframe
                className="min-h-0 flex-1 bg-[#f3f6f6]"
                src={documentPreview.url}
                title={`${documentPreview.title} PDF preview`}
              />
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-10 text-center">
                <ProfileIconBadge>
                  <ProfileResumeIcon />
                </ProfileIconBadge>
                <p className="mt-4 text-[13px] font-semibold text-[#2c3e40]">
                  Preview is not available for this file type
                </p>
                <p className="mt-1 max-w-[420px] text-[11px] leading-5 text-[#829091]">
                  Word documents can’t be displayed in the browser. Download
                  the file to view it.
                </p>
                <button
                  className="mt-4 rounded-lg bg-[#078b98] px-4 py-2.5 text-[10px] font-semibold text-white hover:bg-[#06767f] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
                  onClick={() => {
                    if (documentPreview.file) {
                      downloadDocument(documentPreview.file);
                    }
                  }}
                  type="button"
                >
                  Download document
                </button>
              </div>
            )}
          </section>
        </div>
      )}
      <Footer />
    </div>
  );
}