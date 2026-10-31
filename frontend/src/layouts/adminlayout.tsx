import { Outlet } from "react-router";
import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import { useVerifications } from "@/components/hooks/useVerification";

export default function AdminLayout() {
  const verificationContext = useVerifications();

  return (
    <div className="flex min-h-screen min-w-[320px] flex-col overflow-x-hidden bg-[#f5f8f8] font-sans text-[#263a3c] antialiased">
      <Header />
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-[32px] py-[34px] max-[760px]:px-4 max-[760px]:py-5">
        <Outlet context={verificationContext} />
      </main>
      <Footer />
    </div>
  );
}