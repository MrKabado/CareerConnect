import { Navigate } from "react-router";
import EmployerWorkspaceLayout from "@/components/common/employer/EmployerWorkspaceLayout";
import { employerMessageFilters } from "@/features/messaging/constants";
import { EmployerMessageThread } from "@/features/messaging/components/EmployerMessageThread";
import { EmployerMessagesSidebar } from "@/features/messaging/components/EmployerMessagesSidebar";
import { useEmployerMessagesPage } from "@/features/messaging/hooks/useEmployerMessagesPage";

export default function EmployerMessagesPageContent() {
  const {
    actor,
    user,
    conversationId,
    filteredConversations,
    conversations,
    conversationsError,
    loading,
    selectedConversation,
    messages,
    messagesLoading,
    messagesError,
    unreadIds,
    listingOptions,
    filter,
    setFilter,
    listingId,
    setListingId,
    search,
    setSearch,
    body,
    setBody,
    sending,
    sendError,
    handleSend,
    openConversation,
    navigate,
  } = useEmployerMessagesPage();

  if (user?.role === "applicant" || !actor) {
    return <Navigate replace to={user?.role === "applicant" ? "/messages" : "/login"} />;
  }

  return (
    <EmployerWorkspaceLayout>
      <main className="mx-auto flex w-full max-w-284 flex-1 flex-col px-6 py-8 max-[680px]:px-4 max-[680px]:py-5">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#078b8d]">Applicant communications</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#263a3c]">Messages</h1>
          <p className="mt-1 text-sm text-[#687b7e]">Continue conversations with applicants to your listings.</p>
        </div>

        <section className="grid min-h-[min(700px,calc(100dvh-16rem))] flex-1 grid-cols-[minmax(270px,360px)_minmax(0,1fr)] overflow-hidden rounded-2xl border border-[#e5eeec] bg-white shadow-[0_8px_24px_rgba(34,66,65,0.06)] max-[760px]:grid-cols-1">
          <EmployerMessagesSidebar
            conversationId={conversationId}
            conversations={filteredConversations}
            totalConversations={conversations.length}
            conversationsError={conversationsError?.message ?? null}
            filter={filter}
            filters={employerMessageFilters}
            listingId={listingId}
            listingOptions={listingOptions}
            loading={loading}
            onConversationSelect={openConversation}
            onFilterChange={setFilter}
            onListingChange={setListingId}
            onSearchChange={setSearch}
            search={search}
            unreadIds={unreadIds}
          />

          <EmployerMessageThread
            actor={actor}
            conversation={selectedConversation}
            error={messagesError?.message ?? null}
            loading={messagesLoading}
            messages={messages}
            onBack={() => navigate("/employer/messages")}
            onBodyChange={setBody}
            onSend={handleSend}
            sendError={sendError}
            sending={sending}
            body={body}
          />
        </section>
      </main>
    </EmployerWorkspaceLayout>
  );
}
