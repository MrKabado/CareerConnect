import EmployerWorkspaceLayout from "@/components/common/employer/EmployerWorkspaceLayout";
import { filterOptions } from "@/features/employer-listings/hooks/useEmployerJobListings";
import { useEmployerJobListings } from "@/features/employer-listings/hooks/useEmployerJobListings";
import CreateListingModal from "@/features/employer-listings/components/CreateListingModal";
import JobListingsBoard from "@/features/employer-listings/components/JobListingsTable";
import Modal from "@/components/common/Modal";
import ListingDetailsModal from "@/features/employer-listings/components/ListingDetailsModal";
import { useState } from "react";
import type { EmployerListing } from "@/features/employer-listings/listings";

function SummaryCard({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: string }) {
  const visibilityLabel =
    label === "Active listings" ? "Public" : label === "Drafts" ? "Private" : null;

  return (
    <div className="rounded-[18px] border border-[#e5eeeb] bg-white p-4 shadow-[0_8px_20px_rgba(27,54,52,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
          <span className="h-2.5 w-2.5 rounded-full bg-current opacity-90" />
        </div>
        {visibilityLabel && (
          <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#7b8d8d]">
            {visibilityLabel}
          </span>
        )}
      </div>
      <p className="mt-4 text-[11px] text-[#758587]">{label}</p>
      <p className="mt-1 text-[26px] font-bold leading-none tracking-[-0.08em] text-[#1d3133]">{value}</p>
      <p className="mt-2 text-[10px] text-[#6d7f7f]">{detail}</p>
    </div>
  );
}

export default function EmployerJobListingsPageContent() {
  const [viewedListing, setViewedListing] = useState<EmployerListing | null>(null);
  const {
    companyProfile,
    listings,
    visibleListings,
    filter,
    setFilter,
    selectedId,
    setSelectedId,
    activeListingCount,
    draftListingCount,
    isCreateModalOpen,
    openCreateModal,
    openEditModal,
    closeCreateModal,
    newListingType,
    handleNewListingTypePick,
    newListingStep,
    setNewListingStep,
    newListingForm,
    salaryRangeError,
    updateNewListingForm,
    updateNewListingList,
    handleSaveDraft,
    handlePublish,
    modalTitle,
    categories,
    isLoading,
    isSaving,
    error,
    retry,
    updateListingStatus,
    closingListingId,
    setClosingListingId,
    confirmCloseListing,
  } = useEmployerJobListings();

  return (
    <EmployerWorkspaceLayout>
      <main className="mx-auto w-full max-w-[1136px] flex-1 px-10 py-6 max-[920px]:px-6 max-[680px]:px-4 max-[680px]:py-5">
        <div className="relative isolate mb-5 flex flex-col gap-3 py-5 before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:border-b before:border-[#deeeeb] before:bg-[radial-gradient(ellipse_at_77%_0%,rgba(194,236,228,0.56),transparent_44%),linear-gradient(112deg,#f0faf8_0%,#e8f7f4_53%,#e4f5f2_100%)] md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[9px] font-semibold text-[#188783]">{companyProfile.name}</p>
            <h1 className="mt-2 text-[25px] leading-tight font-bold tracking-[-0.8px] text-[#263638] max-[600px]:text-[22px]">Job Listings</h1>
            <p className="mt-1 text-[11px] text-[#849293]">Create, review, and manage every {companyProfile.name} opportunity in one place.</p>
          </div>
          <button type="button" onClick={openCreateModal} className="inline-flex items-center justify-center rounded-xl bg-[#0e8e9b] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(14,142,155,0.2)] transition hover:bg-[#0a7d8a]">
            <span className="mr-2 text-base leading-none">＋</span>
            Create new listing
          </button>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[{ label: "Total listings", value: listings.length, detail: "Your company's listings", tone: "bg-[#edf5ff] text-[#3477d3]" }, { label: "Active listings", value: activeListingCount, detail: "Currently accepting applications", tone: "bg-[#eefaf5] text-[#178d6b]" }, { label: "Drafts", value: draftListingCount, detail: "Not yet published", tone: "bg-[#fff9eb] text-[#c28921]" }, { label: "OJT listings", value: listings.filter((listing) => listing.type === "OJT").length, detail: "Internship opportunities", tone: "bg-[#edeefb] text-[#5c5ad9]" }].map(({ label, value, detail, tone }) => (
            <SummaryCard key={label} label={label} value={value} detail={detail} tone={tone} />
          ))}
        </section>

        <section className="mt-6 rounded-[22px] border border-[#e5eeeb] bg-white shadow-[0_10px_20px_rgba(20,47,47,0.02)]">
          <div className="flex flex-col gap-3 border-b border-[#e7efee] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#1d3034]">Opportunity pipeline</h2>
              <p className="mt-1 text-xs text-[#738385]">{visibleListings.length} opportunities shown</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {filterOptions.map((option) => (
                <button key={option} type="button" onClick={() => setFilter(option)} aria-pressed={filter === option} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${filter === option ? "bg-[#0e8e9b] text-white" : "text-[#587174] hover:bg-[#f1f8f7]"}`}>
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            {error && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">
                <span>{error}</span><button className="font-semibold underline" onClick={retry} type="button">Try again</button>
              </div>
            )}
            {isLoading ? (
              <p aria-live="polite" className="py-8 text-center text-sm text-[#738385]">Loading your listings…</p>
            ) : (
              <JobListingsBoard
                key={filter}
                listings={visibleListings}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                onStatusChange={updateListingStatus}
                onEdit={openEditModal}
                onView={setViewedListing}
              />
            )}
          </div>
        </section>
      </main>

      <CreateListingModal
        companyName={companyProfile.name}
        categories={categories}
        error={error}
        isSaving={isSaving}
        isOpen={isCreateModalOpen}
        newListingType={newListingType}
        newListingStep={newListingStep}
        modalTitle={modalTitle}
        newListingForm={newListingForm}
        salaryRangeError={salaryRangeError}
        onClose={closeCreateModal}
        onTypePick={handleNewListingTypePick}
        onBack={() => setNewListingStep(1)}
        onFieldChange={(field, value) => updateNewListingForm(field, value)}
        onListChange={updateNewListingList}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
      />
      {closingListingId !== null && (
        <Modal
          title="Close listing?"
          subtitle="Existing applicants and application history will be preserved."
          onClose={() => setClosingListingId(null)}
          widthClass="max-w-md"
        >
          <div className="px-6 pb-6">
            <p className="text-sm leading-6 text-[#5b7072]">The listing will stop accepting new applications and will be removed from public search.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-lg border border-[#dfe8e7] px-4 py-2 text-sm font-semibold text-[#526365]" disabled={isSaving} type="button" onClick={() => setClosingListingId(null)}>Cancel</button>
              <button className="rounded-lg bg-[#a7464b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving} type="button" onClick={() => void confirmCloseListing()}>{isSaving ? "Closing…" : "Confirm close"}</button>
            </div>
          </div>
        </Modal>
      )}
      <ListingDetailsModal listing={viewedListing} onClose={() => setViewedListing(null)} />
    </EmployerWorkspaceLayout>
  );
}
