import { ADMIN_PERMISSIONS, ADMIN_PERMISSION_LABELS } from "@/lib/constants/permissions";

export function PermissionCheckboxes({ defaultChecked = [] }: { defaultChecked?: readonly string[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
      {ADMIN_PERMISSIONS.map((permission) => (
        <label key={permission} className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="permissions"
            value={permission}
            defaultChecked={defaultChecked.includes(permission)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-[color:var(--color-burnt-orange)]"
          />
          <span className="font-medium text-foreground">{ADMIN_PERMISSION_LABELS[permission]}</span>
        </label>
      ))}
    </div>
  );
}
