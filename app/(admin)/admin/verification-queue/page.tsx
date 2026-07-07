import Image from "next/image";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { listPendingVerifications } from "@/services/sellers/seller.service";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { approveVerificationAction, rejectVerificationAction } from "./actions";

export default async function AdminVerificationQueuePage() {
  await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const pending = await listPendingVerifications();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Verification queue ({pending.length})</h1>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No pending verifications right now.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {pending.map((verification) => (
            <Card key={verification.id}>
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-secondary-foreground">
                      {verification.sellerProfile.storeName ?? verification.sellerProfile.businessName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {verification.sellerProfile.user.firstName} {verification.sellerProfile.user.lastName} ·{" "}
                      {verification.sellerProfile.user.email}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Submitted {verification.submittedAt.toLocaleDateString()}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Business photo", url: verification.businessPhotoUrl },
                    { label: "Shop photo", url: verification.shopPhotoUrl },
                    { label: "Identity document", url: verification.identityDocumentUrl },
                  ].map((doc) => (
                    <div key={doc.label} className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">{doc.label}</span>
                      {doc.url ? (
                        <Image
                          src={doc.url}
                          alt={doc.label}
                          width={160}
                          height={160}
                          className="h-28 w-full rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-28 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                          Not provided
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <form action={approveVerificationAction}>
                    <input type="hidden" name="sellerProfileId" value={verification.sellerProfileId} />
                    <Button type="submit" variant="accent" size="sm">
                      Approve
                    </Button>
                  </form>
                  <form action={rejectVerificationAction} className="flex items-center gap-2">
                    <input type="hidden" name="sellerProfileId" value={verification.sellerProfileId} />
                    <input
                      type="text"
                      name="notes"
                      placeholder="Reason (optional)"
                      className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
                    />
                    <Button type="submit" variant="outline" size="sm">
                      Reject
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
