import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { listAddresses } from "@/services/users/address.service";
import { ROUTES } from "@/lib/constants/routes";
import { ProfileForm } from "./profile-form";
import { AddressBook } from "./address-book";

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect(ROUTES.login);

  const addresses = await listAddresses(user.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12">
      <h1 className="text-2xl font-semibold text-foreground">Your profile</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-foreground">Personal information</h2>
        <ProfileForm
          defaultFirstName={user.firstName}
          defaultLastName={user.lastName}
          defaultPhone={user.phone ?? ""}
          defaultCity={user.city ?? ""}
          defaultState={user.state ?? ""}
          email={user.email}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-foreground">Saved addresses</h2>
        <AddressBook addresses={addresses} />
      </section>
    </div>
  );
}
