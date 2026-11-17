import { useEffect, useRef } from "react";
import Footer from "@/components/common/user/userFooter";
import Header from "@/components/common/user/userHeader";
import { Navigate } from "react-router";
import { ApplicantMessageThread } from "@/features/messaging/components/ApplicantMessageThread";
import { ApplicantMessagesSidebar } from "@/features/messaging/components/ApplicantMessagesSidebar";
import { useApplicantMessagesPage } from "@/features/messaging/hooks/useApplicantMessagesPage";

export default function ApplicantMessagesPageContent() {
  const {
    actor,
    conversationId,
    conversationsError,
    conversationsLoading,
    filteredConversations,
    handleSend,
    chooseConversation,
    isDemoPreview,
    messages,
    messagesError,
    messagesLoading,
    selectedConversation,
    search,
    setSearch,
    messageText,
    setMessageText,
    sending,
    sendError,
    announcement,
    unreadConversationIds,
    navigate,
    user,
  } = useApplicantMessagesPage();
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (user?.role === "employer" || !actor) {
    return <Navigate replace to={user?.role === "employer" ? "/employer/overview" : "/login"} />;
  }

  return (
    <div className="flex min-h-screen min-w-[320px] flex-col overflow-x-hidden bg-[#f5f8f8] font-sans text-[#263a3c] antialiased">
      <Header />
      <main className="mx-auto flex w-full max-w-284 flex-1 flex-col px-6 py-8 max-[680px]:px-4 max-[680px]:py-5">
        <div className="mb-6">
          {isDemoPreview && (
            <p className="mb-4 rounded-lg border border-[#f1dfb8] bg-[#fff9eb] px-4 py-2.5 text-xs font-medium text-[#785c28]">
              Demo preview · Viewing Jamie Dela Cruz’s messages
            </p>
          )}
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#078b8d]">
            Your conversations
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#263a3c]">Messages</h1>
          <p className="mt-1 text-sm text-[#687b7e]">
            Reply to employers who have contacted you about an application.
          </p>
        </div>

        <section className="grid min-h-[min(680px,calc(100dvh-15rem))] flex-1 grid-cols-[minmax(260px,340px)_minmax(0,1fr)] overflow-hidden rounded-2xl border border-[#e5eeec] bg-white shadow-[0_8px_24px_rgba(34,66,65,0.06)] max-[760px]:grid-cols-1">
          <ApplicantMessagesSidebar
            actor={actor}
            conversationId={conversationId}
            conversationsError={conversationsError?.message ?? null}
            conversationsLoading={conversationsLoading}
            filteredConversations={filteredConversations}
            onChooseConversation={chooseConversation}
            onSearchChange={setSearch}
            search={search}
            unreadConversationIds={unreadConversationIds}
          />

          <ApplicantMessageThread
            actor={actor}
            announcement={announcement}
            conversation={selectedConversation}
            error={messagesError?.message ?? null}
            loading={messagesLoading}
            messageEndRef={messageEndRef}
            messageText={messageText}
            messages={messages}
            onBack={() => navigate("/messages")}
            onMessageTextChange={setMessageText}
            onSend={handleSend}
            sendError={sendError}
            sending={sending}
          />
        </section>
      </main>
      <Footer />
    </div>
  );
}
