import Image from "next/image";
import { notFound } from "next/navigation";
import { Star, MapPin, BadgeCheck, Users } from "lucide-react";
import { currentUser } from "@/lib/auth/current-user";
import { getStoreBySlug, getStoreReviews, recordStoreView } from "@/services/sellers/seller.service";
import { isStoreFollowed } from "@/services/sellers/store-follow.service";
import { isAppError } from "@/lib/errors";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { FollowStoreButton } from "@/components/marketplace/FollowStoreButton";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { startConversationAction } from "./actions";

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await currentUser();

  let store;
  try {
    store = await getStoreBySlug(slug);
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }

  const [reviews, following] = await Promise.all([
    getStoreReviews(store.id),
    user ? isStoreFollowed(user.id, store.id) : Promise.resolve(false),
    recordStoreView(store.id),
  ]);

  const storeName = store.storeName ?? store.businessName;
  const products = store.products.map((product) => ({
    ...product,
    seller: { storeName: store.storeName, businessName: store.businessName, ratingAverage: store.ratingAverage },
  }));

  return (
    <div className="flex flex-col">
      <div className="relative h-48 w-full bg-primary sm:h-64">
        {store.bannerUrl && <Image src={store.bannerUrl} alt="" fill className="object-cover" />}
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6">
        <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-background bg-accent font-display text-3xl font-semibold text-accent-foreground shadow-[var(--shadow-card)]">
              {storeName.charAt(0).toUpperCase()}
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display text-2xl font-semibold text-foreground">{storeName}</h1>
                {store.verificationStatus === "VERIFIED" && (
                  <BadgeCheck className="h-5 w-5 text-accent" strokeWidth={2} />
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {store.ratingCount > 0 ? (
                  <span className="flex items-center gap-1 text-gold">
                    <Star className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
                    {store.ratingAverage.toFixed(1)} ({store.ratingCount})
                  </span>
                ) : (
                  <span>New seller</span>
                )}
                {store.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                    {store.city}, {store.state}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" strokeWidth={2} />
                  {store.followerCount} followers
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pb-1">
            <FollowStoreButton sellerProfileId={store.id} initialFollowing={following} />
            <form action={startConversationAction.bind(null, store.id)}>
              <button
                type="submit"
                className="h-11 rounded-full border border-border px-6 text-sm font-medium text-foreground hover:bg-muted"
              >
                Message seller
              </button>
            </form>
          </div>
        </div>

        {store.bio && <p className="max-w-2xl text-sm text-foreground">{store.bio}</p>}

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-foreground">Products ({products.length})</h2>
          <ProductGrid
            products={products}
            emptyTitle="No listings yet."
            emptyDescription="This store hasn't published any products yet — check back soon."
          />
        </section>

        {reviews.length > 0 && (
          <section className="flex flex-col gap-4 pb-16">
            <h2 className="font-display text-xl font-semibold text-foreground">Reviews</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-secondary-foreground">
                        {review.author.firstName} {review.author.lastName}
                      </p>
                      <Badge tone={STATUS_TONE.ACTIVE}>★ {review.rating}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">on {review.product.title}</p>
                    {review.comment && <p className="text-sm text-foreground">{review.comment}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
