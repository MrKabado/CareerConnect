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
import {
  applicantFilesApi,
  downloadApplicantFile,
  type ApplicantProfileData,
  type ApplicantCategory,
  type ApplicantDocumentType,
  type ApplicantIdentityVerification,
  type ApplicantResumeFile,
  type ApplicantStoredDocument,
} from "@/features/user-profile/backendApi";
import { emptyPhilippineAddress } from "@/features/locations/types";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";

const maxResumeSize = 10 * 1024 * 1024;
const allowedResumeName = /\.(pdf|doc|docx)$/i;
const profilePictureStorageKey = "careerconnect.profile-picture";
const maxProfilePictureSize = 2 * 1024 * 1024;

type ProfileDocument = {
  title: string;
  fileName: string;
  file?: File;
  blob?: Blob;
  mimeType?: string;
  url?: string;
};

type IdentitySelfieSelection = {
  file: File;
  previewUrl: string;
};

function ProfileDocumentCard({
  title,
  file,
  fileName,
  details,
  onPreview,
  onDownload,
}: {
  title: string;
  file: File;
  fileName: string;
  details: string;
  onPreview: (file: File, title: string) => void;
  onDownload: (file: File) => void;
}) {
  return (
    <div className="rounded-lg bg-[#f2f8f7] p-2">
      <div className="flex items-center gap-2">
        <ProfileIconBadge>
          <ProfileResumeIcon />
        </ProfileIconBadge>
        <button
          aria-label={`Preview ${title}: ${fileName}`}
          className="min-w-0 flex-1 text-left focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 disabled:cursor-default"
          onClick={() => onPreview(file, title)}
          type="button"
        >
          <span className="block text-[8px] font-semibold text-[#078b8d]">
            {title}
          </span>
          <span className="block truncate text-[9px] font-semibold text-[#526365]">
            {fileName}
          </span>
          <span className="mt-0.5 block text-[8px] text-[#667779]">
            {details}
          </span>
        </button>
        <button
          aria-label={`Download ${title}`}
          className="rounded p-1 text-[#728385] hover:bg-white hover:text-[#078b8d] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onDownload(file)}
          type="button"
        >
          ↓
        </button>
      </div>
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

function normalizeProfileLink(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const workSetupLabels: Record<string, string> = {
  onsite: "Onsite",
  hybrid: "Hybrid",
  remote: "Remote",
};

const employmentTypeLabels: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
};

const experienceLevelLabels: Record<string, string> = {
  fresh_graduate: "Fresh graduate",
  "1_3_years": "1–3 years",
  "3_5_years": "3–5 years",
  "5_plus_years": "5+ years",
};

const allowancePreferenceLabels: Record<string, string> = {
  paid_only: "Paid only",
  no_preference: "No preference",
  unpaid_ok: "Unpaid OK",
};

export default function ProfilePage() {
  const { user, token, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumePreviewLoading, setResumePreviewLoading] = useState(false);
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null);
  const [profilePictureError, setProfilePictureError] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(
    user?.role === "applicant" ? null : getStoredProfilePicture(),
  );
  const [applicantProfile, setApplicantProfile] =
    useState<ApplicantProfileData | null>(null);
  const [serverResume, setServerResume] = useState<ApplicantResumeFile | null>(null);
  const [applicantDocuments, setApplicantDocuments] = useState<ApplicantStoredDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(user?.role === "applicant" && Boolean(token));
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [identityVerification, setIdentityVerification] =
    useState<ApplicantIdentityVerification | null>(null);
  const [identityVerificationLoading, setIdentityVerificationLoading] =
    useState(user?.role === "applicant" && Boolean(token));
  const [identityVerificationError, setIdentityVerificationError] = useState<string | null>(null);
  const [identityUploadProgress, setIdentityUploadProgress] = useState<number | null>(null);
  const [identitySelfie, setIdentitySelfie] = useState<IdentitySelfieSelection | null>(null);
  const [resumeLoading, setResumeLoading] = useState(user?.role === "applicant" && Boolean(token));
  const [profileLoading, setProfileLoading] = useState(user?.role === "applicant" && Boolean(token));
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [preferencesSaveError, setPreferencesSaveError] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<ApplicantCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [resumeUploadProgress, setResumeUploadProgress] = useState<number | null>(null);
  const [documentUploadProgress, setDocumentUploadProgress] = useState<number | null>(null);
  const [supportingDocumentType, setSupportingDocumentType] =
    useState<Exclude<ApplicantDocumentType, "cover_letter">>("certificate");
  const [photoUploadProgress, setPhotoUploadProgress] = useState<number | null>(null);
  const [isPreferencesEditorOpen, setIsPreferencesEditorOpen] = useState(false);
  const [isBookmarksModalOpen, setIsBookmarksModalOpen] = useState(false);
  const [profileMode, setProfileMode] = useState<"job-seeker" | "ojt-seeker" | null>(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isProfilePictureMenuOpen, setIsProfilePictureMenuOpen] = useState(false);
  const [isProfilePicturePreviewOpen, setIsProfilePicturePreviewOpen] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<ProfileDocument | null>(null);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const profilePictureMenuRef = useRef<HTMLDivElement>(null);
  const profilePictureInputRef = useRef<HTMLInputElement>(null);
  const profilePictureDialogRef = useRef<HTMLElement>(null);
  const documentPreviewDialogRef = useRef<HTMLElement>(null);
  useDialogBehavior(
    profilePictureDialogRef,
    isProfilePicturePreviewOpen && Boolean(profilePicture),
    () => setIsProfilePicturePreviewOpen(false),
  );
  useDialogBehavior(documentPreviewDialogRef, documentPreview !== null, closeDocumentPreview);
  useEffect(() => {
    return () => {
      if (identitySelfie) URL.revokeObjectURL(identitySelfie.previewUrl);
    };
  }, [identitySelfie]);
  const onboarding = useSyncExternalStore(
    onboardingStore.subscribe,
    onboardingStore.getSnapshot,
    onboardingStore.getSnapshot,
  );
  const answers = onboarding.answers;
  const isBackendApplicant = user?.role === "applicant" && Boolean(token);
  const isOjtSeeker =
    profileMode === "ojt-seeker" ||
    (profileMode === null &&
      (isBackendApplicant
        ? Boolean(
            applicantProfile?.looking_for_ojt &&
              !applicantProfile.looking_for_jobs,
          )
        : answers.goal === "ojt-seeker"));
  const providedName = (user?.name || answers.name).trim();
  const name = applicantProfile?.name || providedName || "Name not provided";
  const email = user?.email || answers.email || "Not provided";
  const location = isBackendApplicant
    ? applicantProfile?.city ||
      applicantProfile?.preferred_locations?.join(", ") ||
      "Not provided"
    : answers.preferredLocations.join(", ") || "Not provided";
  const resume = isBackendApplicant ? null : answers.resumeFile;
  const coverLetter = isBackendApplicant ? null : answers.coverLetterFile;
  const savedCoverLetter = applicantDocuments.find(
    (document) => document.document_type === "cover_letter",
  ) ?? null;
  const supportingDocuments = applicantDocuments.filter(
    (document) => document.document_type !== "cover_letter",
  );
  const skills = isBackendApplicant
    ? applicantProfile?.skills ?? []
    : answers.skills;
  const otherProfileLink =
    typeof applicantProfile?.profile_links?.other === "object"
      ? applicantProfile.profile_links.other
      : null;
  const sharedProfileChecks = [
    { label: "Add your name", complete: Boolean(providedName) },
    { label: "Add your email", complete: Boolean(user?.email || answers.email) },
    {
      label: "Add a phone number",
      complete: Boolean(isBackendApplicant && applicantProfile?.phone),
    },
    {
      label: "Add your location",
      complete: Boolean(
        isBackendApplicant
          ? applicantProfile?.city || applicantProfile?.preferred_locations?.length
          : answers.preferredLocations.length,
      ),
    },
    { label: "Add a profile photo", complete: Boolean(profilePicture) },
    { label: "Upload your resume", complete: Boolean(serverResume || resume) },
  ];
  const seekerProfileChecks = isOjtSeeker
    ? [
        {
          label: "Add OJT training fields",
          complete: Boolean(
            isBackendApplicant
              ? applicantProfile?.interests.length ||
                  applicantProfile?.other_categories?.length
              : answers.trainingFields.length,
          ),
        },
        {
          label: "Add OJT skills",
          complete: Boolean(
            isBackendApplicant
              ? applicantProfile?.skills.length
              : answers.skills.length,
          ),
        },
        {
          label: "Add your school and course",
          complete: Boolean(
            isBackendApplicant
              ? applicantProfile?.ojt_details?.school &&
                  applicantProfile.ojt_details.course
              : answers.school && answers.course,
          ),
        },
        {
          label: "Choose undergraduate or graduated status",
          complete: Boolean(
            isBackendApplicant
              ? applicantProfile?.ojt_details?.education_status
              : answers.yearLevel,
          ),
        },
        {
          label: "Add your year level or graduation year",
          complete: Boolean(
            isBackendApplicant
              ? applicantProfile?.ojt_details?.education_status === "undergraduate"
                ? applicantProfile.ojt_details.year_level != null
                : applicantProfile?.ojt_details?.education_status === "graduated" &&
                  applicantProfile.ojt_details.graduation_year != null
              : Boolean(answers.yearLevel),
          ),
        },
        {
          label: "Add required OJT hours",
          complete: Boolean(
            isBackendApplicant
              ? applicantProfile?.ojt_details?.required_hours
              : answers.requiredOjtHours,
          ),
        },
        {
          label: "Choose a preferred OJT start date",
          complete: Boolean(
            isBackendApplicant
              ? applicantProfile?.ojt_details?.preferred_start_date
              : answers.preferredStartDate,
          ),
        },
        {
          label: "Choose an allowance preference",
          complete: Boolean(
            isBackendApplicant
              ? applicantProfile?.ojt_details?.allowance_preference
              : answers.allowancePreference,
          ),
        },
        {
          label: "Specify whether an MOA is required",
          complete: isBackendApplicant
            ? applicantProfile?.ojt_details?.requires_moa != null
            : answers.requiresMoa != null,
        },
        {
          label: "Add a preferred work setup",
          complete: Boolean(
            isBackendApplicant
              ? applicantProfile?.work_setups?.length
              : answers.workSetup,
          ),
        },
      ]
    : [
        {
          label: "Add job categories or skills",
          complete: Boolean(
            isBackendApplicant
              ? applicantProfile?.interests.length ||
                  applicantProfile?.other_categories?.length ||
                  applicantProfile?.skills.length
              : answers.jobCategories.length || answers.skills.length,
          ),
        },
        {
          label: "Add target job titles",
          complete: Boolean(
            isBackendApplicant
              ? applicantProfile?.desired_titles?.length
              : answers.desiredJobTitles.length,
          ),
        },
        {
          label: "Add work preferences",
          complete: Boolean(
            isBackendApplicant
              ? applicantProfile?.work_setups?.length ||
                  applicantProfile?.employment_types?.length
              : answers.workSetup || answers.employmentTypes.length,
          ),
        },
        {
          label: "Add your experience level",
          complete: Boolean(
            isBackendApplicant
              ? applicantProfile?.experience_level
              : answers.experienceLevel,
          ),
        },
      ];
  const profileChecks = [...sharedProfileChecks, ...seekerProfileChecks];
  const missingProfileItems = profileChecks
    .filter((check) => !check.complete)
    .map((check) => check.label);
  const strength = Math.round(
    ((profileChecks.length - missingProfileItems.length) / profileChecks.length) * 100,
  );

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
        .documents(token)
        .then((documents) => {
          if (active) {
            setApplicantDocuments(documents);
            setDocumentsError(null);
          }
        })
        .catch((requestError: unknown) => {
          if (active) {
            setDocumentsError(
              requestError instanceof Error
                ? requestError.message
                : "Unable to load your documents.",
            );
          }
        })
        .finally(() => {
          if (active) setDocumentsLoading(false);
        });

    applicantFilesApi
        .identityVerification(token)
        .then((verification) => {
          if (active) {
            setIdentityVerification(verification);
            setIdentityVerificationError(null);
          }
        })
        .catch((requestError: unknown) => {
          if (active) {
            setIdentityVerificationError(
              requestError instanceof Error
                ? requestError.message
                : "Unable to load identity-verification status.",
            );
          }
        })
        .finally(() => {
          if (active) setIdentityVerificationLoading(false);
        });

    applicantFilesApi
        .profile(token)
        .then((response) => {
          if (active) {
            setApplicantProfile(response.data);
            setProfilePicture(response.data.profile_photo_url);
            setProfileMode(
              response.data.looking_for_ojt && !response.data.looking_for_jobs
                ? "ojt-seeker"
                : "job-seeker",
            );
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
            setProfileError(
              requestError instanceof Error
                ? requestError.message
                : "Unable to load your profile.",
            );
          }
        })
        .finally(() => {
          if (active) setProfileLoading(false);
        });

    return () => {
      active = false;
    };
  }, [isBackendApplicant, token]);

  async function openPreferencesEditor() {
    if (isBackendApplicant && (profileLoading || profileError)) return;
    setIsActionMenuOpen(false);
    setPreferencesSaveError(null);
    setCategoriesError(null);
    setIsPreferencesEditorOpen(true);
    if (availableCategories.length === 0) {
      setCategoriesLoading(true);
      try {
        const response = await applicantFilesApi.categories();
        setAvailableCategories(response.data);
      } catch (requestError) {
        setCategoriesError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load categories. Please close and try again.",
        );
      } finally {
        setCategoriesLoading(false);
      }
    }
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
    setProfileMode(goal);
    if (!isBackendApplicant) onboardingStore.setAnswer("goal", goal);
  }

  async function savePreferences(preferences: ProfilePreferencesDraft) {
    setIsSavingPreferences(true);
    setPreferencesSaveError(null);

    try {
      if (isBackendApplicant && token) {
        const categoryNames = isOjtSeeker
          ? preferences.trainingFields
          : preferences.jobCategories;
        const categories = availableCategories.length > 0
          ? { data: availableCategories }
          : await applicantFilesApi.categories();
        const categoryIdsByName = new Map(
          categories.data.map((category) => [
            category.name.trim().toLocaleLowerCase(),
            category.id,
          ]),
        );
        const unknownCategories = categoryNames.filter(
          (category) =>
            !categoryIdsByName.has(category.trim().toLocaleLowerCase()),
        );
        if (unknownCategories.length > 0) {
          throw new Error(
            `These categories are unavailable: ${unknownCategories.join(", ")}. Choose an active category and try again.`,
          );
        }
        const categoryIds = categoryNames.flatMap((category) => {
          const categoryId = categoryIdsByName.get(
            category.trim().toLocaleLowerCase(),
          );
          return categoryId === undefined ? [] : [categoryId];
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
        const allowancePreferenceMap: Record<string, string> = {
          "Paid only": "paid_only",
          "Unpaid OK": "unpaid_ok",
          "No preference": "no_preference",
        };
        const ojtDetails = isOjtSeeker
          ? {
              school: preferences.school.trim() || null,
              course: preferences.course.trim() || null,
              education_status: preferences.educationStatus || null,
              year_level: preferences.educationStatus === "undergraduate" && preferences.yearLevel
                ? Number(preferences.yearLevel)
                : null,
              graduation_year: preferences.educationStatus === "graduated" && preferences.graduationYear
                ? Number(preferences.graduationYear)
                : null,
              required_hours: preferences.requiredOjtHours
                ? Number(preferences.requiredOjtHours)
                : null,
              preferred_start_date: preferences.preferredStartDate || null,
              allowance_preference:
                allowancePreferenceMap[preferences.allowancePreference] ?? null,
              requires_moa: preferences.requiresMoa,
            }
          : {
              school: preferences.school.trim() || null,
              course: preferences.course.trim() || null,
              education_status: preferences.educationStatus || null,
              year_level: preferences.educationStatus === "undergraduate" && preferences.yearLevel
                ? Number(preferences.yearLevel)
                : null,
              graduation_year: preferences.educationStatus === "graduated" && preferences.graduationYear
                ? Number(preferences.graduationYear)
                : null,
            };

        const updated = await applicantFilesApi.updatePreferences(token, {
          name: preferences.name.trim(),
          phone: preferences.phone.trim() || null,
          city: preferences.city.trim() || null,
          ...preferences.locationAddress,
          looking_for_jobs: !isOjtSeeker,
          looking_for_ojt: isOjtSeeker,
          category_ids: categoryIds,
          other_categories: preferences.otherCategories,
          skills: preferences.skills,
          work_setups: preferences.workSetup
            ? [
                workSetupMap[preferences.workSetup] ??
                  preferences.workSetup.toLowerCase(),
              ]
            : [],
          preferred_locations: preferences.preferredLocations,
          desired_titles: preferences.desiredJobTitles,
          employment_types: preferences.employmentTypes
            .map(
              (type) =>
                employmentTypeMap[type] ?? type.toLocaleLowerCase(),
            )
            .filter(Boolean),
          salary_min: preferences.minimumSalary
            ? Number(preferences.minimumSalary)
            : null,
          salary_max: preferences.maximumSalary
            ? Number(preferences.maximumSalary)
            : null,
          experience_level: preferences.experienceLevel
            ? experienceLevelMap[preferences.experienceLevel] ?? null
            : null,
          profile_links: {
            portfolio: normalizeProfileLink(preferences.portfolioLink),
            github: normalizeProfileLink(preferences.githubLink),
            linkedin: normalizeProfileLink(preferences.linkedinLink),
            other: preferences.otherLink.trim()
              ? {
                  label: preferences.otherLinkLabel.trim() || "Other",
                  url: normalizeProfileLink(preferences.otherLink) ?? "",
                }
              : null,
          },
          ojt_details: ojtDetails,
        });
        setApplicantProfile(updated.data);
        setProfilePicture(updated.data.profile_photo_url);
      }

      onboardingStore.setAnswer("name", preferences.name);
      onboardingStore.setAnswer("skills", preferences.skills);
      onboardingStore.setAnswer("school", preferences.school);
      onboardingStore.setAnswer("course", preferences.course);
      onboardingStore.setAnswer("yearLevel", preferences.yearLevel);
      onboardingStore.setAnswer("requiredOjtHours", preferences.requiredOjtHours);
      onboardingStore.setAnswer("requiresMoa", preferences.requiresMoa);
      onboardingStore.setAnswer("trainingFields", preferences.trainingFields);
      onboardingStore.setAnswer("jobCategories", preferences.jobCategories);
      onboardingStore.setAnswer("desiredJobTitles", preferences.desiredJobTitles);
      onboardingStore.setAnswer("employmentTypes", preferences.employmentTypes);
      onboardingStore.setAnswer("experienceLevel", preferences.experienceLevel);
      onboardingStore.setAnswer("minimumSalary", preferences.minimumSalary);
      onboardingStore.setAnswer("maximumSalary", preferences.maximumSalary);
      onboardingStore.setAnswer(
        "preferredStartDate",
        preferences.preferredStartDate,
      );
      onboardingStore.setAnswer(
        "allowancePreference",
        preferences.allowancePreference,
      );
      onboardingStore.setAnswer("workSetup", preferences.workSetup);
      onboardingStore.setAnswer(
        "preferredLocations",
        preferences.preferredLocations,
      );

      if (!isBackendApplicant && !onboardingStore.saveDraft()) {
        throw new Error(
          onboardingStore.getSnapshot().submitError ??
            "Your profile could not be saved in this browser.",
        );
      }

      setIsPreferencesEditorOpen(false);
    } catch (requestError) {
      setPreferencesSaveError(
        requestError instanceof Error
          ? requestError.message
          : "Your profile preferences could not be saved. Please try again.",
      );
    } finally {
      setIsSavingPreferences(false);
    }
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
      (!isBackendApplicant &&
        documentType === "cover-letter" &&
        file.type === "application/msword") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const allowedName =
      isBackendApplicant
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
        setCoverLetterError(
          isBackendApplicant
            ? "Choose a PDF or DOCX cover letter."
            : "Choose a PDF, DOC, or DOCX file.",
        );
        if (!isBackendApplicant) onboardingStore.setAnswer("coverLetterFile", null);
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
        setCoverLetterError(
          isBackendApplicant
            ? "Your cover letter must be 5 MB or smaller."
            : "Your cover letter must be 10 MB or smaller.",
        );
        if (!isBackendApplicant) onboardingStore.setAnswer("coverLetterFile", null);
      }
      return;
    }

    if (documentType === "resume") {
      setResumeError(null);
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
      if (isBackendApplicant && token) {
        setDocumentUploadProgress(0);
        try {
          const uploaded = await applicantFilesApi.uploadDocument(
            token,
            "cover_letter",
            file,
            setDocumentUploadProgress,
          );
          setApplicantDocuments((documents) => [
            ...documents.filter((document) => document.document_type !== "cover_letter"),
            uploaded,
          ]);
        } catch (requestError) {
          setCoverLetterError(
            requestError instanceof Error
              ? requestError.message
              : "The cover letter could not be uploaded.",
          );
        } finally {
          setDocumentUploadProgress(null);
        }
      } else {
        onboardingStore.setAnswer("coverLetterFile", file);
      }
    }
  }

  async function handleSupportingDocumentUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !token) return;
    if (!/\.pdf$|\.docx$/i.test(file.name)) {
      setDocumentsError("Choose a PDF or DOCX supporting document.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setDocumentsError("Supporting documents must be 5 MB or smaller.");
      return;
    }

    setDocumentsError(null);
    setDocumentUploadProgress(0);
    try {
      const uploaded = await applicantFilesApi.uploadDocument(
        token,
        supportingDocumentType,
        file,
        setDocumentUploadProgress,
      );
      setApplicantDocuments((documents) => [
        ...documents.filter((document) => document.id !== uploaded.id),
        uploaded,
      ]);
    } catch (requestError) {
      setDocumentsError(
        requestError instanceof Error
          ? requestError.message
          : "The supporting document could not be uploaded.",
      );
    } finally {
      setDocumentUploadProgress(null);
    }
  }

  async function previewApplicantDocument(document: ApplicantStoredDocument) {
    if (!token) return;
    setDocumentsError(null);
    try {
      const blob = await applicantFilesApi.downloadDocument(token, document.id);
      setDocumentPreview({
        title: document.document_type === "cover_letter"
          ? "Cover letter"
          : document.document_type === "education"
            ? "Education document"
            : document.document_type === "certificate"
              ? "Certificate"
              : "Supporting document",
        fileName: document.original_filename,
        blob,
        mimeType: document.mime_type || blob.type,
        url: URL.createObjectURL(blob),
      });
    } catch (requestError) {
      setDocumentsError(
        requestError instanceof Error
          ? requestError.message
          : "The document preview could not be loaded.",
      );
    }
  }

  async function downloadApplicantDocument(document: ApplicantStoredDocument) {
    if (!token) return;
    setDocumentsError(null);
    try {
      downloadApplicantFile(
        await applicantFilesApi.downloadDocument(token, document.id),
        document.original_filename,
      );
    } catch (requestError) {
      setDocumentsError(
        requestError instanceof Error
          ? requestError.message
          : "The document could not be downloaded.",
      );
    }
  }

  async function removeApplicantDocument(document: ApplicantStoredDocument) {
    if (!token) return;
    setDocumentsError(null);
    try {
      await applicantFilesApi.deleteDocument(token, document.id);
      setApplicantDocuments((documents) =>
        documents.filter((savedDocument) => savedDocument.id !== document.id),
      );
    } catch (requestError) {
      setDocumentsError(
        requestError instanceof Error
          ? requestError.message
          : "The document could not be removed.",
      );
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
  }

  async function handleIdentityVerificationUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !token) return;

    const allowedExtension = /\.(jpe?g|png|webp)$/i.test(file.name);
    const allowedMimeType = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    if (!allowedExtension || !allowedMimeType) {
      setIdentityVerificationError("Choose a valid JPG, PNG, or WebP selfie photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setIdentityVerificationError("Your selfie photo must be 5 MB or smaller.");
      return;
    }

    setIdentityVerificationError(null);
    try {
      const image = await createImageBitmap(file);
      image.close();
    } catch {
      setIdentityVerificationError("The selected file is not a readable image. Choose a valid photo.");
      return;
    }

    setIdentitySelfie({
      file,
      previewUrl: URL.createObjectURL(file),
    });
  }

  async function submitIdentityVerification() {
    if (!identitySelfie || !token || identityUploadProgress !== null) return;

    setIdentityVerificationError(null);
    setIdentityUploadProgress(0);
    try {
      const response = await applicantFilesApi.submitIdentityVerification(
        token,
        identitySelfie.file,
        setIdentityUploadProgress,
      );
      setIdentityVerification({
        status: response.status,
        rejection_reason: null,
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
      });
      setIdentitySelfie(null);
      await refresh();
    } catch (requestError) {
      setIdentityVerificationError(
        requestError instanceof Error
          ? requestError.message
          : "The identity document could not be submitted.",
      );
    } finally {
      setIdentityUploadProgress(null);
    }
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

  async function previewServerResume() {
    if (!token || !serverResume || resumePreviewLoading) return;
    setResumeError(null);
    setResumePreviewLoading(true);
    try {
      const blob = await applicantFilesApi.downloadResume(token);
      setDocumentPreview({
        title: "Resume",
        fileName: serverResume.original_filename,
        blob,
        mimeType: serverResume.mime_type || blob.type,
        url: URL.createObjectURL(blob),
      });
    } catch (requestError) {
      setResumeError(
        requestError instanceof Error
          ? requestError.message
          : "The resume preview could not be loaded.",
      );
    } finally {
      setResumePreviewLoading(false);
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

  function downloadPreviewDocument() {
    if (documentPreview?.file) {
      downloadDocument(documentPreview.file);
    } else if (documentPreview?.blob) {
      downloadApplicantFile(documentPreview.blob, documentPreview.fileName);
    }
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
      (documentPreview.mimeType === "application/pdf" ||
        documentPreview.file?.type === "application/pdf" ||
        /\.pdf$/i.test(documentPreview.fileName)),
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
    locationAddress: {
      ...emptyPhilippineAddress(),
      region_code: applicantProfile?.region_code ?? null,
      region_name: applicantProfile?.region_name ?? null,
      province_code: applicantProfile?.province_code ?? null,
      province_name: applicantProfile?.province_name ?? null,
      city_municipality_code: applicantProfile?.city_municipality_code ?? null,
      city_municipality_name: applicantProfile?.city_municipality_name ?? applicantProfile?.city ?? null,
      barangay_code: applicantProfile?.barangay_code ?? null,
      barangay_name: applicantProfile?.barangay_name ?? null,
      street_address: applicantProfile?.street_address ?? null,
      zip_code: applicantProfile?.zip_code ?? null,
    },
    portfolioLink: applicantProfile?.profile_links?.portfolio || "",
    githubLink: applicantProfile?.profile_links?.github || "",
    linkedinLink: applicantProfile?.profile_links?.linkedin || "",
    otherLinkLabel: otherProfileLink?.label || "",
    otherLink: otherProfileLink?.url || "",
    school: isBackendApplicant
      ? applicantProfile?.ojt_details?.school || ""
      : answers.school,
    course: isBackendApplicant
      ? applicantProfile?.ojt_details?.course || ""
      : answers.course,
    educationStatus: isBackendApplicant
      ? applicantProfile?.ojt_details?.education_status ?? ""
      : "",
    yearLevel: isBackendApplicant
      ? applicantProfile?.ojt_details?.education_status === "undergraduate" && applicantProfile.ojt_details.year_level
        ? String(applicantProfile.ojt_details.year_level)
        : ""
      : answers.yearLevel,
    graduationYear: isBackendApplicant
      ? applicantProfile?.ojt_details?.graduation_year
        ? String(applicantProfile.ojt_details.graduation_year)
        : ""
      : "",
    requiredOjtHours: isBackendApplicant
      ? applicantProfile?.ojt_details?.required_hours
        ? String(applicantProfile.ojt_details.required_hours)
        : ""
      : answers.requiredOjtHours,
    requiresMoa: isBackendApplicant
      ? applicantProfile?.ojt_details?.requires_moa ?? null
      : answers.requiresMoa,
    trainingFields: isBackendApplicant
      ? applicantProfile?.interests.map((interest) => interest.name) ?? []
      : answers.trainingFields,
    jobCategories: isBackendApplicant
      ? applicantProfile?.interests.map((interest) => interest.name) ?? []
      : answers.jobCategories,
    otherCategories: isBackendApplicant
      ? applicantProfile?.other_categories ?? []
      : [],
    desiredJobTitles: isBackendApplicant
      ? applicantProfile?.desired_titles ?? []
      : answers.desiredJobTitles,
    employmentTypes: isBackendApplicant
      ? (applicantProfile?.employment_types ?? []).map(
          (type) => employmentTypeLabels[type] ?? type,
        )
      : answers.employmentTypes,
    experienceLevel: isBackendApplicant
      ? experienceLevelLabels[applicantProfile?.experience_level ?? ""] ?? ""
      : answers.experienceLevel,
    minimumSalary: isBackendApplicant
      ? applicantProfile?.salary_min != null
        ? String(applicantProfile.salary_min)
        : ""
      : answers.minimumSalary,
    maximumSalary: isBackendApplicant
      ? applicantProfile?.salary_max != null
        ? String(applicantProfile.salary_max)
        : ""
      : answers.maximumSalary,
    skills: isBackendApplicant ? applicantProfile?.skills ?? [] : answers.skills,
    preferredStartDate: isBackendApplicant
      ? applicantProfile?.ojt_details?.preferred_start_date ?? ""
      : answers.preferredStartDate,
    allowancePreference: isBackendApplicant
      ? allowancePreferenceLabels[
          applicantProfile?.ojt_details?.allowance_preference ?? ""
        ] ?? ""
      : answers.allowancePreference,
    workSetup: isBackendApplicant
      ? workSetupLabels[applicantProfile?.work_setups?.[0] ?? ""] ?? ""
      : answers.workSetup,
    preferredLocations: isBackendApplicant
      ? applicantProfile?.preferred_locations ?? []
      : answers.preferredLocations,
  };
  const educationCourse = isBackendApplicant
    ? applicantProfile?.ojt_details?.course || ""
    : answers.course;
  const educationDetails = [
    isBackendApplicant
      ? applicantProfile?.ojt_details?.school
      : answers.school,
    isBackendApplicant
      ? applicantProfile?.ojt_details?.education_status === "graduated"
        ? applicantProfile.ojt_details.graduation_year
          ? `Graduated ${applicantProfile.ojt_details.graduation_year}`
          : "Graduated"
        : applicantProfile?.ojt_details?.education_status === "undergraduate"
          ? applicantProfile.ojt_details.year_level
            ? `Year ${applicantProfile.ojt_details.year_level}`
            : "Undergraduate"
          : null
      : answers.yearLevel,
  ]
    .filter(Boolean)
    .join(" · ");
  const preferenceTags = isBackendApplicant
    ? [
        ...(applicantProfile?.interests.map((interest) => interest.name) ?? []),
        ...(applicantProfile?.other_categories ?? []),
        ...(!isOjtSeeker ? applicantProfile?.desired_titles ?? [] : []),
        ...(applicantProfile?.employment_types?.map(
          (type) => employmentTypeLabels[type] ?? type,
        ) ?? []),
        ...(applicantProfile?.work_setups?.map(
          (setup) => workSetupLabels[setup] ?? setup,
        ) ?? []),
        ...(applicantProfile?.preferred_locations ?? []),
        ...(isOjtSeeker &&
        applicantProfile?.ojt_details?.allowance_preference
          ? [
              allowancePreferenceLabels[
                applicantProfile.ojt_details.allowance_preference
              ] ?? applicantProfile.ojt_details.allowance_preference,
            ]
          : []),
        ...(isOjtSeeker &&
        applicantProfile?.ojt_details?.requires_moa === true
          ? ["MOA required"]
          : []),
      ]
    : [
        ...(isOjtSeeker ? answers.trainingFields : answers.jobCategories),
        ...(!isOjtSeeker ? answers.desiredJobTitles : []),
        ...answers.employmentTypes,
        ...(answers.workSetup ? [answers.workSetup] : []),
        ...answers.preferredLocations,
        ...(isOjtSeeker && answers.allowancePreference
          ? [answers.allowancePreference]
          : []),
        ...(isOjtSeeker && answers.requiresMoa === true ? ["MOA required"] : []),
      ];
  const expectedCompensation = isBackendApplicant
    ? applicantProfile?.salary_min != null || applicantProfile?.salary_max != null
      ? `₱${applicantProfile.salary_min ?? "Any"} – ₱${applicantProfile.salary_max ?? "Any"} monthly`
      : ""
    : answers.minimumSalary || answers.maximumSalary
      ? `₱${answers.minimumSalary || "Any"} – ₱${answers.maximumSalary || "Any"} monthly`
      : "";
  const profileExperienceLevel = isBackendApplicant
    ? experienceLevelLabels[applicantProfile?.experience_level ?? ""] ?? ""
    : answers.experienceLevel;
  const requiredOjtHours = isBackendApplicant
    ? applicantProfile?.ojt_details?.required_hours
      ? `${applicantProfile.ojt_details.required_hours} hours`
      : ""
    : answers.requiredOjtHours
      ? `${answers.requiredOjtHours} hours`
      : "";
  const preferredStartDate = isBackendApplicant
    ? applicantProfile?.ojt_details?.preferred_start_date ?? ""
    : answers.preferredStartDate;

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
                  <p className="mt-1 text-[9px] text-[#627273]">
                    {isOjtSeeker
                      ? [
                          isBackendApplicant
                            ? applicantProfile?.ojt_details?.course
                            : answers.course,
                          isBackendApplicant
                            ? applicantProfile?.ojt_details?.education_status === "graduated"
                              ? applicantProfile.ojt_details.graduation_year
                                ? `Graduated ${applicantProfile.ojt_details.graduation_year}`
                                : "Graduated"
                              : applicantProfile?.ojt_details?.education_status === "undergraduate"
                                ? applicantProfile.ojt_details.year_level
                                  ? `Year ${applicantProfile.ojt_details.year_level}`
                                  : "Undergraduate"
                                : null
                            : answers.yearLevel,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "OJT details not added"
                      : [
                          isBackendApplicant
                            ? applicantProfile?.desired_titles?.[0]
                            : answers.desiredJobTitles[0],
                          isBackendApplicant
                            ? applicantProfile?.preferred_locations?.[0]
                            : answers.preferredLocations[0],
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Career preferences not added"}
                  </p>
                  {profileError && (
                    <p className="mt-1 text-[9px] text-[#b34b4b]" role="alert">
                      {profileError}
                    </p>
                  )}
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
                <p className="mt-0.5 text-[9px] text-[#667779]">
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
                  <dt className="text-[8px] font-semibold uppercase tracking-[0.04em] text-[#667779]">
                    Email
                  </dt>
                  <dd className="mt-1 break-words text-[10px] font-medium text-[#526365]">
                    {email}
                  </dd>
                </div>
                <ProfileField
                  label="Mobile"
                  value={isBackendApplicant ? applicantProfile?.phone || "" : ""}
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
                        : answers.school
                    }
                  />
                  <ProfileField
                    label="Course"
                    value={
                      isBackendApplicant
                        ? applicantProfile?.ojt_details?.course || ""
                        : answers.course
                    }
                  />
                  <ProfileField
                    label={
                      isBackendApplicant
                        ? applicantProfile?.ojt_details?.education_status === "graduated"
                          ? "Graduation year"
                          : "Education status"
                        : "Year level"
                    }
                    value={
                      isBackendApplicant
                        ? applicantProfile?.ojt_details?.education_status === "graduated"
                          ? applicantProfile.ojt_details.graduation_year
                            ? String(applicantProfile.ojt_details.graduation_year)
                            : "Graduated"
                          : applicantProfile?.ojt_details?.education_status === "undergraduate"
                            ? applicantProfile.ojt_details.year_level
                              ? `Undergraduate · Year ${applicantProfile.ojt_details.year_level}`
                              : "Undergraduate"
                            : ""
                        : answers.yearLevel
                    }
                  />
                  <ProfileField
                    label="Required hours"
                    value={
                      isBackendApplicant
                        ? applicantProfile?.ojt_details?.required_hours
                          ? `${applicantProfile.ojt_details.required_hours} hours`
                          : ""
                        : answers.requiredOjtHours
                          ? `${answers.requiredOjtHours} hours`
                          : ""
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
                    : answers.requiresMoa === true
                      ? "My school requires a MOA with the company."
                      : answers.requiresMoa === false
                        ? "My school does not require a MOA with the company."
                        : "MOA requirement not provided."}
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
                        {profileExperienceLevel
                          ? `Experience level: ${profileExperienceLevel}`
                          : "Work experience not added"}
                      </p>
                      <p className="mt-1 text-[9px] leading-4 text-[#627273]">
                        {applicantProfile?.desired_titles?.length
                          ? `Interested in ${applicantProfile.desired_titles.join(", ")}`
                          : "Use Edit preferences to add your desired roles."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#078b8d]" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-[#526365]">
                        {answers.experienceLevel || "Experience details not added"}
                      </p>
                      <p className="mt-1 text-[9px] leading-4 text-[#627273]">
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
                    {educationCourse || "Education details not added"}
                  </p>
                  <p className="mt-1 text-[9px] text-[#627273]">
                    {educationDetails ||
                      "Education details not added. Use Edit preferences to add them."}
                  </p>
                </div>
              </div>
            </ProfilePanel>

            <ProfilePanel
              icon="settings"
              title={isOjtSeeker ? "OJT preferences" : "Work preferences"}
            >
              <ProfileTags tags={preferenceTags} />
              <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-[#edf1f1] pt-3">
                <ProfileField
                  label={isOjtSeeker ? "Preferred start date" : "Expected salary"}
                  value={
                    isOjtSeeker
                      ? formatDate(preferredStartDate)
                      : expectedCompensation || "Not provided"
                  }
                />
                <ProfileField
                  label={isOjtSeeker ? "Required training" : "Experience level"}
                  value={
                    isOjtSeeker
                      ? requiredOjtHours
                      : profileExperienceLevel || "Not provided"
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
                  ? "Add your school and training details to strengthen your OJT profile."
                  : "Add your work history and job preferences to strengthen your job-seeker profile."
              }
              missingItems={missingProfileItems}
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
                        href={normalizeProfileLink(url) ?? undefined}
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
            <ProfilePanel icon="user" title="Identity verification">
              {identityVerificationLoading ? (
                <p className="rounded-lg bg-[#f2f8f7] p-2 text-[9px] text-[#526365]" role="status">
                  Checking identity-verification status…
                </p>
              ) : identityVerification?.status === "verified" ? (
                <div className="rounded-lg border border-[#d6ebe4] bg-[#f0f8f5] p-3">
                  <p className="text-[10px] font-semibold text-[#247b63]">Identity verified</p>
                  <p className="mt-1 text-[9px] leading-4 text-[#617b72]">
                    Your identity review is approved.
                  </p>
                </div>
              ) : identityVerification?.status === "pending" ? (
                <div className="rounded-lg border border-[#dce9e7] bg-[#f5f9f8] p-3">
                  <p className="text-[10px] font-semibold text-[#526365]">Identity review in progress</p>
                  <p className="mt-1 text-[9px] leading-4 text-[#718184]">
                    You can apply for jobs and OJT opportunities after an Admin approves your identity verification.
                  </p>
                </div>
              ) : identityVerification?.status === "rejected" ? (
                <div className="rounded-lg border border-[#f0d9d7] bg-[#fff7f6] p-3">
                  <p className="text-[10px] font-semibold text-[#a2534c]">Identity document needs attention</p>
                  <p className="mt-1 text-[9px] leading-4 text-[#875d5a]">
                    {identityVerification.rejection_reason ||
                      "Please submit a clearer or valid identity document."}
                  </p>
                </div>
              ) : (
                <p className="rounded-lg bg-[#f5f9f8] p-3 text-[9px] leading-4 text-[#718184]">
                  <span className="font-semibold">Identity verification not submitted.</span>{" "}
                  Admin approval is required before you can apply for jobs or OJT opportunities.
                </p>
              )}
              <p className="mt-2 rounded-lg bg-[#f5f9f8] p-2.5 text-[9px] leading-4 text-[#526365]">
                Upload one clear photo showing your face and your own valid government ID together in the same image. Keep the ID details readable.
              </p>
              {(!identityVerification || identityVerification.status === "rejected") &&
                !identityVerificationLoading && (
                  <label className="mt-2 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#d6e5e3] bg-[#f8fbfb] p-2.5 text-center text-[9px] font-semibold text-[#526365] hover:border-[#078b8d] focus-within:outline-[3px] focus-within:outline-[#67c9c1]">
                    {identitySelfie
                      ? "Choose a different selfie photo"
                      : identityVerification?.status === "rejected"
                        ? "Choose a replacement selfie with ID"
                        : "Choose selfie with ID"}
                    <input
                      accept=".jpg,.jpeg,.png,.webp"
                      className="sr-only"
                      disabled={identityUploadProgress !== null}
                      onChange={(event) => void handleIdentityVerificationUpload(event)}
                      type="file"
                    />
                  </label>
                )}
              {identitySelfie && (
                <div className="mt-2 rounded-lg border border-[#dce9e7] bg-white p-2">
                  <img
                    alt="Preview of your selfie showing your face with your ID"
                    className="mx-auto max-h-56 rounded-md object-contain"
                    src={identitySelfie.previewUrl}
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="truncate text-[8px] text-[#526365]">{identitySelfie.file.name}</span>
                    <button
                      className="shrink-0 rounded px-2 py-1 text-[8px] font-semibold text-[#8b332c] hover:bg-[#fff3f1] disabled:opacity-50"
                      disabled={identityUploadProgress !== null}
                      onClick={() => setIdentitySelfie(null)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                  <button
                    aria-busy={identityUploadProgress !== null}
                    className="mt-2 w-full rounded-lg bg-[#078b8d] px-3 py-2 text-[9px] font-semibold text-white hover:bg-[#067476] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={identityUploadProgress !== null}
                    onClick={() => void submitIdentityVerification()}
                    type="button"
                  >
                    {identityUploadProgress !== null && <span aria-hidden="true" className="mr-2 inline-block size-3 animate-spin rounded-full border-2 border-current border-r-transparent" />}
                    {identityUploadProgress !== null ? "Submitting for review…" : "Submit for review"}
                  </button>
                </div>
              )}
              {identityUploadProgress !== null && (
                <p className="mt-2 text-[9px] text-[#087879]" role="status">
                  Uploading… {identityUploadProgress}%
                </p>
              )}
              <p className="mt-1 text-[8px] leading-4 text-[#849394]">
                JPG, PNG, or WebP · 5 MB maximum. Replacements can be submitted after a rejection.
              </p>
              {identityVerificationError && (
                <p className="mt-2 text-[9px] text-[#b34b4b]" role="alert">
                  {identityVerificationError}
                </p>
              )}
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
                      <button
                        aria-label={`Preview resume ${serverResume.original_filename}`}
                        aria-busy={resumePreviewLoading}
                        className="block min-w-0 text-left focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2 disabled:cursor-wait"
                        disabled={resumePreviewLoading}
                        onClick={() => void previewServerResume()}
                        type="button"
                      >
                        <span className="block text-[8px] font-semibold text-[#078b8d]">
                          {resumePreviewLoading ? "Opening preview…" : "Resume · Preview"}
                        </span>
                        <span className="block truncate text-[9px] font-semibold text-[#526365]">
                          {serverResume.original_filename}
                        </span>
                        <span className="mt-0.5 block text-[8px] text-[#667779]">
                          {formatFileSize(serverResume.file_size)}
                        </span>
                      </button>
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
              ) : resume ? (
                <>
                  <ProfileDocumentCard
                    details={formatFileSize(resume.size)}
                    file={resume}
                    fileName={resume.name}
                    onDownload={downloadDocument}
                    onPreview={previewDocument}
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
                <div className="mt-4 space-y-4 border-t border-[#edf1f1] pt-3">
                  <section aria-labelledby="profile-cover-letter-heading">
                    <h3
                      className="mb-2 text-[9px] font-semibold text-[#526365]"
                      id="profile-cover-letter-heading"
                    >
                      Cover letter
                    </h3>
                    {documentsLoading ? (
                      <p className="rounded-lg bg-[#f2f8f7] p-2 text-[9px] text-[#526365]" role="status">
                        Loading documents…
                      </p>
                    ) : savedCoverLetter ? (
                      <>
                        <div className="rounded-lg bg-[#f2f8f7] p-2">
                          <div className="flex items-center gap-2">
                            <ProfileIconBadge>
                              <ProfileResumeIcon />
                            </ProfileIconBadge>
                            <button
                              className="min-w-0 flex-1 text-left focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
                              onClick={() => void previewApplicantDocument(savedCoverLetter)}
                              type="button"
                            >
                              <span className="block text-[8px] font-semibold text-[#078b8d]">
                                Cover letter · Preview
                              </span>
                              <span className="block truncate text-[9px] font-semibold text-[#526365]">
                                {savedCoverLetter.original_filename}
                              </span>
                              <span className="mt-0.5 block text-[8px] text-[#667779]">
                                {formatFileSize(savedCoverLetter.file_size)}
                              </span>
                            </button>
                            <button
                              aria-label="Download cover letter"
                              className="rounded p-1 text-[#078b8d] hover:bg-white"
                              onClick={() => void downloadApplicantDocument(savedCoverLetter)}
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
                                disabled={documentUploadProgress !== null}
                                onChange={(event) => void handleDocumentUpload(event, "cover-letter")}
                                type="file"
                              />
                            </label>
                            <button
                              className="rounded px-1 py-1 text-[8px] font-semibold text-[#a2534c] hover:underline"
                              disabled={documentUploadProgress !== null}
                              onClick={() => void removeApplicantDocument(savedCoverLetter)}
                              type="button"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#d6e5e3] bg-[#f8fbfb] p-2.5 hover:border-[#078b8d]">
                        <ProfileIconBadge>
                          <ProfileResumeIcon />
                        </ProfileIconBadge>
                        <span className="text-[9px] font-semibold text-[#526365]">
                          Upload a PDF or DOCX cover letter · up to 5 MB
                        </span>
                        <input
                          accept=".pdf,.docx"
                          className="sr-only"
                          disabled={documentUploadProgress !== null}
                          onChange={(event) => void handleDocumentUpload(event, "cover-letter")}
                          type="file"
                        />
                      </label>
                    )}
                    {coverLetterError && (
                      <p className="mt-2 text-[9px] text-[#b34b4b]" role="alert">
                        {coverLetterError}
                      </p>
                    )}
                    {documentUploadProgress !== null && (
                      <p className="mt-2 text-[9px] text-[#087879]" role="status">
                        Uploading document… {documentUploadProgress}%
                      </p>
                    )}
                  </section>

                  <section aria-labelledby="supporting-documents-heading">
                    <h3
                      className="mb-2 text-[9px] font-semibold text-[#526365]"
                      id="supporting-documents-heading"
                    >
                      Supporting documents
                    </h3>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <label className="text-[8px] font-medium text-[#667779]" htmlFor="supporting-document-type">
                        Document type
                      </label>
                      <select
                        className="rounded-md border border-[#e0e9e8] bg-white px-2 py-1 text-[9px] text-[#526365]"
                        id="supporting-document-type"
                        onChange={(event) =>
                          setSupportingDocumentType(
                            event.target.value as Exclude<ApplicantDocumentType, "cover_letter">,
                          )
                        }
                        value={supportingDocumentType}
                      >
                        <option value="certificate">Certificate</option>
                        <option value="education">Education</option>
                        <option value="other">Other</option>
                      </select>
                      <label className="cursor-pointer rounded-md border border-[#dce9e7] px-2 py-1 text-[8px] font-semibold text-[#078b8d] hover:bg-[#f4faf9]">
                        Add document
                        <input
                          accept=".pdf,.docx"
                          className="sr-only"
                          disabled={documentUploadProgress !== null}
                          onChange={(event) => void handleSupportingDocumentUpload(event)}
                          type="file"
                        />
                      </label>
                    </div>
                    {documentsLoading ? null : supportingDocuments.length > 0 ? (
                      <ul className="space-y-2">
                        {supportingDocuments.map((document) => (
                          <li
                            className="flex min-w-0 items-center gap-2 rounded-lg bg-[#f2f8f7] p-2"
                            key={document.id}
                          >
                            <button
                              className="min-w-0 flex-1 text-left focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
                              onClick={() => void previewApplicantDocument(document)}
                              type="button"
                            >
                              <span className="block text-[8px] font-semibold capitalize text-[#078b8d]">
                                {document.document_type.replace("_", " ")}
                              </span>
                              <span className="block truncate text-[9px] font-semibold text-[#526365]">
                                {document.original_filename}
                              </span>
                              <span className="mt-0.5 block text-[8px] text-[#667779]">
                                {formatFileSize(document.file_size)}
                              </span>
                            </button>
                            <button
                              aria-label={`Download ${document.original_filename}`}
                              className="rounded p-1 text-[10px] font-semibold text-[#078b8d] hover:bg-white"
                              onClick={() => void downloadApplicantDocument(document)}
                              type="button"
                            >
                              ↓
                            </button>
                            <button
                              aria-label={`Remove ${document.original_filename}`}
                              className="rounded p-1 text-[10px] font-semibold text-[#a2534c] hover:bg-white"
                              onClick={() => void removeApplicantDocument(document)}
                              type="button"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-lg bg-[#f8fbfb] p-2 text-[8px] leading-4 text-[#849394]">
                        Add certificates, education records, or other supporting documents if relevant.
                      </p>
                    )}
                  </section>
                  {documentsError && (
                    <p className="text-[9px] text-[#b34b4b]" role="alert">
                      {documentsError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4 border-t border-[#edf1f1] pt-3">
                {coverLetter ? (
                  <>
                    <ProfileDocumentCard
                      details={formatFileSize(coverLetter.size)}
                      file={coverLetter}
                      fileName={coverLetter.name}
                      onDownload={downloadDocument}
                      onPreview={previewDocument}
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
                <p className="mt-2 flex items-center gap-1 text-[8px] text-[#667779]">
                  <ProfileLocationIcon />
                  Profile location: {location}
                </p>
              )}
            </ProfilePanel>
            {isOjtSeeker && (
              <ProfilePanel icon="skills" title="OJT readiness">
                <ul className="space-y-2.5 text-[9px] text-[#627273]">
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
          isBackendApplicant={isBackendApplicant}
          isSaving={isSavingPreferences}
          isOjtSeeker={isOjtSeeker}
          categories={availableCategories}
          categoriesLoading={categoriesLoading}
          categoriesError={categoriesError}
          onClose={() => {
            if (!isSavingPreferences) setIsPreferencesEditorOpen(false);
          }}
          onSave={savePreferences}
          saveError={preferencesSaveError}
        />
      )}
      {isBookmarksModalOpen && (
        <SavedOpportunitiesModal
          onClose={() => setIsBookmarksModalOpen(false)}
        />
      )}
      {isProfilePicturePreviewOpen && profilePicture && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto overscroll-contain p-4 max-[600px]:p-3">
          <button
            aria-label="Close profile picture preview"
            className="absolute inset-0 size-full cursor-default bg-[#1f3333]/70"
            onClick={() => setIsProfilePicturePreviewOpen(false)}
            type="button"
          />
          <section
            aria-label={`${name} profile picture`}
            aria-modal="true"
            className="relative z-10 flex max-h-[calc(100dvh-3rem)] max-w-[min(90vw,720px)] items-center justify-center rounded-[16px] bg-white p-2 shadow-[0_16px_48px_rgba(0,0,0,0.3)]"
            ref={profilePictureDialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <img
              alt={`${name} profile`}
              className="max-h-[calc(100dvh-5rem)] max-w-full rounded-xl object-contain"
              src={profilePicture}
            />
            <button
              aria-label="Close profile picture preview"
              data-dialog-initial
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto overscroll-contain p-4 max-[600px]:p-3">
          <button
            aria-label="Close document preview"
            className="absolute inset-0 size-full cursor-default bg-[#1f3333]/70"
            onClick={closeDocumentPreview}
            type="button"
          />
          <section
            aria-labelledby="document-preview-title"
            aria-modal="true"
            className="relative z-10 flex h-[min(82dvh,760px)] max-h-[calc(100dvh-2rem)] w-full max-w-[900px] flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.3)]"
            ref={documentPreviewDialogRef}
            role="dialog"
            tabIndex={-1}
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
                  data-dialog-initial
                  className="rounded-lg bg-[#078b98] px-3 py-2 text-[10px] font-semibold text-white hover:bg-[#06767f] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
                  onClick={() => {
                    downloadPreviewDocument();
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
            {documentPreviewIsPdf && documentPreview.url ? (
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
                  onClick={downloadPreviewDocument}
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