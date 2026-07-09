import type { DisputeType } from "@/generated/prisma/enums";

/** Human-readable labels — never show the raw DB enum value in UI, notifications, or admin alerts. */
export const DISPUTE_TYPE_LABELS: Record<DisputeType, string> = {
  NOT_RECEIVED: "Item never received",
  WRONG_ITEM: "Wrong item received",
  DAMAGED_ITEM: "Item arrived damaged",
  OTHER: "Something else",
};
