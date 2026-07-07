import "server-only";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { sanitizeOptionalText, sanitizeText } from "@/lib/security/sanitize";
import { createNotification } from "@/services/notifications/notification.service";
import { PAGINATION } from "@/lib/constants/app";
import type { PersonalInfoInput, StoreSetupInput, VerificationSubmissionInput } from "@/lib/validators/onboarding";
import type { UpdateSellerSettingsInput } from "@/lib/validators/profile";
import type { PaginatedResult } from "@/types";

export async function getSellerProfileByUserId(userId: string) {
  const profile = await db.sellerProfile.findUnique({ where: { userId }, include: { verification: true } });
  if (!profile) throw new NotFoundError("Seller profile");
  return profile;
}

/** Non-throwing variant for call sites (layouts, nav) where "no profile" is a valid state, not an error. */
export function findSellerProfileByUserId(userId: string) {
  return db.sellerProfile.findUnique({ where: { userId }, include: { verification: true } });
}

/** Onboarding step 1: confirm personal info collected at signup. */
export async function completePersonalInfoStep(userId: string, sellerProfileId: string, input: PersonalInfoInput) {
  return db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { firstName: input.firstName, lastName: input.lastName, phone: input.phone },
    });

    return tx.sellerProfile.update({
      where: { id: sellerProfileId },
      data: { onboardingStep: { set: 2 } },
    });
  });
}

/** Onboarding step 2: the store itself. */
export function completeStoreSetupStep(sellerProfileId: string, input: StoreSetupInput) {
  return db.sellerProfile.update({
    where: { id: sellerProfileId },
    data: {
      storeName: sanitizeText(input.storeName),
      marketLocation: sanitizeText(input.marketLocation),
      city: sanitizeText(input.city),
      state: sanitizeText(input.state),
      categoryTags: input.categoryTags,
      onboardingStep: 3,
    },
  });
}

/** Onboarding step 3: verification documents — submission, not approval. */
export async function submitVerification(
  userId: string,
  sellerProfileId: string,
  input: VerificationSubmissionInput,
) {
  return db.$transaction(async (tx) => {
    await tx.sellerVerification.upsert({
      where: { sellerProfileId },
      create: {
        sellerProfileId,
        businessPhotoUrl: input.businessPhotoUrl,
        shopPhotoUrl: input.shopPhotoUrl,
        identityDocumentUrl: input.identityDocumentUrl,
        status: "PENDING",
      },
      update: {
        businessPhotoUrl: input.businessPhotoUrl,
        shopPhotoUrl: input.shopPhotoUrl,
        identityDocumentUrl: input.identityDocumentUrl,
        status: "PENDING",
        submittedAt: new Date(),
        reviewedAt: null,
        reviewNotes: null,
      },
    });

    const profile = await tx.sellerProfile.update({
      where: { id: sellerProfileId },
      data: { onboardingStep: 4, onboardingCompletedAt: new Date(), verificationStatus: "PENDING" },
    });

    await tx.notification.create({
      data: {
        userId,
        type: "SYSTEM",
        title: "Verification submitted",
        message: "We've received your store verification documents and will review them within 48 hours.",
      },
    });

    return profile;
  });
}

export async function getSellerDashboardStats(sellerProfileId: string, userId: string) {
  const [activeListings, wallet, distinctOrders] = await Promise.all([
    db.product.count({ where: { sellerId: sellerProfileId, status: "ACTIVE" } }),
    db.wallet.findUnique({ where: { userId } }),
    db.orderItem.findMany({
      where: { product: { sellerId: sellerProfileId } },
      select: { orderId: true },
      distinct: ["orderId"],
    }),
  ]);

  return {
    activeListings,
    walletBalance: wallet?.balance ?? 0,
    totalOrders: distinctOrders.length,
  };
}

export function updateStoreSettings(sellerProfileId: string, input: UpdateSellerSettingsInput) {
  return db.sellerProfile.update({
    where: { id: sellerProfileId },
    data: {
      storeName: sanitizeText(input.storeName),
      bio: sanitizeOptionalText(input.bio),
      marketLocation: sanitizeText(input.marketLocation),
      city: sanitizeText(input.city),
      state: sanitizeText(input.state),
    },
  });
}

function findSellersWithUser(page: number, pageSize: number) {
  return db.sellerProfile.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
}

type SellerProfileWithUser = Awaited<ReturnType<typeof findSellersWithUser>>[number];

export async function listSellers(
  page = 1,
  pageSize = PAGINATION.defaultPageSize,
): Promise<PaginatedResult<SellerProfileWithUser>> {
  const [items, totalCount] = await Promise.all([
    findSellersWithUser(page, pageSize),
    db.sellerProfile.count(),
  ]);

  return { items, page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) };
}

export function listPendingVerifications() {
  return db.sellerVerification.findMany({
    where: { status: "PENDING" },
    include: { sellerProfile: { include: { user: true } } },
    orderBy: { submittedAt: "asc" },
  });
}

async function reviewVerification(
  sellerProfileId: string,
  reviewerId: string,
  status: "VERIFIED" | "REJECTED",
  notes: string | undefined,
) {
  return db.$transaction(async (tx) => {
    const verification = await tx.sellerVerification.findUnique({ where: { sellerProfileId } });
    if (!verification) throw new NotFoundError("Seller verification");
    if (verification.status !== "PENDING") {
      throw new ValidationError("This verification has already been reviewed");
    }

    await tx.sellerVerification.update({
      where: { sellerProfileId },
      data: { status, reviewedById: reviewerId, reviewedAt: new Date(), reviewNotes: sanitizeOptionalText(notes) },
    });

    const profile = await tx.sellerProfile.update({
      where: { id: sellerProfileId },
      data: { verificationStatus: status },
    });

    await tx.auditLog.create({
      data: {
        actorId: reviewerId,
        action: status === "VERIFIED" ? "SELLER_VERIFIED" : "SELLER_VERIFICATION_REJECTED",
        entityType: "SellerProfile",
        entityId: sellerProfileId,
        metadata: notes ? { notes } : undefined,
      },
    });

    return profile;
  }).then(async (profile) => {
    await createNotification(
      profile.userId,
      "SYSTEM",
      status === "VERIFIED" ? "Your store is verified!" : "Verification needs another look",
      status === "VERIFIED"
        ? "Congratulations — your store has been verified. You can now list products on Selecta."
        : `Your verification wasn't approved${notes ? `: ${notes}` : "."} Please resubmit your documents.`,
    );
    return profile;
  });
}

export function approveVerification(sellerProfileId: string, reviewerId: string, notes?: string) {
  return reviewVerification(sellerProfileId, reviewerId, "VERIFIED", notes);
}

export function rejectVerification(sellerProfileId: string, reviewerId: string, notes?: string) {
  return reviewVerification(sellerProfileId, reviewerId, "REJECTED", notes);
}
