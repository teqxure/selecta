import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { listCategoryTree } from "@/services/categories/category.service";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { toggleCategoryActiveAction, deleteCategoryAction } from "./actions";
import { CreateCategoryForm } from "./create-form";

export default async function AdminCategoriesPage() {
  await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const categories = await listCategoryTree();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Categories</h1>

      <CreateCategoryForm parentOptions={categories.map((c) => ({ id: c.id, name: c.name }))} />

      <div className="flex flex-col gap-3">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-secondary-foreground">{category.name}</p>
                  <span className="text-xs text-muted-foreground">/{category.slug}</span>
                  {!category.isActive && <Badge tone="neutral">Inactive</Badge>}
                </div>
                <div className="flex gap-1.5">
                  <form action={toggleCategoryActiveAction}>
                    <input type="hidden" name="categoryId" value={category.id} />
                    <input type="hidden" name="isActive" value={String(category.isActive)} />
                    <Button type="submit" size="sm" variant="ghost">
                      {category.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                  <form action={deleteCategoryAction}>
                    <input type="hidden" name="categoryId" value={category.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Delete
                    </Button>
                  </form>
                </div>
              </div>

              {category.children.length > 0 && (
                <div className="ml-4 flex flex-col gap-1.5 border-l border-border pl-4">
                  {category.children.map((child) => (
                    <div key={child.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-secondary-foreground">{child.name}</p>
                        <span className="text-xs text-muted-foreground">/{child.slug}</span>
                        {!child.isActive && <Badge tone="neutral">Inactive</Badge>}
                      </div>
                      <div className="flex gap-1.5">
                        <form action={toggleCategoryActiveAction}>
                          <input type="hidden" name="categoryId" value={child.id} />
                          <input type="hidden" name="isActive" value={String(child.isActive)} />
                          <Button type="submit" size="sm" variant="ghost">
                            {child.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </form>
                        <form action={deleteCategoryAction}>
                          <input type="hidden" name="categoryId" value={child.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
