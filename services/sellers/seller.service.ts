import "server-only";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { Prisma } from "@/generated/prisma/client";
import { sanitizeOptionalText, sanitizeText } from "@/lib/security/sanitize";
import { createNotification } from "@/services/notifications/notification.service";
import { notify } from "@/services/notifications/notify.service";
import { alertAdmins } from "@/services/notifications/admin-alerts.service";
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

/**
 * Every mutation below takes the caller's `userId` and scopes the
 * `sellerProfile` write to `{ id, userId }` — matching the ownership-in-
 * the-query pattern used elsewhere (products, addresses) rather than
 * trusting that every call site only ever passes its own profile id.
 */
async function assertOwnsSellerProfile(tx: Prisma.TransactionClient, sellerProfileId: string, userId: string) {
  const profile = await tx.sellerProfile.findFirst({ where: { id: sellerProfileId, userId } });
  if (!profile) throw new NotFoundError("Seller profile");
  return profile;
}

/** Onboarding step 1: confirm personal info collected at signup. */
export async function completePersonalInfoStep(userId: string, sellerProfileId: string, input: PersonalInfoInput) {
  return db.$transaction(async (tx) => {
    await assertOwnsSellerProfile(tx, sellerProfileId, userId);

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

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "store"
  );
}

/** Appends -2, -3, ... until the slug is free — storeSlug is the storefront's URL, so it must be globally unique. */
async function generateUniqueStoreSlug(storeName: string, sellerProfileId: string) {
  const base = slugify(storeName);
  let slug = base;
  let suffix = 1;

  while (true) {
    const existing = await db.sellerProfile.findUnique({ where: { storeSlug: slug } });
    if (!existing || existing.id === sellerProfileId) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

/** Builds the `socialLinks` JSON from optional handle/URL fields, omitting blanks — `undefined` (not an empty object) when nothing was entered, so the column stays `null` rather than `{}`. */
function buildSocialLinks(input: { instagram?: string; tiktok?: string; facebook?: string }) {
  const entries = Object.entries({
    instagram: sanitizeOptionalText(input.instagram),
    tiktok: sanitizeOptionalText(input.tiktok),
    facebook: sanitizeOptionalText(input.facebook),
  }).filter(([, value]) => value !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/** Onboarding step 2: the store itself. */
export async function completeStoreSetupStep(userId: string, sellerProfileId: string, input: StoreSetupInput) {
  const storeName = sanitizeText(input.storeName);
  const storeSlug = await generateUniqueStoreSlug(storeName, sellerProfileId);
  const socialLinks = buildSocialLinks(input);

  const { count } = await db.sellerProfile.updateMany({
    where: { id: sellerProfileId, userId },
    data: {
      storeName,
      storeSlug,
      marketLocation: sanitizeText(input.marketLocation),
      city: sanitizeText(input.city),
      state: sanitizeText(input.state),
      categoryTags: input.categoryTags,
      ...(input.logoUrl && { logoUrl: input.logoUrl }),
      ...(input.bannerUrl && { bannerUrl: input.bannerUrl }),
      bio: sanitizeOptionalText(input.bio),
      ...(socialLinks && { socialLinks }),
      agreementAcceptedAt: new Date(),
      onboardingStep: 3,
    },
  });
  if (count === 0) throw new NotFoundError("Seller profile");

  return db.sellerProfile.findUniqueOrThrow({ where: { id: sellerProfileId } });
}

/** Onboarding step 3: verification documents — submission, not approval. */
export async function submitVerification(
  userId: string,
  sellerProfileId: string,
  input: VerificationSubmissionInput,
) {
  return db.$transaction(async (tx) => {
    await assertOwnsSellerProfile(tx, sellerProfileId, userId);

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
  }).then(async (profile) => {
    await alertAdmins(
      "New seller verification submitted",
      `${profile.businessName} submitted verification documents for review.`,
      { actionUrl: "/admin/verification-queue", metadata: { sellerProfileId } },
    );
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

export async function updateStoreSettings(userId: string, sellerProfileId: string, input: UpdateSellerSettingsInput) {
  const { count } = await db.sellerProfile.updateMany({
    where: { id: sellerProfileId, userId },
    data: {
      storeName: sanitizeText(input.storeName),
      bio: sanitizeOptionalText(input.bio),
      marketLocation: sanitizeText(input.marketLocation),
      city: sanitizeText(input.city),
      state: sanitizeText(input.state),
      ...(input.bannerUrl && { bannerUrl: input.bannerUrl }),
    },
  });
  if (count === 0) throw new NotFoundError("Seller profile");

  return db.sellerProfile.findUniqueOrThrow({ where: { id: sellerProfileId } });
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
  ipAddress?: string,
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
        ipAddress,
      },
    });

    return profile;
  }).then(async (profile) => {
    const storeName = profile.storeName ?? profile.businessName;
    await notify(
      status === "VERIFIED"
        ? {
            event: "SELLER_APPROVED",
            userId: profile.userId,
            title: "Your store is verified!",
            message: "Congratulations — your store has been verified. You can now list products on Selecta.",
            actionUrl: "/seller",
            emailVariables: { storeName },
          }
        : {
            event: "SELLER_REJECTED",
            userId: profile.userId,
            title: "Verification needs another look",
            message: `Your verification wasn't approved${notes ? `: ${notes}` : "."} Please resubmit your documents.`,
            actionUrl: "/seller/onboarding/verification",
            emailVariables: { storeName },
          },
    );
    return profile;
  });
}

export function approveVerification(sellerProfileId: string, reviewerId: string, notes?: string, ipAddress?: string) {
  return reviewVerification(sellerProfileId, reviewerId, "VERIFIED", notes, ipAddress);
}

export function rejectVerification(sellerProfileId: string, reviewerId: string, notes?: string, ipAddress?: string) {
  return reviewVerification(sellerProfileId, reviewerId, "REJECTED", notes, ipAddress);
}

export async function suspendSeller(sellerProfileId: string, adminId: string, notes?: string, ipAddress?: string) {
  return db.$transaction(async (tx) => {
    const profile = await tx.sellerProfile.update({
      where: { id: sellerProfileId },
      data: { verificationStatus: "SUSPENDED" },
    });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "SELLER_SUSPENDED",
        entityType: "SellerProfile",
        entityId: sellerProfileId,
        metadata: notes ? { notes } : undefined,
        ipAddress,
      },
    });
    await createNotification(
      profile.userId,
      "SYSTEM",
      "Your store has been suspended",
      notes ?? "Your store has been suspended by Selecta. Contact support for details.",
    );
    return profile;
  });
}

export async function reinstateSeller(sellerProfileId: string, adminId: string, ipAddress?: string) {
  return db.$transaction(async (tx) => {
    const profile = await tx.sellerProfile.update({
      where: { id: sellerProfileId },
      data: { verificationStatus: "VERIFIED" },
    });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "SELLER_REINSTATED", entityType: "SellerProfile", entityId: sellerProfileId, ipAddress },
    });
    await createNotification(profile.userId, "SYSTEM", "Your store has been reinstated", "You're back live on Selecta.");
    return profile;
  });
}

export async function assignAgent(sellerProfileId: string, agentUserId: string | null, adminId: string) {
  const profile = await db.sellerProfile.update({ where: { id: sellerProfileId }, data: { agentId: agentUserId } });
  await db.auditLog.create({
    data: {
      actorId: adminId,
      action: agentUserId ? "AGENT_ASSIGNED" : "AGENT_UNASSIGNED",
      entityType: "SellerProfile",
      entityId: sellerProfileId,
      metadata: agentUserId ? { agentUserId } : undefined,
    },
  });
  return profile;
}

export function listAgents() {
  return db.user.findMany({ where: { role: "AGENT" }, orderBy: { firstName: "asc" } });
}

// ---------------------------------------------------------------------------
// Public storefront
// ---------------------------------------------------------------------------

export async function getStoreBySlug(slug: string) {
  const profile = await db.sellerProfile.findUnique({
    where: { storeSlug: slug },
    include: {
      user: true,
      products: {
        where: { status: "ACTIVE" },
        include: { images: { orderBy: { position: "asc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!profile) throw new NotFoundError("Store");
  return profile;
}

export async function recordStoreView(sellerProfileId: string) {
  await db.sellerProfile.update({ where: { id: sellerProfileId }, data: { profileViewCount: { increment: 1 } } });
}

export function getStoreReviews(sellerProfileId: string) {
  return db.review.findMany({
    where: { product: { sellerId: sellerProfileId } },
    include: { author: true, product: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
