import type { Recipe } from "@/lib/shopping-list";

export type AppRecipe = Recipe & {
  instructions?: string;
  photoUrl?: string | null;
  sourceUrl?: string | null;
};
