"use client";

import { useActionState } from "react";
import { createCategoryAction, type CategoryActionState } from "./actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";

const initialState: CategoryActionState = {};

export function CreateCategoryForm({ parentOptions }: { parentOptions: { id: string; name: string }[] }) {
  const [state, formAction] = useActionState(createCategoryAction, initialState);

  return (
    <Card>
      <CardContent className="p-4">
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <Input name="name" label="Name" placeholder="Dresses" required />
          <Input name="slug" label="Slug" placeholder="dresses" required />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="parentId" className="text-sm font-medium text-foreground">
              Parent (optional)
            </label>
            <select
              id="parentId"
              name="parentId"
              defaultValue=""
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="">None — main category</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton size="md">Add category</SubmitButton>
        </form>
        <FormError message={state.error} />
      </CardContent>
    </Card>
  );
}
