import Image from "next/image";
import { redirect } from "next/navigation";
import { ShoppingBag, ShieldCheck } from "lucide-react";
import { currentUser } from "@/lib/auth/current-user";
import { listCartItems } from "@/services/products/cart.service";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { removeFromCartAction } from "@/app/(buyer)/actions";
import { CheckoutButton } from "./checkout-button";

export default async function CartPage() {
  const user = await currentUser();
  if (!user) redirect(ROUTES.login);

  const items = await listCartItems(user.id);
  const total = items.reduce((sum, item) => sum + Number(item.product.discountPrice ?? item.product.price) * item.quantity, 0);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <h1 className="font-display text-2xl font-semibold text-foreground">Your cart</h1>

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is feeling light."
          description="Add a fit you love and it'll show up here, ready for checkout."
          action={{ label: "Browse finds", href: ROUTES.search }}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.product.images[0] && (
                      <Image src={item.product.images[0].url} alt={item.product.title} fill className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-secondary-foreground">{item.product.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Intl.NumberFormat("en-NG", { style: "currency", currency: item.product.currency }).format(
                        Number(item.product.discountPrice ?? item.product.price),
                      )}
                    </p>
                  </div>
                  <form action={removeFromCartAction.bind(null, item.productId)}>
                    <Button type="submit" size="sm" variant="ghost" className="min-h-10">
                      Remove
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <p className="font-medium text-secondary-foreground">Total</p>
              <p className="text-lg font-semibold text-accent">
                {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(total)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="flex flex-col gap-1.5 p-4 text-sm">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-accent" strokeWidth={2} />
                Your payment is protected when you buy through Selecta.
              </p>
              <p className="text-xs text-muted-foreground">
                Funds are held in escrow until you confirm delivery, every purchase is eligible for dispute resolution, and refund
                support is built in — none of that applies to payments made outside Selecta.
              </p>
            </CardContent>
          </Card>

          {/* Sticky on mobile (sits just above MobileBottomNav) so "Place order" is always reachable without scrolling past every cart item; back to normal in-flow placement from sm: up. */}
          <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 p-3 backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <div className="mx-auto max-w-2xl">
              <CheckoutButton />
            </div>
          </div>
          <div className="h-20 sm:hidden" aria-hidden />
        </>
      )}
    </div>
  );
}
