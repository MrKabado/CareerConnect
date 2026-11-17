import Footer from "@/components/common/user/userFooter";
import Header from "@/components/common/user/userHeader";

export default function ApplicationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen min-w-[320px] flex-col overflow-x-hidden bg-[#f5f8f8] font-sans text-[#263a3c] antialiased">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
