import "server-only";
import { db } from "@/lib/db";

export async function followStore(userId: string, sellerProfileId: string) {
  const existing = await db.storeFollow.findUnique({ where: { userId_sellerProfileId: { userId, sellerProfileId } } });
  if (existing) return existing;

  const [follow] = await db.$transaction([
    db.storeFollow.create({ data: { userId, sellerProfileId } }),
    db.sellerProfile.update({ where: { id: sellerProfileId }, data: { followerCount: { increment: 1 } } }),
  ]);
  return follow;
}

export async function unfollowStore(userId: string, sellerProfileId: string) {
  const { count } = await db.storeFollow.deleteMany({ where: { userId, sellerProfileId } });
  if (count === 0) return;

  await db.sellerProfile.update({ where: { id: sellerProfileId }, data: { followerCount: { decrement: 1 } } });
}

export async function isStoreFollowed(userId: string, sellerProfileId: string) {
  const follow = await db.storeFollow.findUnique({ where: { userId_sellerProfileId: { userId, sellerProfileId } } });
  return follow !== null;
}

export function listFollowedStores(userId: string) {
  return db.storeFollow.findMany({
    where: { userId },
    include: { sellerProfile: true },
    orderBy: { createdAt: "desc" },
  });
}
