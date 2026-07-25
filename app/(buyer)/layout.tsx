import type { ReactNode } from "react";
import { currentUser } from "@/lib/auth/current-user";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { LocationPermissionPrompt } from "@/components/buyer/LocationPermissionPrompt";

export default async function BuyerLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navbar />
      <div className="flex flex-1 flex-col pb-16 md:pb-0">
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <MobileBottomNav />
      {user?.locationPermission === "NOT_ASKED" && <LocationPermissionPrompt />}
    </div>
  );
}
