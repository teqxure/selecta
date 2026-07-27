import { requirePermission } from "@/lib/auth/rbac";
import { listReviewsForModeration } from "@/services/products/review.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Star } from "lucide-react";
import { setReviewHiddenAction } from "./actions";

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePermission("content.manage");
  const { q } = await searchParams;
  const reviews = await listReviewsForModeration(q?.trim() || undefined);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Reviews" }]}
        title="Review moderation"
        description="Hide a review to remove it from public product pages without deleting the record."
      />

      <Card>
        <CardContent className="p-4">
          <form action={ROUTES.admin.reviews} className="flex items-end gap-3">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by product title"
              className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            />
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {reviews.length === 0 && <EmptyState icon={Star} title="No reviews found" description="Try a different search." />}
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{review.product.title}</span>
                  <Badge tone="accent">{review.rating}★</Badge>
                  {review.isHidden && <Badge tone="neutral">Hidden</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {review.author.firstName} {review.author.lastName} ·{" "}
                  {review.createdAt.toLocaleDateString("en-NG", { dateStyle: "medium" })}
                </p>
                {review.comment && <p className="mt-1 text-sm text-foreground">{review.comment}</p>}
              </div>
              <form action={setReviewHiddenAction}>
                <input type="hidden" name="reviewId" value={review.id} />
                <input type="hidden" name="isHidden" value={String(!review.isHidden)} />
                <Button type="submit" size="sm" variant={review.isHidden ? "secondary" : "outline"}>
                  {review.isHidden ? "Unhide" : "Hide"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
