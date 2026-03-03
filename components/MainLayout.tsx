import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <div className="md:hidden">
        <Navbar />
      </div>
      <Sidebar />
      <main className="flex-1 md:ml-64 container max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
