import { Outlet } from "react-router";
import Footer from "@/components/common/footer";
import Header from "@/components/common/header";

export default function GuestLayout() {
  return (
    <div className="flex min-h-screen min-w-[320px] flex-col overflow-x-hidden bg-[#f5f8f8] font-sans text-[#263a3c] antialiased">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}