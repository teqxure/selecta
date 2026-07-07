import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { getOwnedProductWithDetails } from "@/services/products/product.service";
import { isAppError } from "@/lib/errors";
import { StepNav } from "./step-nav";

export default async function EditProductLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);

  let product;
  try {
    product = await getOwnedProductWithDetails(profile.id, id);
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 py-4">
      <StepNav productId={id} isDraft={product.status === "DRAFT"} />
      {children}
    </div>
  );
}
