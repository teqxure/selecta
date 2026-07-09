import type { BoostGoal } from "@/generated/prisma/enums";

export const BOOST_GOAL_LABELS: Record<BoostGoal, string> = {
  VIEWS: "More views",
  SAVES: "More saves",
  SALES: "More sales",
};
