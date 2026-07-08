import "server-only";
import { cache } from "react";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

/**
 * Fetches the full current-user record (never `passwordHash`) for use in
 * Server Components — e.g. rendering a profile page or a navbar avatar.
 * Wrapped in React's `cache()` so multiple components calling this in the
 * same request tree share one DB query instead of one each.
 */
export const currentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;

  // A `sessionId` (present on every session created after session tracking
  // shipped) must point at a still-valid row — this is what makes "force
  // logout" / "terminate this session" actually take effect on the very
  // next request, not just at the JWT's natural expiry. Tokens issued
  // before session tracking existed have no `sessionId` and are treated
  // as unrevocable, same as before this check was added.
  if (session.sessionId) {
    const sessionRecord = await db.session.findUnique({
      where: { id: session.sessionId },
      select: { revokedAt: true },
    });
    if (!sessionRecord || sessionRecord.revokedAt) return null;
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { sellerProfile: true },
  });
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructure-omit is the idiom for "return everything but this field"
  const { passwordHash, ...safeUser } = user;
  return safeUser;
});
