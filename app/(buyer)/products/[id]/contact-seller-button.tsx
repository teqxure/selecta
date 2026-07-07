"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { revealSellerContactAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";

export function ContactSellerButton({ productId, isLoggedIn }: { productId: string; isLoggedIn: boolean }) {
  const [contact, setContact] = useState<{ phone: string | null; storeName: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <Link href={`${ROUTES.login}?next=/products/${productId}`}>
        <Button variant="secondary" className="w-full">
          Log in to contact seller
        </Button>
      </Link>
    );
  }

  if (contact) {
    return (
      <div className="rounded-lg border border-border bg-secondary p-3 text-sm">
        <p className="font-medium text-secondary-foreground">{contact.storeName}</p>
        {contact.phone ? (
          <a href={`https://wa.me/${contact.phone.replace(/\D/g, "")}`} className="text-accent" target="_blank" rel="noopener noreferrer">
            Message on WhatsApp: {contact.phone}
          </a>
        ) : (
          <p className="text-muted-foreground">No phone number on file</p>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="secondary"
      className="w-full"
      disabled={isPending}
      onClick={() => startTransition(async () => setContact(await revealSellerContactAction(productId)))}
    >
      {isPending ? "Loading…" : "Contact seller"}
    </Button>
  );
}
