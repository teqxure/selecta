import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent } from "@/components/ui/Card";

export default async function SavedProductsPage() {
  const user = await currentUser();
  if (!user) redirect(ROUTES.login);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold text-foreground">Saved products</h1>
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Saving products for later is coming in a future phase.
        </CardContent>
      </Card>
    </div>
  );
}
