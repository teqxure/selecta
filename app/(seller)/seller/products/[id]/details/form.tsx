"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { updateProductDetailsAction, generateProductDescriptionAction } from "./actions";
import type { ProductWizardActionState } from "../../new/actions";
import { CONDITION_GRADE_LABELS, GENDER_LABELS } from "@/lib/validators/product";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
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

  const formRef = useRef<HTMLFormElement>(null);
  const [description, setDescription] = useState(defaults.description);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();

  function handleGenerate() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    setAiError(null);
    startGenerating(async () => {
      const result = await generateProductDescriptionAction(productId, formData);
      if (result.error) setAiError(result.error);
      else setDescription(result.description ?? "");
    });
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <Input name="title" label="Title" defaultValue={defaults.title} placeholder="e.g. Blue denim jacket" required />
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="description" className="text-sm font-medium text-foreground">
                Description
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={handleGenerate} disabled={isGenerating} className="gap-1.5 text-xs">
                {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} /> : <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />}
                Generate with AI
              </Button>
            </div>
            <textarea
              id="description"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {aiError && <p className="text-sm text-red-600">{aiError}</p>}
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
