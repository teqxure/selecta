import "server-only";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";

export function listCampaigns() {
  return db.marketingCampaign.findMany({
    include: { collection: true, coupon: true },
    orderBy: { createdAt: "desc" },
  });
}

export interface CampaignInput {
  name: string;
  slug: string;
  description?: string | null;
  bannerImageUrl?: string | null;
  collectionId?: string | null;
  couponId?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

export async function createCampaign(adminId: string, input: CampaignInput) {
  const existing = await db.marketingCampaign.findUnique({ where: { slug: input.slug } });
  if (existing) throw new ValidationError(`A campaign with slug "${input.slug}" already exists`);

  return db.$transaction(async (tx) => {
    const campaign = await tx.marketingCampaign.create({
      data: { ...input, collectionId: input.collectionId ?? null, couponId: input.couponId ?? null, createdById: adminId },
    });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "CAMPAIGN_CREATED", entityType: "MarketingCampaign", entityId: campaign.id, metadata: input as object },
    });
    return campaign;
  });
}

export async function setCampaignActive(adminId: string, id: string, isActive: boolean) {
  return db.$transaction(async (tx) => {
    const campaign = await tx.marketingCampaign.update({ where: { id }, data: { isActive } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: isActive ? "CAMPAIGN_ACTIVATED" : "CAMPAIGN_DEACTIVATED", entityType: "MarketingCampaign", entityId: id },
    });
    return campaign;
  });
}

/** Currently-running active campaigns — what the homepage/notification system points at. */
export function listLiveCampaigns() {
  const now = new Date();
  return db.marketingCampaign.findMany({
    where: {
      isActive: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    include: { collection: { include: { products: { include: { product: true } } } }, coupon: true },
    orderBy: { startsAt: "desc" },
  });
}
