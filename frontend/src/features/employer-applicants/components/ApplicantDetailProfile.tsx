import { useEffect, useState } from "react";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import ApplicantDetailSkeleton from "@/features/employer-applicants/components/ApplicantDetailSkeleton";
import type { Applicant, ApplicantDocument } from "@/features/employer-applicants/types";
import {
  downloadApplicantDocument,
  getApplicantPortfolioUrl,
  getExternalDocumentUrl,
  getGitHubUsername,
} from "@/features/employer-applicants/utils";

function ApplicantProfilePortfolioPreview({ applicant }: { applicant: Applicant }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f6f8fa] p-6">
      <article className="mx-auto min-h-full w-full max-w-5xl rounded-2xl border border-[#dfe8ea] bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#eef2f3] pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#678082]">
              Portfolio overview
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[#203638]">{applicant.name}</h3>
          </div>
          <span className="rounded-full bg-[#eaf6f4] px-2.5 py-1 text-[10px] font-semibold text-[#2f7673]">
            {applicant.jobType}
          </span>
        </div>
        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-xl border border-[#ebf1f1] bg-[#f6faf9] p-4">
            <h4 className="text-sm font-semibold text-[#1f2d31]">Professional summary</h4>
            <p className="mt-3 text-sm leading-7 text-[#52696a]">{applicant.summary}</p>
          </section>
          <section className="rounded-xl border border-[#ebf1f1] bg-[#f6faf9] p-4">
            <h4 className="text-sm font-semibold text-[#1f2d31]">Experience</h4>
            <p className="mt-3 text-sm leading-7 text-[#52696a]">{applicant.experience}</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#52696a]">
              {applicant.experienceDetails.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </section>
        </div>
        <div className="mt-6 rounded-xl border border-[#ebf1f1] bg-white p-4">
          <h4 className="text-sm font-semibold text-[#1f2d31]">Skills</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {applicant.skills.length ? (
              applicant.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-[#eaf6f4] px-3 py-1.5 text-xs font-medium text-[#327174]"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#718586]">Skills not provided</span>
            )}
          </div>
          <p className="mt-5 text-sm text-[#52696a]">{applicant.education}</p>
        </div>
      </article>
    </div>
  );
}

type GitHubProfile = {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
};

type GitHubRepository = {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
};

function GitHubPortfolioPreview({ url, username }: { url: string; username: string }) {
  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGitHubProfile() {
      setIsLoading(true);
      setError(null);
      try {
        const headers = { Accept: "application/vnd.github+json" };
        const [profileResponse, repositoriesResponse] = await Promise.all([
          fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
            headers,
            signal: controller.signal,
          }),
          fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=6`, {
            headers,
            signal: controller.signal,
          }),
        ]);

        if (!profileResponse.ok) {
          throw new Error(
            profileResponse.status === 404
              ? "This GitHub profile could not be found."
              : "Unable to load this public GitHub profile. Please try again.",
          );
        }
        if (!repositoriesResponse.ok) {
          throw new Error("Unable to load the applicant’s public GitHub repositories. Please try again.");
        }

        const [profileData, repositoryData] = await Promise.all([
          profileResponse.json() as Promise<GitHubProfile>,
          repositoriesResponse.json() as Promise<GitHubRepository[]>,
        ]);

        if (!controller.signal.aborted) {
          setProfile(profileData);
          setRepositories(repositoryData.filter((repository) => !repository.fork));
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load this GitHub profile.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadGitHubProfile();
    return () => controller.abort();
  }, [username, retryCount]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f6f8fa] p-4 sm:p-7">
      <article className="mx-auto min-h-full w-full max-w-5xl overflow-hidden rounded-xl border border-[#d0d7de] bg-white shadow-sm">
        {isLoading ? (
          <div aria-busy="true" className="space-y-4 p-8" role="status">
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 rounded-full" />
                <Skeleton className="h-4 w-32 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : error ? (
          <div className="p-8" role="alert">
            <p className="text-sm text-[#cf222e]">{error}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="rounded-md border border-[#d0d7de] px-3 py-1.5 text-xs font-medium text-[#1f2328] hover:bg-[#f6f8fa]"
              >
                Retry
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1.5 text-xs font-medium text-[#0969da] hover:underline"
              >
                Open GitHub directly ↗
              </a>
            </div>
          </div>
        ) : profile ? (
          <div className="grid gap-5 p-4 sm:grid-cols-[minmax(230px,0.8fr)_2fr] sm:gap-7 sm:p-7">
            <aside className="rounded-xl border border-[#d8dee4] bg-[#f6f8fa] p-5">
              <img
                src={profile.avatar_url}
                alt=""
                className="size-28 rounded-full border border-[#d0d7de] bg-[#f6f8fa] sm:size-36"
              />
              <h3 className="mt-4 text-xl font-semibold text-[#1f2328]">
                {profile.name || profile.login}
              </h3>
              <p className="text-base text-[#59636e]">{profile.login}</p>
              {profile.bio ? <p className="mt-3 text-sm text-[#1f2328]">{profile.bio}</p> : null}
              {profile.location ? (
                <p className="mt-3 text-xs text-[#59636e]">⌖ {profile.location}</p>
              ) : null}
              <p className="mt-4 text-xs text-[#59636e]">
                <strong className="text-[#1f2328]">{profile.followers}</strong> followers ·{" "}
                <strong className="text-[#1f2328]">{profile.following}</strong> following
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex rounded-md border border-[#d0d7de] bg-white px-3 py-1.5 text-xs font-medium text-[#1f2328] hover:bg-[#f3f4f6]"
              >
                View GitHub profile ↗
              </a>
            </aside>

            <section aria-labelledby="github-repositories-heading" className="min-w-0">
              <div className="flex items-center justify-between border-b border-[#d8dee4] pb-3">
                <h4 id="github-repositories-heading" className="text-sm font-semibold text-[#1f2328]">
                  Popular repositories
                </h4>
                <span className="text-xs text-[#59636e]">{profile.public_repos} public</span>
              </div>
              <ul className="grid gap-3 pt-4 sm:grid-cols-2">
                {repositories.map((repository) => (
                  <li key={repository.id} className="rounded-xl border border-[#d8dee4] p-3">
                    <a
                      href={repository.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-[#0969da] hover:underline"
                    >
                      {repository.name}
                    </a>
                    <p className="mt-2 line-clamp-2 text-xs text-[#59636e]">
                      {repository.description ?? "No description provided."}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-[#59636e]">
                      <span>{repository.language ?? "Other"}</span>
                      <span>•</span>
                      <span>⭐ {repository.stargazers_count}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </article>
    </div>
  );
}

export function ApplicantPortfolioPreview({ applicant }: { applicant: Applicant }) {
  const portfolioUrl = getApplicantPortfolioUrl(applicant);
  const githubUsername = portfolioUrl ? getGitHubUsername(portfolioUrl) : null;

  if (!portfolioUrl) {
    return <ApplicantProfilePortfolioPreview applicant={applicant} />;
  }

  if (githubUsername) {
    return <GitHubPortfolioPreview url={portfolioUrl} username={githubUsername} />;
  }

  return (
    <ErrorBoundary
      fallback={<div className="p-6 text-sm text-[#7b8d8d]">This portfolio preview is unavailable.</div>}
    >
      <div className="flex min-h-0 flex-1 flex-col bg-white">
        <iframe
          src={portfolioUrl}
          title={`${applicant.name} portfolio website`}
          className="min-h-0 w-full flex-1 border-0 bg-white"
          referrerPolicy="no-referrer"
          sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
        />
      </div>
    </ErrorBoundary>
  );
}

export function ApplicantProfileSection({
  applicant,
  selectedPortfolio,
  onDocumentOpen,
  onPortfolioClose,
}: {
  applicant: Applicant;
  selectedPortfolio: ApplicantDocument | null;
  onDocumentOpen: (document: ApplicantDocument) => void;
  onPortfolioClose: () => void;
}) {
  return (
    <section aria-labelledby="profile-heading" className="rounded-[20px] border border-[#e7efee] bg-white p-5 shadow-[0_10px_22px_rgba(24,52,52,0.03)]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="profile-heading" className="text-lg font-semibold text-[#203638]">
            Applicant profile
          </h2>
          <p className="mt-1 text-xs text-[#718586]">Submitted documents and portfolio preview</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {applicant.documents.map((document) => {
          const isPortfolioDocument = getExternalDocumentUrl(document) !== null;
          return (
            <div
              key={document.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#e7efee] bg-[#f9fbfb] px-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#203638]">{document.title}</p>
                <p className="mt-1 text-[10px] text-[#718586]">{document.fileName}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onDocumentOpen(document)}
                  className="rounded-lg border border-[#d7e6e5] px-3 py-2 text-[10px] font-semibold text-[#177d83] hover:bg-[#f3faf9]"
                >
                  {isPortfolioDocument ? "View portfolio" : "View document"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPortfolio && applicant ? (
        <section
          aria-label={`${selectedPortfolio.title} preview`}
          className="mt-5 overflow-hidden rounded-xl border border-[#d7e6e5] bg-white shadow-sm"
        >
          <header className="flex items-center justify-between gap-3 border-b border-[#e7efee] px-4 py-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-[#203638]">{selectedPortfolio.title}</h3>
              <p className="truncate text-xs text-[#718586]">{selectedPortfolio.fileName}</p>
            </div>
            <button
              type="button"
              onClick={onPortfolioClose}
              aria-label="Close portfolio preview"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-lg text-[#496264] hover:bg-[#f3f8f7]"
            >
              ×
            </button>
          </header>
          <div className="h-[min(75vh,760px)] min-h-100">
            <ApplicantPortfolioPreview applicant={applicant} />
          </div>
        </section>
      ) : null}
    </section>
  );
}

export function ApplicantSidebar({
  applicant,
  contactError,
  contactLoading,
  onContactApplicant,
}: {
  applicant: Applicant;
  contactError: string | null;
  contactLoading: boolean;
  onContactApplicant: () => void;
}) {
  return (
    <aside className="lg:border-l lg:border-[#e7efee] lg:pl-6">
      <section aria-labelledby="contact-heading" className="rounded-[20px] border border-[#e7efee] bg-white p-5 shadow-[0_10px_22px_rgba(24,52,52,0.03)]">
        <h2 id="contact-heading" className="text-sm font-semibold text-[#203638]">
          Contact details
        </h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-xs text-[#718586]">Email</dt>
            <dd className="mt-1 break-all">
              <a className="font-medium text-[#177d83] hover:underline" href={`mailto:${applicant.email}`}>
                {applicant.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#718586]">Phone</dt>
            <dd className="mt-1 font-medium text-[#243b3d]">{applicant.phone}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#718586]">Location</dt>
            <dd className="mt-1 font-medium text-[#243b3d]">{applicant.location}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="application-heading" className="mt-5 rounded-[20px] border border-[#e7efee] bg-white p-5 shadow-[0_10px_22px_rgba(24,52,52,0.03)]">
        <h2 id="application-heading" className="text-sm font-semibold text-[#203638]">
          Application details
        </h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <dt className="text-xs text-[#718586]">Position</dt>
            <dd className="text-right font-medium text-[#243b3d]">{applicant.role}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-xs text-[#718586]">Department</dt>
            <dd className="text-right font-medium text-[#243b3d]">{applicant.department}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-xs text-[#718586]">Education</dt>
            <dd className="max-w-47.5 text-right font-medium text-[#243b3d]">{applicant.education}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-xs text-[#718586]">Portfolio</dt>
            <dd className="max-w-47.5 text-right font-medium text-[#243b3d]">{applicant.portfolio}</dd>
          </div>
        </dl>
      </section>

      {contactError && <p className="mb-3 text-xs text-[#a2534c]" role="alert">{contactError}</p>}
      <button
        type="button"
        onClick={() => void onContactApplicant()}
        disabled={contactLoading}
        className="inline-flex w-full items-center justify-center rounded-lg bg-[#0e8e9b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a7d8a] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-[3px] focus-visible:outline-[#67c9c1] focus-visible:outline-offset-2"
      >
        {contactLoading ? "Opening messaging…" : "Contact applicant"}
      </button>
    </aside>
  );
}

export function ApplicantLoadingState() {
  return <ApplicantDetailSkeleton />;
}

export function ApplicantNotFoundState() {
  return (
    <section className="mt-8 border-t border-[#e1ebea] py-8">
      <h1 className="text-xl font-semibold text-[#203638]">Applicant not found</h1>
      <p className="mt-2 text-sm text-[#667b7c]">
        This applicant may have been removed or the link may be incorrect.
      </p>
    </section>
  );
}

export function ApplicantDocumentPreviewDialog({
  selectedDocument,
  onClose,
}: {
  selectedDocument: ApplicantDocument | null;
  onClose: () => void;
}) {
  if (!selectedDocument) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-[#1f3333]/20 p-4">
      <button
        type="button"
        aria-label="Close document preview"
        className="absolute inset-0 size-full cursor-default bg-[#1f3333]/70"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-dialog-title"
        className="relative z-10 flex h-[94dvh] max-h-[calc(100dvh-1rem)] w-[98vw] max-w-400 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_16px_48px_rgba(0,0,0,0.3)]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-[#edf1f1] px-4 py-3">
          <div className="min-w-0">
            <h2 id="document-dialog-title" className="text-sm font-bold text-[#2c3e40]">
              {selectedDocument.title}
            </h2>
            <p className="truncate text-[10px] text-[#829091]">{selectedDocument.fileName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => downloadApplicantDocument(selectedDocument)}
              className="rounded-lg bg-[#078b98] px-3 py-2 text-[10px] font-semibold text-white hover:bg-[#06767f] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
            >
              Download
            </button>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              aria-label="Close document preview"
              className="grid size-8 place-items-center rounded-full text-xl text-[#526365] hover:bg-[#f1f6f5] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
            >
              ×
            </button>
          </div>
        </header>

        {selectedDocument.dataUrl && selectedDocument.mimeType === "application/pdf" ? (
          <iframe
            className="min-h-0 flex-1 bg-[#f3f6f6]"
            src={selectedDocument.dataUrl}
            title={`${selectedDocument.title} PDF preview`}
          />
        ) : selectedDocument.dataUrl ? (
          <div className="flex min-h-75 flex-col items-center justify-center px-6 py-10 text-center">
            <p className="text-[13px] font-semibold text-[#2c3e40]">
              Preview is not available for this file type
            </p>
            <p className="mt-1 max-w-105 text-[11px] leading-5 text-[#829091]">
              Download this Word document to view the applicant’s original submission.
            </p>
            <button
              type="button"
              onClick={() => downloadApplicantDocument(selectedDocument)}
              className="mt-4 rounded-lg bg-[#078b98] px-4 py-2.5 text-[10px] font-semibold text-white hover:bg-[#06767f] focus-visible:outline-[3px] focus-visible:outline-[#67c9c1]"
            >
              Download document
            </button>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto bg-[#f3f6f6] p-5 max-[600px]:p-3">
            <article className="mx-auto min-h-full max-w-185 bg-white px-10 py-12 shadow-sm max-[600px]:px-5 max-[600px]:py-7">
              <pre className="whitespace-pre-wrap wrap-break-word font-sans text-xs leading-7 text-[#344648] max-[600px]:text-[11px] max-[600px]:leading-6">
                {selectedDocument.preview.join("\n\n")}
              </pre>
            </article>
          </div>
        )}
      </section>
    </div>
  );
}
