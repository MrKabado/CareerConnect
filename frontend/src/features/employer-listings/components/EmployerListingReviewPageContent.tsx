import { Link } from "react-router";
import ConfirmOnboardingDialog from "@/components/common/employer/ConfirmOnboardingDialog";
import EmployerWorkspaceLayout from "@/components/common/employer/EmployerWorkspaceLayout";
import ListingReviewDefaults from "@/features/employer-listings/components/ListingReviewDefaults";
import ListingReviewSummary from "@/features/employer-listings/components/ListingReviewSummary";
import ReviewActionPanel from "@/features/employer-listings/components/ReviewActionPanel";
import { useEmployerListingReview } from "@/features/employer-listings/hooks/useEmployerListingReview";
import type { ReviewListing } from "@/features/employer-listings/types";

export default function EmployerListingReviewPageContent({ listing }: { listing: ReviewListing }) {
  const {
    companyName,
    draft,
    setDraft,
    status,
    record,
    error,
    isLoading,
    notice,
    canPublish,
    isPublished,
    isDevPanelVisible,
    isDialogOpen,
    setIsDialogOpen,
    defaultsSnapshot,
    confirmationSummary,
    handleConfirmSubmission,
    handlePublish,
  } = useEmployerListingReview(listing);

  return (
    <EmployerWorkspaceLayout>
      <main className="mx-auto w-full max-w-[1040px] flex-1 px-10 py-6 max-[920px]:px-6 max-[680px]:px-4">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#188783]">
              Listing setup
            </p>
            <h1 className="mt-2 text-[26px] font-bold tracking-[-0.08em] text-[#1d3133]">
              Review listing setup
            </h1>
          </div>
          <Link
            to="/employer/listings"
            className="inline-flex items-center rounded-xl border border-[#dfeae8] bg-white px-3 py-2 text-[11px] font-semibold text-[#35555a] transition hover:border-[#cfe3e4]"
          >
            Back to listings
          </Link>
        </div>

        <section className="rounded-[20px] border border-[#e5eeeb] bg-white p-5 shadow-[0_10px_20px_rgba(27,54,52,0.03)]">
          <ListingReviewSummary
            draft={draft}
            setDraft={setDraft}
            status={status}
            companyName={companyName}
          />

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[16px] border border-[#e5eeeb] bg-[#fbfdfd] p-4">
              <label className="block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#62777a]">About this role</p>
                <textarea
                  aria-label="Listing description"
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={5}
                  className="mt-3 w-full resize-none rounded-xl border border-[#dfeae8] bg-[#f8fbfb] px-3 py-2.5 text-[12px] leading-6 text-[#495e60] outline-none focus:border-[#b8dde0]"
                />
              </label>

              <label className="mt-4 block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#62777a]">Responsibilities</p>
                <textarea
                  aria-label="Listing responsibilities"
                  value={draft.responsibilities}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, responsibilities: event.target.value }))
                  }
                  rows={6}
                  className="mt-3 w-full resize-none rounded-xl border border-[#dfeae8] bg-[#f8fbfb] px-3 py-2.5 text-[12px] leading-5 text-[#4d6366] outline-none focus:border-[#b8dde0]"
                />
              </label>
            </div>

            <ListingReviewDefaults
              companyName={companyName}
              draft={draft}
              setDraft={setDraft}
              listingId={listing.id}
            />
          </div>

          {isDevPanelVisible ? (
            <div className="mt-6 rounded-[14px] border border-[#dfeae8] bg-[#f5f9f9] p-3 text-[11px] text-[#546b6d]">
              <p className="font-semibold uppercase tracking-[0.12em] text-[#5b7073]">Dev status</p>
              <p className="mt-2 text-[#1d3133]">approved</p>
            </div>
          ) : null}

          <ReviewActionPanel
            alertMessage={notice}
            error={error}
            status={status}
            record={record}
            companyName={companyName}
            confirmationSummary={confirmationSummary}
            canPublish={canPublish}
            isPublished={isPublished}
            isLoading={isLoading}
            onConfirm={() => setIsDialogOpen(true)}
            onRetry={() => void handleConfirmSubmission()}
            onPublish={() => void handlePublish()}
          />
        </section>
      </main>

      <ConfirmOnboardingDialog
        open={isDialogOpen}
        defaults={defaultsSnapshot}
        isSubmitting={isLoading}
        error={error}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={() => void handleConfirmSubmission()}
      />
    </EmployerWorkspaceLayout>
  );
}
