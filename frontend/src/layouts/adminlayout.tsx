import { Outlet } from "react-router";
import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import { useVerifications } from "@/components/hooks/useVerification";

export default function AdminLayout() {
  const verificationContext = useVerifications();

  return (
    <div className="flex min-h-screen min-w-[320px] flex-col overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(8,139,141,.045),transparent_28rem)] font-sans text-ink antialiased selection:bg-brand-100">
      <Header />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-8 py-8 max-[760px]:px-4 max-[760px]:py-6">
        <Outlet context={verificationContext} />
      </main>
      <Footer />
    </div>
  );
}