import Image from "next/image";
import { redirect } from "next/navigation";
import { ShoppingBag, ShieldCheck } from "lucide-react";
import { currentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { listCartItems } from "@/services/products/cart.service";
import { listAddresses } from "@/services/users/address.service";
import { calculateDeliveryQuote, resolveBuyerCoordinates } from "@/services/logistics/delivery-engine.service";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { removeFromCartAction } from "@/app/(buyer)/actions";
import { CartCheckoutPanel, type SellerGroup } from "@/components/buyer/CartCheckoutPanel";

export default async function CartPage() {
  const user = await currentUser();
  if (!user) redirect(ROUTES.login);

  const [items, addresses, buyerUser] = await Promise.all([
    listCartItems(user.id),
    listAddresses(user.id),
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { latitude: true, longitude: true } }),
  ]);
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  const buyerCoords = resolveBuyerCoordinates(defaultAddress, buyerUser);

  const sellerIds = [...new Set(items.map((item) => item.product.sellerId))];
  const sellerGroups: SellerGroup[] = await Promise.all(
    sellerIds.map(async (sellerId) => {
      const sellerItems = items.filter((item) => item.product.sellerId === sellerId);
      const seller = sellerItems[0].product.seller;
      const subtotal = sellerItems.reduce(
        (sum, item) => sum + Number(item.product.discountPrice ?? item.product.price) * item.quantity,
        0,
      );

      let quote: SellerGroup["quote"] = null;
      let quoteError: string | null = null;
      if (defaultAddress) {
        try {
          quote = await calculateDeliveryQuote({
            sellerCoords: seller.latitude != null && seller.longitude != null ? { latitude: seller.latitude, longitude: seller.longitude } : null,
            buyerCoords,
            sellerCity: seller.city,
            buyerCity: defaultAddress.city,
          });
        } catch (error) {
          quoteError = error instanceof Error ? error.message : "Delivery pricing is unavailable for this seller right now";
        }
      }

      return {
        sellerId,
        sellerName: seller.storeName ?? seller.businessName,
        itemTitles: sellerItems.map((item) => item.product.title),
        subtotal,
        offersPickup: seller.offersPickup,
        quote,
        quoteError,
      };
    }),
  );

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

          <CartCheckoutPanel
            addresses={addresses.map((a) => ({ id: a.id, label: a.label, line1: a.line1, city: a.city, state: a.state, isDefault: a.isDefault }))}
            sellerGroups={sellerGroups}
          />
        </>
      )}
    </div>
  );
}
