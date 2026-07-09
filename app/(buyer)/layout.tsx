import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

export default function BuyerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navbar />
      <div className="flex flex-1 flex-col pb-16 md:pb-0">
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <MobileBottomNav />
    </div>
  );
}
