"use client";

import { useActionState, useState } from "react";
import { updateProductDetailsAction } from "./actions";
import type { ProductWizardActionState } from "../../new/actions";
import { CONDITION_GRADE_LABELS, GENDER_LABELS } from "@/lib/validators/product";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";

interface CategoryOption {
  id: string;
  name: string;
  children: { id: string; name: string }[];
}

interface DetailsFormDefaults {
  title: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  brand: string;
  color: string;
  material: string;
  gender: string;
  size: string;
  conditionGrade: string;
}

const initialState: ProductWizardActionState = {};

export function DetailsForm({
  productId,
  categories,
  defaults,
  isDraft,
}: {
  productId: string;
  categories: CategoryOption[];
  defaults: DetailsFormDefaults;
  isDraft: boolean;
}) {
  const boundAction = updateProductDetailsAction.bind(null, productId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [categoryId, setCategoryId] = useState(defaults.categoryId);
  const subcategories = categories.find((category) => category.id === categoryId)?.children ?? [];

  return (
    <Card>
      <CardContent className="p-5">
        <form action={formAction} className="flex flex-col gap-4">
          <Input name="title" label="Title" defaultValue={defaults.title} placeholder="e.g. Blue denim jacket" required />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              defaultValue={defaults.description}
              rows={3}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="categoryId" className="text-sm font-medium text-foreground">
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={defaults.categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                required
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="" disabled>
                  Choose category
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="subcategoryId" className="text-sm font-medium text-foreground">
                Subcategory
              </label>
              <select
                id="subcategoryId"
                name="subcategoryId"
                defaultValue={defaults.subcategoryId}
                disabled={subcategories.length === 0}
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground disabled:opacity-50"
              >
                <option value="">None</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input name="brand" label="Brand (optional)" defaultValue={defaults.brand} />
            <Input name="color" label="Color (optional)" defaultValue={defaults.color} />
          </div>

          <Input
            name="material"
            label="Material (optional)"
            defaultValue={defaults.material}
            placeholder="e.g. Cotton, Leather, Ankara"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="gender" className="text-sm font-medium text-foreground">
                Gender (optional)
              </label>
              <select
                id="gender"
                name="gender"
                defaultValue={defaults.gender}
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="">Not specified</option>
                {Object.entries(GENDER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <Input name="size" label="Size (optional)" defaultValue={defaults.size} placeholder="e.g. M, 42, UK 8" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="conditionGrade" className="text-sm font-medium text-foreground">
              Condition
            </label>
            <select
              id="conditionGrade"
              name="conditionGrade"
              defaultValue={defaults.conditionGrade}
              required
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            >
              {Object.entries(CONDITION_GRADE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <FormError message={state.error} />
          <SubmitButton className="w-full">{isDraft ? "Continue" : "Save details"}</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
